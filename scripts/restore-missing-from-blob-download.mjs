import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

loadEnv({ path: path.join(process.cwd(), '.env') });
const token = process.env.BLOB_READ_WRITE_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
if (!token || !databaseUrl) throw new Error('Missing env');
const sql = neon(databaseUrl);
const baseDir = path.join(process.cwd(), 'blob-download');

function isBlobUrl(url) {
  return typeof url === 'string' && /^https?:\/\//.test(url) && url.includes('.public.blob.vercel-storage.com');
}
function extFromUrl(url) {
  try {
    const n = new URL(url).pathname.split('/').pop() || '';
    const i = n.lastIndexOf('.');
    if (i !== -1) return n.slice(i);
  } catch {}
  return '.png';
}
function slugify(input) {
  const text = String(input || '').trim().toLowerCase().normalize('NFKC');
  const slug = text.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  return slug || 'untitled';
}
function bookSubcategorySlug(subcategoryRaw) {
  const sub = String(subcategoryRaw || '').trim().toUpperCase();
  if (sub === 'NON_FICTION') return 'non-fiction';
  if (sub === 'FICTION') return 'fiction';
  return slugify(subcategoryRaw);
}
function languageSlug(categoryRaw) {
  const cat = String(categoryRaw || '').trim().toUpperCase();
  return cat === 'TAMIL' ? 'tamil' : 'english';
}
function heroPathForSection(label, href, ext) {
  if (href.includes('/ariyin-kavithaigal')) return `ariyin-kavithaigal/hero${ext}`;
  if (href.includes('/binomial-names')) return `binomial-names/hero${ext}`;
  if (href.includes('/my-books') || label === 'Books Read') return `books-read/hero${ext}`;
  if (href.includes('/clay-play')) return `clay-play/hero${ext}`;
  if (href.includes('/experiments')) return `experiments/hero${ext}`;
  if (href.includes('/guest-lectures')) return `guest-lectures/hero${ext}`;
  if (href.includes('/projects')) return `projects/hero${ext}`;
  if (href.includes('/mini-projects') || label === 'Mini-Projects') return `mini-projects/hero${ext}`;
  return '';
}

const allFiles = [];
function walk(dir) { for (const name of fs.readdirSync(dir)) { const full = path.join(dir, name); const st = fs.statSync(full); if (st.isDirectory()) walk(full); else allFiles.push(full);} }
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
  for (const c of candidates) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  const base = path.basename(decoded);
  const matched = allFiles.filter((f) => path.basename(f) === base);
  if (matched.length === 1) return matched[0];
  return null;
}

const profileLinks = await sql`SELECT id, label, href FROM profile_links`;
const sectionHeroes = await sql`SELECT id, link_id, image_url FROM section_heroes`;
const kav = await sql`SELECT id, kavithai_name, image_url FROM ariyin_kavithaigal`;
const books = await sql`SELECT id, title, category, subcategory, image_url FROM books_read_entries`;
const clay = await sql`SELECT id, entry_title, image_url, image_urls FROM clay_play_entries`;
const guest = await sql`SELECT id, entry_title, image_url, image_urls FROM guest_lectures_entries`;

const labelByLinkId = new Map(profileLinks.map((r) => [r.id, r.label]));
const hrefByLinkId = new Map(profileLinks.map((r) => [r.id, r.href]));

const oldCandidates = new Set();
function collect(oldUrl, targetPath) {
  if (!isBlobUrl(oldUrl) || !targetPath) return;
  const oldPath = new URL(oldUrl).pathname.replace(/^\/+/, '');
  if (oldPath !== targetPath.replace(/^\/+/, '')) oldCandidates.add(oldUrl);
}
for (const row of sectionHeroes) {
  if (!isBlobUrl(row.image_url)) continue;
  const t = heroPathForSection(labelByLinkId.get(row.link_id)||'', String(hrefByLinkId.get(row.link_id)||''), extFromUrl(row.image_url));
  collect(row.image_url, t);
}
for (const row of kav) collect(row.image_url, `ariyin-kavithaigal/${slugify(row.kavithai_name)}${extFromUrl(row.image_url)}`);
for (const row of books) collect(row.image_url, `books-read/${languageSlug(row.category)}/${bookSubcategorySlug(row.subcategory)}/${slugify(row.title)}${extFromUrl(row.image_url)}`);
for (const row of clay) {
  const s = slugify(row.entry_title);
  collect(row.image_url, `clay-play/${s}/${s}${extFromUrl(row.image_url)}`);
  try { const arr = JSON.parse(row.image_urls||'[]'); let i=0; for (const u of arr){ i++; collect(u, `clay-play/${s}/${s}-${i}${extFromUrl(u)}`);} } catch{}
}
for (const row of guest) {
  const s = slugify(row.entry_title);
  collect(row.image_url, `guest-lectures/${s}/${s}${extFromUrl(row.image_url)}`);
  try { const arr = JSON.parse(row.image_urls||'[]'); let i=0; for (const u of arr){ i++; collect(u, `guest-lectures/${s}/${s}-${i}${extFromUrl(u)}`);} } catch{}
}

let needRestore = 0, restored = 0, missingLocal = 0;
for (const oldUrl of oldCandidates) {
  const r = await fetch(oldUrl, { method: 'GET' });
  if (r.ok) continue;
  needRestore++;
  const pathname = new URL(oldUrl).pathname.replace(/^\/+/, '');
  const local = findLocalFileForPath(pathname);
  if (!local) {
    missingLocal++;
    console.log(`MISSING_LOCAL ${pathname}`);
    continue;
  }
  const body = fs.readFileSync(local);
  await put(pathname, body, { token, access:'public', addRandomSuffix:false, allowOverwrite:true });
  restored++;
  console.log(`RESTORED ${pathname} <- ${path.relative(process.cwd(), local)}`);
}

console.log(`done candidates=${oldCandidates.size} needRestore=${needRestore} restored=${restored} missingLocal=${missingLocal}`);