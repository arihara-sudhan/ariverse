import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { del, list, put } from '@vercel/blob';

loadEnv({ path: path.join(process.cwd(), '.env') });

const token = process.env.BLOB_READ_WRITE_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is required');
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = neon(databaseUrl);
const shouldDeleteOld = process.argv.includes('--delete-old');
const isDryRun = process.argv.includes('--dry-run');

function normalizePathStepOne(rawPath) {
  let p = String(rawPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  p = p.replace(/\/uploads\/uploads\//g, '/uploads/');
  if (p.startsWith('assets/mini-projects/')) {
    p = p.replace(/^assets\/mini-projects\//, 'mini-projects/');
  }
  return p;
}

function dirnamePosix(p) {
  const idx = p.lastIndexOf('/');
  return idx === -1 ? '' : p.slice(0, idx);
}

function basenamePosix(p) {
  const idx = p.lastIndexOf('/');
  return idx === -1 ? p : p.slice(idx + 1);
}

function buildUploadsFileOnlyDirs(paths) {
  const dirHasSubdir = new Set();
  const dirHasFiles = new Set();
  const allDirs = new Set();

  for (const p of paths) {
    const parts = p.split('/');
    for (let i = 0; i < parts.length - 1; i += 1) {
      allDirs.add(parts.slice(0, i + 1).join('/'));
    }
    const fileDir = dirnamePosix(p);
    if (fileDir) dirHasFiles.add(fileDir);
    for (let i = 0; i < parts.length - 2; i += 1) {
      const parent = parts.slice(0, i + 1).join('/');
      const childDir = parts.slice(0, i + 2).join('/');
      if (parent && childDir) dirHasSubdir.add(parent);
    }
  }

  const flattenDirs = new Set();
  for (const d of allDirs) {
    if (!d.endsWith('/uploads')) continue;
    if (dirHasFiles.has(d) && !dirHasSubdir.has(d)) {
      flattenDirs.add(d);
    }
  }
  return flattenDirs;
}

function applyFinalPathRules(stepOnePath, flattenDirs) {
  const dir = dirnamePosix(stepOnePath);
  if (flattenDirs.has(dir)) {
    const parent = dirnamePosix(dir);
    return parent ? `${parent}/${basenamePosix(stepOnePath)}` : basenamePosix(stepOnePath);
  }
  return stepOnePath;
}

function tryTransformBlobUrl(url, finalPathByOldPath, finalUrlByPath) {
  try {
    const parsed = new URL(url);
    const oldPath = parsed.pathname.replace(/^\/+/, '');
    const finalPath = finalPathByOldPath.get(oldPath);
    if (!finalPath || finalPath === oldPath) return url;
    return finalUrlByPath.get(finalPath) || url;
  } catch (_error) {
    return url;
  }
}

function transformImageUrlsJson(raw, finalPathByOldPath, finalUrlByPath) {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return raw;
    const next = parsed.map((item) => tryTransformBlobUrl(String(item || ''), finalPathByOldPath, finalUrlByPath));
    return JSON.stringify(next);
  } catch (_error) {
    return raw;
  }
}

async function updateTableUrlColumn(table, idCol, id, col, value) {
  await sql.unsafe(`UPDATE ${table} SET ${col} = $1 WHERE ${idCol} = $2`, [value, id]);
}

async function main() {
  let cursor;
  const blobs = [];
  while (true) {
    const result = await list({ token, cursor, limit: 1000 });
    blobs.push(...(result.blobs || []));
    if (!result.hasMore || !result.cursor) break;
    cursor = result.cursor;
  }
  console.log(`Loaded ${blobs.length} blob objects.`);

  const stepOnePaths = blobs.map((b) => normalizePathStepOne(b.pathname));
  const flattenDirs = buildUploadsFileOnlyDirs(stepOnePaths);

  const finalPathByOldPath = new Map();
  const oldBlobByPath = new Map();
  for (const blob of blobs) {
    const oldPath = String(blob.pathname || '').replace(/^\/+/, '');
    const stepOne = normalizePathStepOne(oldPath);
    const finalPath = applyFinalPathRules(stepOne, flattenDirs);
    finalPathByOldPath.set(oldPath, finalPath);
    oldBlobByPath.set(oldPath, blob);
  }

  const blobsToMove = [];
  for (const [oldPath, finalPath] of finalPathByOldPath.entries()) {
    if (oldPath !== finalPath) {
      blobsToMove.push({ oldPath, finalPath, blob: oldBlobByPath.get(oldPath) });
    }
  }
  console.log(`Blob moves needed: ${blobsToMove.length}`);

  const finalUrlByPath = new Map();
  for (const blob of blobs) {
    const oldPath = String(blob.pathname || '').replace(/^\/+/, '');
    const finalPath = finalPathByOldPath.get(oldPath) || oldPath;
    if (oldPath === finalPath) {
      finalUrlByPath.set(finalPath, blob.url);
    }
  }

  if (!isDryRun) {
    for (const item of blobsToMove) {
      const res = await fetch(item.blob.url);
      if (!res.ok) {
        throw new Error(`Failed reading ${item.blob.url}: ${res.status}`);
      }
      const body = Buffer.from(await res.arrayBuffer());
      const newBlob = await put(item.finalPath, body, {
        token,
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      finalUrlByPath.set(item.finalPath, newBlob.url);
      console.log(`Moved blob: ${item.oldPath} -> ${item.finalPath}`);
    }
  }

  for (const item of blobsToMove) {
    if (!finalUrlByPath.has(item.finalPath)) {
      finalUrlByPath.set(item.finalPath, item.blob.url);
    }
  }

  const updates = [];

  const profileRows = await sql`SELECT id, href FROM profile_links`;
  for (const row of profileRows) {
    const next = tryTransformBlobUrl(String(row.href || ''), finalPathByOldPath, finalUrlByPath);
    if (next !== row.href) updates.push(updateTableUrlColumn('profile_links', 'id', row.id, 'href', next));
  }

  const heroRows = await sql`SELECT id, image_url FROM section_heroes`;
  for (const row of heroRows) {
    const next = tryTransformBlobUrl(String(row.image_url || ''), finalPathByOldPath, finalUrlByPath);
    if (next !== row.image_url) updates.push(updateTableUrlColumn('section_heroes', 'id', row.id, 'image_url', next));
  }

  const kavRows = await sql`SELECT id, image_url FROM ariyin_kavithaigal`;
  for (const row of kavRows) {
    const next = tryTransformBlobUrl(String(row.image_url || ''), finalPathByOldPath, finalUrlByPath);
    if (next !== row.image_url) updates.push(updateTableUrlColumn('ariyin_kavithaigal', 'id', row.id, 'image_url', next));
  }

  const clayRows = await sql`SELECT id, image_url, image_urls FROM clay_play_entries`;
  for (const row of clayRows) {
    const nextImage = tryTransformBlobUrl(String(row.image_url || ''), finalPathByOldPath, finalUrlByPath);
    const nextUrls = transformImageUrlsJson(String(row.image_urls || '[]'), finalPathByOldPath, finalUrlByPath);
    if (nextImage !== row.image_url) updates.push(updateTableUrlColumn('clay_play_entries', 'id', row.id, 'image_url', nextImage));
    if (nextUrls !== row.image_urls) updates.push(updateTableUrlColumn('clay_play_entries', 'id', row.id, 'image_urls', nextUrls));
  }

  const guestRows = await sql`SELECT id, image_url, image_urls FROM guest_lectures_entries`;
  for (const row of guestRows) {
    const nextImage = tryTransformBlobUrl(String(row.image_url || ''), finalPathByOldPath, finalUrlByPath);
    const nextUrls = transformImageUrlsJson(String(row.image_urls || '[]'), finalPathByOldPath, finalUrlByPath);
    if (nextImage !== row.image_url) updates.push(updateTableUrlColumn('guest_lectures_entries', 'id', row.id, 'image_url', nextImage));
    if (nextUrls !== row.image_urls) updates.push(updateTableUrlColumn('guest_lectures_entries', 'id', row.id, 'image_urls', nextUrls));
  }

  const booksRows = await sql`SELECT id, image_url FROM books_read_entries`;
  for (const row of booksRows) {
    const next = tryTransformBlobUrl(String(row.image_url || ''), finalPathByOldPath, finalUrlByPath);
    if (next !== row.image_url) updates.push(updateTableUrlColumn('books_read_entries', 'id', row.id, 'image_url', next));
  }

  if (!isDryRun && updates.length > 0) {
    for (const updatePromise of updates) {
      await updatePromise;
    }
  }
  console.log(`DB field updates needed: ${updates.length}`);

  if (!isDryRun && shouldDeleteOld && blobsToMove.length > 0) {
    const oldUrls = blobsToMove.map((item) => item.blob.url);
    await del(oldUrls, { token });
    console.log(`Deleted old blobs: ${oldUrls.length}`);
  }

  console.log(`Done. dryRun=${isDryRun} deleteOld=${shouldDeleteOld}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

