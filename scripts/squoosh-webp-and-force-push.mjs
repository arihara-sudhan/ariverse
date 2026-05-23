import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { del, list, put } from '@vercel/blob';

loadEnv({ path: path.join(process.cwd(), '.env') });

const token = process.env.BLOB_READ_WRITE_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is required');
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const sql = neon(databaseUrl);

const root = path.join(process.cwd(), 'blob-download');
if (!fs.existsSync(root)) throw new Error('blob-download folder not found');

const exts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const files = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else if (exts.has(path.extname(name).toLowerCase())) files.push(full);
  }
}
walk(root);

console.log(`Converting ${files.length} images with squoosh...`);
for (const full of files) {
  const dir = path.dirname(full);
  const ext = path.extname(full);
  const base = path.basename(full, ext);
  const outWebp = path.join(dir, `${base}.webp`);

  const args = [
    '@squoosh/cli',
    '--webp', '{"quality":25.6,"effort":6}',
    '-d', dir,
    full,
  ];
  const run = spawnSync('npx', args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_OPTIONS: '--no-experimental-fetch' },
  });
  if (run.status !== 0) {
    throw new Error(`squoosh failed for ${full}`);
  }

  if (!fs.existsSync(outWebp)) {
    throw new Error(`Expected output missing: ${outWebp}`);
  }

  if (path.resolve(full) !== path.resolve(outWebp) && fs.existsSync(full)) {
    fs.unlinkSync(full);
  }
}

const uploadFiles = [];
function walkWebp(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkWebp(full);
    else if (path.extname(name).toLowerCase() === '.webp') uploadFiles.push(full);
  }
}
walkWebp(root);
console.log(`Prepared ${uploadFiles.length} webp files for upload.`);

const topDirs = new Set(uploadFiles.map((f) => path.relative(root, f).split(path.sep)[0]));

async function listAll(prefix) {
  let cursor;
  const blobs = [];
  while (true) {
    const res = await list({ token, prefix, cursor, limit: 1000 });
    blobs.push(...(res.blobs || []));
    if (!res.hasMore || !res.cursor) break;
    cursor = res.cursor;
  }
  return blobs;
}

let deleted = 0;
for (const dir of topDirs) {
  const prefix = `${dir}/`;
  const blobs = await listAll(prefix);
  if (blobs.length > 0) {
    await del(blobs.map((b) => b.url), { token });
    deleted += blobs.length;
  }
  console.log(`Deleted ${blobs.length} blobs under ${prefix}`);
}

let uploaded = 0;
for (const full of uploadFiles) {
  const rel = path.relative(root, full).split(path.sep).join('/');
  const body = fs.readFileSync(full);
  await put(rel, body, {
    token,
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  uploaded += 1;
}
console.log(`Uploaded ${uploaded} webp blobs.`);

function toWebpUrl(url) {
  if (typeof url !== 'string') return url;
  if (!url.includes('.public.blob.vercel-storage.com/')) return url;
  return url.replace(/\.(png|jpg|jpeg|webp)(\?|$)/i, '.webp$2');
}

const tables = [
  ['section_heroes', 'image_url'],
  ['ariyin_kavithaigal', 'image_url'],
  ['books_read_entries', 'image_url'],
  ['clay_play_entries', 'image_url'],
  ['guest_lectures_entries', 'image_url'],
];

let dbUpdates = 0;
for (const [table, col] of tables) {
  const rows = await sql.query(`SELECT id, ${col} FROM ${table}`);
  for (const row of rows) {
    const next = toWebpUrl(row[col]);
    if (next !== row[col]) {
      await sql.query(`UPDATE ${table} SET ${col} = $1 WHERE id = $2`, [next, row.id]);
      dbUpdates += 1;
    }
  }
}

for (const table of ['clay_play_entries', 'guest_lectures_entries']) {
  const rows = await sql.query(`SELECT id, image_urls FROM ${table}`);
  for (const row of rows) {
    let arr;
    try { arr = JSON.parse(row.image_urls || '[]'); } catch { continue; }
    if (!Array.isArray(arr)) continue;
    const nextArr = arr.map((u) => toWebpUrl(u));
    if (JSON.stringify(nextArr) !== JSON.stringify(arr)) {
      await sql.query(`UPDATE ${table} SET image_urls = $1 WHERE id = $2`, [JSON.stringify(nextArr), row.id]);
      dbUpdates += 1;
    }
  }
}

function replaceBlobExtInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const old = fs.readFileSync(filePath, 'utf8');
  const updated = old.replace(/(https:\/\/[^\s'"`]+\.public\.blob\.vercel-storage\.com\/[^\s'"`]+?)\.(png|jpg|jpeg|webp)(\b|\?)/gi, '$1.webp$3');
  if (updated !== old) fs.writeFileSync(filePath, updated, 'utf8');
}

replaceBlobExtInFile(path.join(process.cwd(), 'pages', 'index.jsx'));
replaceBlobExtInFile(path.join(process.cwd(), 'lib', 'youtube.js'));
replaceBlobExtInFile(path.join(process.cwd(), 'data', 'miniProjects.js'));

console.log(`Done. deleted=${deleted} uploaded=${uploaded} dbUpdates=${dbUpdates}`);
