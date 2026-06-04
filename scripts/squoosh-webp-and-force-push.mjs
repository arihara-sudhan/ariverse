import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { del, list, put } from '@vercel/blob';
import sharp from 'sharp';

loadEnv({ path: path.join(process.cwd(), '.env') });

const token = process.env.BLOB_READ_WRITE_TOKEN;
const databaseUrl = process.env.DATABASE_URL;

if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is required');
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = neon(databaseUrl);
const SOURCE_IMAGE_EXT_RE = /\.(png|jpe?g|gif)$/i;
const WEBP_EXT_RE = /\.webp$/i;

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function toWebpPath(pathname) {
  const clean = toPosixPath(pathname);
  if (!clean) return '';
  const dir = path.posix.dirname(clean);
  const base = path.posix.basename(clean).replace(/\.[^.]+$/, '');
  return dir === '.' ? `${base}.webp` : `${dir}/${base}.webp`;
}

function isSourceBlob(blob) {
  return SOURCE_IMAGE_EXT_RE.test(String(blob?.pathname || ''));
}

function isWebpBlob(blob) {
  return WEBP_EXT_RE.test(String(blob?.pathname || ''));
}

async function listAllBlobs(prefix) {
  let cursor;
  const blobs = [];
  while (true) {
    const result = await list({ token, prefix, cursor, limit: 1000 });
    blobs.push(...(result.blobs || []));
    if (!result.hasMore || !result.cursor) break;
    cursor = result.cursor;
  }
  return blobs;
}

function printTree(blobs) {
  const grouped = new Map();
  for (const blob of blobs) {
    const pathname = toPosixPath(blob.pathname);
    const topLevel = pathname.split('/')[0] || '(root)';
    if (!grouped.has(topLevel)) grouped.set(topLevel, []);
    grouped.get(topLevel).push(pathname);
  }

  console.log(`Blob tree: ${blobs.length} items`);
  for (const [topLevel, paths] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`- ${topLevel} (${paths.length})`);
    for (const item of paths.slice(0, 12)) {
      console.log(`  - ${item}`);
    }
    if (paths.length > 12) {
      console.log(`  - ... +${paths.length - 12} more`);
    }
  }
}

async function convertToWebpBuffer(sourceBuffer, sourceName) {
  const result = await sharp(sourceBuffer, { animated: true })
    .webp({ quality: 100, effort: 3 })
    .toBuffer();
  if (!result || result.length === 0) {
    throw new Error(`WebP conversion failed for ${sourceName}`);
  }
  return result;
}

function normalizeBlobUrl(url) {
  const input = String(url || '').trim();
  if (!input || !input.includes('.public.blob.vercel-storage.com/')) return input;
  try {
    const parsed = new URL(input);
    parsed.pathname = toWebpPath(parsed.pathname);
    return parsed.toString();
  } catch {
    return input.replace(/\.(png|jpe?g|webp|gif)(\?|$)/i, '.webp$2');
  }
}

