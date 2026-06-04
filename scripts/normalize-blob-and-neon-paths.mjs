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

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function getBaseName(pathname) {
  const clean = toPosixPath(pathname);
  const idx = clean.lastIndexOf('/');
  return idx === -1 ? clean : clean.slice(idx + 1);
}

function canonicalizeBlobPath(rawPath) {
  const p = toPosixPath(rawPath);
  if (!p) return '';
  const lower = p.toLowerCase();
  const base = getBaseName(p);
  const looksLikeLogo = lower.includes('company-logo') || base.toLowerCase().includes('logo');

  if (lower.startsWith('career/uploads/uploads/')) {
    return looksLikeLogo
      ? `careers/company-logos/${base}`
      : `careers/company-photos/${base}`;
  }
  if (lower.startsWith('projects/company-logos/')) {
    return `careers/company-logos/${base}`;
  }
  if (lower.startsWith('projects/uploads/uploads/hero/')) {
    return 'projects/hero.webp';
  }
  if (lower.startsWith('projects/uploads/uploads/')) {
    return `projects/company-photos/${base}`;
  }
  if (lower.startsWith('mini-projects/uploads/uploads/hero/')) {
    return 'mini-projects/hero.webp';
  }
  if (lower.startsWith('mini-projects/uploads/uploads/')) {
    return `mini-projects/${base}`;
  }
  if (lower.startsWith('experiments/uploads/uploads/hero/')) {
    return 'experiments/hero.webp';
  }
  if (lower.startsWith('experiments/uploads/uploads/')) {
    return `experiments/${base}`;
  }
  if (lower.startsWith('skillset/uploads/uploads/hero/')) {
    return 'skillset/hero.webp';
  }
  if (lower.startsWith('career/')) {
    return p.replace(/^career\//, 'careers/');
  }
  return p;
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

  const finalPathByOldPath = new Map();
  const oldBlobByPath = new Map();
  for (const blob of blobs) {
    const oldPath = String(blob.pathname || '').replace(/^\/+/, '');
    const finalPath = canonicalizeBlobPath(oldPath);
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

  const projectRows = await sql`SELECT id, logo_url FROM projects_entries`;
  for (const row of projectRows) {
    const next = tryTransformBlobUrl(String(row.logo_url || ''), finalPathByOldPath, finalUrlByPath);
    if (next !== row.logo_url) updates.push(updateTableUrlColumn('projects_entries', 'id', row.id, 'logo_url', next));
  }

  const miniRows = await sql`SELECT id, logo_url FROM mini_projects_entries`;
  for (const row of miniRows) {
    const next = tryTransformBlobUrl(String(row.logo_url || ''), finalPathByOldPath, finalUrlByPath);
    if (next !== row.logo_url) updates.push(updateTableUrlColumn('mini_projects_entries', 'id', row.id, 'logo_url', next));
  }

  const experimentRows = await sql`SELECT id, image_url FROM experiments_entries`;
  for (const row of experimentRows) {
    const next = tryTransformBlobUrl(String(row.image_url || ''), finalPathByOldPath, finalUrlByPath);
    if (next !== row.image_url) updates.push(updateTableUrlColumn('experiments_entries', 'id', row.id, 'image_url', next));
  }

  const careerRows = await sql`SELECT id, image_url, company_logo_url FROM career_entries`;
  for (const row of careerRows) {
    const nextImage = tryTransformBlobUrl(String(row.image_url || ''), finalPathByOldPath, finalUrlByPath);
    const nextLogo = tryTransformBlobUrl(String(row.company_logo_url || ''), finalPathByOldPath, finalUrlByPath);
    if (nextImage !== row.image_url) updates.push(updateTableUrlColumn('career_entries', 'id', row.id, 'image_url', nextImage));
    if (nextLogo !== row.company_logo_url) updates.push(updateTableUrlColumn('career_entries', 'id', row.id, 'company_logo_url', nextLogo));
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
