import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { put } from '@vercel/blob';

loadEnv({ path: path.join(process.cwd(), '.env') });

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN missing');

const logPath = path.join(process.cwd(), 'scripts', '.last-enforce-dryrun.log');
const baseDir = path.join(process.cwd(), 'blob-download');
if (!fs.existsSync(logPath)) throw new Error('Missing scripts/.last-enforce-dryrun.log');
if (!fs.existsSync(baseDir)) throw new Error('Missing blob-download folder');

const log = fs.readFileSync(logPath, 'utf8');
const re = /skip move \(missing\/unreadable source\):\s+(https:\/\/[^\s]+)\s+->/g;
const urls = [];
for (const m of log.matchAll(re)) urls.push(m[1]);
const uniqueUrls = [...new Set(urls)];

const allFiles = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else allFiles.push(full);
  }
}
walk(baseDir);

function findLocalFileForPath(blobPathname) {
  const normalized = blobPathname.replace(/^\/+/, '');
  const decoded = decodeURIComponent(normalized);
  const candidates = [
    path.join(baseDir, normalized),
    path.join(baseDir, decoded),
    path.join(baseDir, normalized.replace('/uploads/uploads/', '/uploads/')),
    path.join(baseDir, decoded.replace('/uploads/uploads/', '/uploads/')),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  const base = path.basename(decoded);
  const matched = allFiles.filter((f) => path.basename(f) === base);
  if (matched.length === 1) return matched[0];
  return null;
}

let restored = 0;
let missing = 0;
for (const url of uniqueUrls) {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/^\/+/, '');
  const local = findLocalFileForPath(pathname);
  if (!local) {
    missing += 1;
    console.log(`MISSING_LOCAL ${pathname}`);
    continue;
  }
  const body = fs.readFileSync(local);
  await put(pathname, body, {
    token,
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  restored += 1;
  console.log(`RESTORED ${pathname} <- ${path.relative(process.cwd(), local)}`);
}

console.log(`done restored=${restored} missingLocal=${missing} totalMissingUrls=${uniqueUrls.length}`);