async function migrateBlob(blob) {
  const sourceUrl = String(blob.url || '').trim();
  const sourcePath = toPosixPath(blob.pathname);
  const targetPath = toWebpPath(sourcePath);
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourceUrl}: ${response.status} ${response.statusText}`);
  }
  const sourceBuffer = Buffer.from(await response.arrayBuffer());
  const webpBuffer = await convertToWebpBuffer(sourceBuffer, sourcePath);
  const uploaded = await put(targetPath, webpBuffer, {
    token,
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'image/webp',
  });
  return {
    oldUrl: sourceUrl,
    newUrl: uploaded.url,
    targetPath,
  };
}

async function updateColumn(table, column) {
  const rows = await sql.query(`SELECT id, ${column} FROM ${table}`);
  let changed = 0;
  for (const row of rows) {
    const current = String(row[column] || '');
    const next = normalizeBlobUrl(current);
    if (next !== current) {
      await sql.query(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [next, row.id]);
      changed += 1;
    }
  }
  return changed;
}

async function updateJsonColumn(table, column) {
  const rows = await sql.query(`SELECT id, ${column} FROM ${table}`);
  let changed = 0;
  for (const row of rows) {
    let parsed;
    try {
      parsed = JSON.parse(row[column] || '[]');
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    const next = parsed.map((value) => normalizeBlobUrl(String(value || '')));
    if (JSON.stringify(next) !== JSON.stringify(parsed)) {
      await sql.query(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [JSON.stringify(next), row.id]);
      changed += 1;
    }
  }
  return changed;
}

function replaceBlobExtInFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const before = fs.readFileSync(filePath, 'utf8');
  const after = before.replace(
    /(https:\/\/[^\s'"`]+\.public\.blob\.vercel-storage\.com\/[^\s'"`]+?)\.(png|jpg|jpeg|webp|gif)(\b|\?)/gi,
    '$1.webp$3'
  );
  if (after !== before) {
    fs.writeFileSync(filePath, after, 'utf8');
    return true;
  }
  return false;
}

async function main() {
  const allBlobs = await listAllBlobs();
  const sourceBlobs = allBlobs.filter(isSourceBlob);
  const webpBlobs = allBlobs.filter(isWebpBlob);
  printTree(allBlobs);

  if (webpBlobs.length > 0) {
    console.log(`\nDeleting existing WebP blobs first: ${webpBlobs.length}`);
    for (let i = 0; i < webpBlobs.length; i += 100) {
      const batch = webpBlobs.slice(i, i + 100).map((blob) => blob.url);
      await del(batch, { token });
    }
  }

  const migrationResults = [];
  let index = 0;
  for (const blob of sourceBlobs) {
    index += 1;
    const sourcePath = toPosixPath(blob.pathname);
    const targetPath = toWebpPath(sourcePath);
    process.stdout.write(`\n[${index}/${sourceBlobs.length}] ${sourcePath} -> ${targetPath}\n`);
    migrationResults.push(await migrateBlob(blob));
  }

  const oldUrlsToDelete = migrationResults
    .filter((item) => item.oldUrl !== item.newUrl)
    .map((item) => item.oldUrl);

  const tables = [
    ['section_heroes', 'image_url'],
    ['ariyin_kavithaigal', 'image_url'],
    ['books_read_entries', 'image_url'],
    ['clay_play_entries', 'image_url'],
    ['guest_lectures_entries', 'image_url'],
    ['mini_projects_entries', 'logo_url'],
    ['projects_entries', 'logo_url'],
    ['experiments_entries', 'image_url'],
    ['career_entries', 'image_url'],
    ['career_entries', 'company_logo_url'],
    ['aris_books_entries', 'cover_url'],
  ];

  let dbUpdates = 0;
  for (const [table, column] of tables) {
    dbUpdates += await updateColumn(table, column);
  }
  dbUpdates += await updateJsonColumn('clay_play_entries', 'image_urls');
  dbUpdates += await updateJsonColumn('guest_lectures_entries', 'image_urls');

  const fileUpdates = [
    path.join(process.cwd(), 'pages', 'index.jsx'),
    path.join(process.cwd(), 'lib', 'youtube.js'),
    path.join(process.cwd(), 'data', 'ariTrials.js'),
  ].reduce((count, filePath) => count + (replaceBlobExtInFile(filePath) ? 1 : 0), 0);

  if (oldUrlsToDelete.length > 0) {
    for (let i = 0; i < oldUrlsToDelete.length; i += 100) {
      const batch = oldUrlsToDelete.slice(i, i + 100);
      await del(batch, { token });
    }
  }

  console.log(`\nDone. sources=${sourceBlobs.length} webpRemoved=${webpBlobs.length} uploaded=${migrationResults.length} deleted=${oldUrlsToDelete.length} dbUpdates=${dbUpdates} fileUpdates=${fileUpdates}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
