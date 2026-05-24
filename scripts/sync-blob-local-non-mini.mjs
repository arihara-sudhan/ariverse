import fs from 'node:fs';
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
const root = path.join(process.cwd(), 'blob-local');
if (!fs.existsSync(root)) throw new Error('blob-local folder not found');

const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function relPosix(absPath) {
  return path.relative(root, absPath).split(path.sep).join('/');
}

function slugify(input) {
  const text = String(input || '').trim().toLowerCase().normalize('NFKC');
  const slug = text.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  return slug || 'untitled';
}

function languageSlug(categoryRaw) {
  const cat = String(categoryRaw || '').trim().toUpperCase();
  return cat === 'TAMIL' ? 'tamil' : 'english';
}

function bookSubcategorySlug(subcategoryRaw) {
  const sub = String(subcategoryRaw || '').trim().toUpperCase();
  if (sub === 'NON_FICTION') return 'non-fiction';
  if (sub === 'FICTION') return 'fiction';
  return slugify(subcategoryRaw);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function extractBlobPath(url) {
  try {
    return new URL(url).pathname.replace(/^\/+/, '');
  } catch (_error) {
    return '';
  }
}

async function listAllBlobs() {
  let cursor;
  const blobs = [];
  while (true) {
    const res = await list({ token, cursor, limit: 1000 });
    blobs.push(...(res.blobs || []));
    if (!res.hasMore || !res.cursor) break;
    cursor = res.cursor;
  }
  return blobs;
}

function collectLocalFiles() {
  const files = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      const ext = path.extname(name).toLowerCase();
      if (!imageExts.has(ext)) continue;
      files.push(full);
    }
  }
  walk(root);
  return files;
}

function buildManifest(localFiles) {
  const manifest = [];
  const seenDest = new Set();
  for (const abs of localFiles) {
    const rel = relPosix(abs);
    if (rel.startsWith('mini-projects/')) continue;
    const dest = rel.replace(/^\/+/, '');
    if (seenDest.has(dest)) throw new Error(`Destination collision: ${dest}`);
    seenDest.add(dest);
    manifest.push({ sourceAbs: abs, sourceRel: rel, destPath: dest });
  }
  manifest.sort((a, b) => a.destPath.localeCompare(b.destPath));
  return manifest;
}

function buildPathSet(manifest) {
  return new Set(manifest.map((m) => m.destPath));
}

function pickExistingPath(pathSet, candidates) {
  for (const c of candidates) {
    if (pathSet.has(c)) return c;
  }
  return '';
}

function makeHeroPath(label, href, pathSet) {
  const h = String(href || '');
  const candidates = [];
  if (h.includes('/ariyin-kavithaigal')) candidates.push('ariyin-kavithaigal/hero.png', 'ariyin-kavithaigal/hero.jpg', 'ariyin-kavithaigal/hero.jpeg', 'ariyin-kavithaigal/hero.webp');
  else if (h.includes('/binomial-names')) candidates.push('binomial-names/hero.png', 'binomial-names/hero.jpg', 'binomial-names/hero.jpeg', 'binomial-names/hero.webp');
  else if (h.includes('/my-books') || label === 'Books Read') candidates.push('books-read/hero.png', 'books-read/hero.jpg', 'books-read/hero.jpeg', 'books-read/hero.webp');
  else if (h.includes('/clay-play')) candidates.push('clay-play/hero.png', 'clay-play/hero.jpg', 'clay-play/hero.jpeg', 'clay-play/hero.webp');
  else if (h.includes('/experiments') || h.includes('/aris-trials')) candidates.push('experiments/hero.png', 'experiments/hero.jpg', 'experiments/hero.jpeg', 'experiments/hero.webp');
  else if (h.includes('/guest-lectures')) candidates.push('guest-lectures/hero.png', 'guest-lectures/hero.jpg', 'guest-lectures/hero.jpeg', 'guest-lectures/hero.webp');
  else if (h.includes('/projects')) candidates.push('projects/hero.png', 'projects/hero.jpg', 'projects/hero.jpeg', 'projects/hero.webp');
  else return '';
  return pickExistingPath(pathSet, candidates);
}

function buildKavPath(kavithaiName, sortOrder, pathSet) {
  const titleMap = new Map([
    ['காதல்', 'kathal'],
    ['உனக்கெனவே நான்', 'unakkenave-naan'],
    ['அவள்', 'aval'],
    ['நிலவினும் அழகிய முகம்', 'nilavinum-azhagiya-mugam'],
  ]);
  const orderMap = new Map([
    [1, 'kathal'],
    [2, 'unakkenave-naan'],
    [3, 'aval'],
    [4, 'nilavinum-azhagiya-mugam'],
  ]);

  const bases = [];
  const mapped = titleMap.get(String(kavithaiName || ''));
  if (mapped) bases.push(mapped);
  const ordered = orderMap.get(Number(sortOrder));
  if (ordered) bases.push(ordered);
  bases.push(slugify(kavithaiName));

  for (const base of bases) {
    const hit = pickExistingPath(pathSet, [
      `ariyin-kavithaigal/${base}.png`,
      `ariyin-kavithaigal/${base}.jpg`,
      `ariyin-kavithaigal/${base}.jpeg`,
      `ariyin-kavithaigal/${base}.webp`,
    ]);
    if (hit) return hit;
  }
  throw new Error(`Could not map kavithai row: "${kavithaiName}" (sort_order=${sortOrder})`);
}

function buildBookPath(row, pathSet) {
  const lang = languageSlug(row.category);
  const sub = bookSubcategorySlug(row.subcategory);
  const primary = slugify(row.title);
  const candidates = [primary];
  if (String(row.title || '').toLowerCase().startsWith('frankenstein;')) candidates.push('frankenstein');

  for (const c of candidates) {
    const hit = pickExistingPath(pathSet, [
      `books-read/${lang}/${sub}/${c}.png`,
      `books-read/${lang}/${sub}/${c}.jpg`,
      `books-read/${lang}/${sub}/${c}.jpeg`,
      `books-read/${lang}/${sub}/${c}.webp`,
    ]);
    if (hit) return hit;
  }
  throw new Error(`Could not map book row: "${row.title}"`);
}

function buildClayFolder(entryTitle) {
  const t = String(entryTitle || '').trim();
  if (t === 'Sivan/Nataraajan') return 'sivan';
  if (t === 'Ayyan/Sastha') return 'ayyan-sastha';
  if (t === 'Amman') return 'amman';
  return slugify(t);
}

function parseTrailingNumber(pathname) {
  const base = pathname.split('/').pop() || '';
  const m = base.match(/-(\d+)\.[^.]+$/);
  return m ? Number(m[1]) : Number.NaN;
}

function buildEntryImageArray(folder, count, pathSet, topDir) {
  const extCandidates = ['png', 'jpg', 'jpeg', 'webp'];
  const mainCandidates = extCandidates.map((ext) => `${topDir}/${folder}/${folder}.${ext}`);
  const mainPath = pickExistingPath(pathSet, mainCandidates);
  if (!mainPath) throw new Error(`Missing main image for ${topDir}/${folder}`);

  const prefix = `${topDir}/${folder}/${folder}-`;
  const variantCandidates = [...pathSet]
    .filter((p) => p.startsWith(prefix))
    .sort((a, b) => {
      const an = parseTrailingNumber(a);
      const bn = parseTrailingNumber(b);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return a.localeCompare(b);
    });

  const expanded = [mainPath, ...variantCandidates];
  if (expanded.length === 0) return [];
  while (expanded.length < count) expanded.push(expanded[expanded.length - 1]);
  return expanded.slice(0, count);
}

async function main() {
  const localFiles = collectLocalFiles();
  const manifest = buildManifest(localFiles);
  const pathSet = buildPathSet(manifest);

  console.log(`Local source files: ${localFiles.length}`);
  console.log(`Upload targets (excluding mini-projects): ${manifest.length}`);

  const [existingBlobs, profileLinks, sectionHeroes, kavRows, booksRows, clayRows, guestRows] = await Promise.all([
    listAllBlobs(),
    sql`SELECT id, label, href FROM profile_links`,
    sql`SELECT id, link_id, image_url FROM section_heroes`,
    sql`SELECT id, sort_order, kavithai_name, image_url FROM ariyin_kavithaigal ORDER BY sort_order, id`,
    sql`SELECT id, title, category, subcategory, image_url FROM books_read_entries`,
    sql`SELECT id, entry_title, image_url, image_urls FROM clay_play_entries`,
    sql`SELECT id, entry_title, image_url, image_urls FROM guest_lectures_entries`,
  ]);

  const nonMiniUrls = existingBlobs.filter((b) => !String(b.pathname).startsWith('mini-projects/')).map((b) => b.url);
  if (nonMiniUrls.length > 0) {
    for (const c of chunk(nonMiniUrls, 300)) await del(c, { token });
  }
  console.log(`Deleted old non-mini blobs: ${nonMiniUrls.length}`);

  const uploadedUrlByPath = new Map();
  for (const item of manifest) {
    const body = fs.readFileSync(item.sourceAbs);
    const created = await put(item.destPath, body, {
      token,
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    uploadedUrlByPath.set(item.destPath, created.url);
  }
  console.log(`Uploaded blobs: ${uploadedUrlByPath.size}`);

  const anyUrl = uploadedUrlByPath.values().next().value;
  if (!anyUrl) throw new Error('No uploads completed');
  const origin = new URL(anyUrl).origin;
  const urlForPath = (p) => `${origin}/${p}`;

  const labelByLinkId = new Map(profileLinks.map((r) => [r.id, r.label]));
  const hrefByLinkId = new Map(profileLinks.map((r) => [r.id, r.href]));

  let sectionUpdates = 0;
  for (const row of sectionHeroes) {
    const label = labelByLinkId.get(row.link_id) || '';
    const href = hrefByLinkId.get(row.link_id) || '';
    const heroPath = makeHeroPath(label, href, pathSet);
    if (!heroPath) continue;
    const next = urlForPath(heroPath);
    if (next !== row.image_url) {
      await sql`UPDATE section_heroes SET image_url = ${next} WHERE id = ${row.id}`;
      sectionUpdates += 1;
    }
  }

  let kavUpdates = 0;
  for (const row of kavRows) {
    const targetPath = buildKavPath(row.kavithai_name, row.sort_order, pathSet);
    const next = urlForPath(targetPath);
    if (next !== row.image_url) {
      await sql`UPDATE ariyin_kavithaigal SET image_url = ${next} WHERE id = ${row.id}`;
      kavUpdates += 1;
    }
  }

  let bookUpdates = 0;
  for (const row of booksRows) {
    const targetPath = buildBookPath(row, pathSet);
    const next = urlForPath(targetPath);
    if (next !== row.image_url) {
      await sql`UPDATE books_read_entries SET image_url = ${next} WHERE id = ${row.id}`;
      bookUpdates += 1;
    }
  }

  let clayUpdates = 0;
  for (const row of clayRows) {
    const folder = buildClayFolder(row.entry_title);
    const mainPath = pickExistingPath(pathSet, [
      `clay-play/${folder}/${folder}.png`,
      `clay-play/${folder}/${folder}.jpg`,
      `clay-play/${folder}/${folder}.jpeg`,
      `clay-play/${folder}/${folder}.webp`,
    ]);
    if (!mainPath) throw new Error(`Missing clay main image: clay-play/${folder}/${folder}.*`);
    const nextMain = urlForPath(mainPath);

    let oldArr = [];
    try { oldArr = JSON.parse(row.image_urls || '[]'); } catch (_error) { oldArr = []; }
    if (!Array.isArray(oldArr)) oldArr = [];
    const nextArrPaths = buildEntryImageArray(folder, oldArr.length, pathSet, 'clay-play');
    const nextArr = nextArrPaths.map((p) => urlForPath(p));

    if (nextMain !== row.image_url) {
      await sql`UPDATE clay_play_entries SET image_url = ${nextMain} WHERE id = ${row.id}`;
      clayUpdates += 1;
    }
    if (JSON.stringify(nextArr) !== JSON.stringify(oldArr)) {
      await sql`UPDATE clay_play_entries SET image_urls = ${JSON.stringify(nextArr)} WHERE id = ${row.id}`;
      clayUpdates += 1;
    }
  }

  let guestUpdates = 0;
  for (const row of guestRows) {
    const folder = slugify(row.entry_title);
    const mainPath = pickExistingPath(pathSet, [
      `guest-lectures/${folder}/${folder}.png`,
      `guest-lectures/${folder}/${folder}.jpg`,
      `guest-lectures/${folder}/${folder}.jpeg`,
      `guest-lectures/${folder}/${folder}.webp`,
    ]);
    if (!mainPath) throw new Error(`Missing guest main image: guest-lectures/${folder}/${folder}.*`);
    const nextMain = urlForPath(mainPath);

    let oldArr = [];
    try { oldArr = JSON.parse(row.image_urls || '[]'); } catch (_error) { oldArr = []; }
    if (!Array.isArray(oldArr)) oldArr = [];
    const nextArrPaths = buildEntryImageArray(folder, oldArr.length, pathSet, 'guest-lectures');
    const nextArr = nextArrPaths.map((p) => urlForPath(p));

    if (nextMain !== row.image_url) {
      await sql`UPDATE guest_lectures_entries SET image_url = ${nextMain} WHERE id = ${row.id}`;
      guestUpdates += 1;
    }
    if (JSON.stringify(nextArr) !== JSON.stringify(oldArr)) {
      await sql`UPDATE guest_lectures_entries SET image_urls = ${JSON.stringify(nextArr)} WHERE id = ${row.id}`;
      guestUpdates += 1;
    }
  }

  const verifyRows = await Promise.all([
    sql`SELECT image_url FROM section_heroes WHERE image_url <> ''`,
    sql`SELECT image_url FROM ariyin_kavithaigal`,
    sql`SELECT image_url FROM books_read_entries`,
    sql`SELECT image_url, image_urls FROM clay_play_entries`,
    sql`SELECT image_url, image_urls FROM guest_lectures_entries`,
  ]);

  const allBlobPaths = new Set(uploadedUrlByPath.keys());
  for (const b of existingBlobs) {
    if (String(b.pathname).startsWith('mini-projects/')) allBlobPaths.add(String(b.pathname));
  }

  const missingRefs = [];
  for (const row of verifyRows[0]) {
    const p = extractBlobPath(row.image_url);
    if (p && !allBlobPaths.has(p)) missingRefs.push(p);
  }
  for (const row of verifyRows[1]) {
    const p = extractBlobPath(row.image_url);
    if (p && !allBlobPaths.has(p)) missingRefs.push(p);
  }
  for (const row of verifyRows[2]) {
    const p = extractBlobPath(row.image_url);
    if (p && !allBlobPaths.has(p)) missingRefs.push(p);
  }
  for (const row of verifyRows[3]) {
    const p = extractBlobPath(row.image_url);
    if (p && !allBlobPaths.has(p)) missingRefs.push(p);
    try {
      const arr = JSON.parse(row.image_urls || '[]');
      if (Array.isArray(arr)) for (const u of arr) { const ap = extractBlobPath(u); if (ap && !allBlobPaths.has(ap)) missingRefs.push(ap); }
    } catch (_error) {}
  }
  for (const row of verifyRows[4]) {
    const p = extractBlobPath(row.image_url);
    if (p && !allBlobPaths.has(p)) missingRefs.push(p);
    try {
      const arr = JSON.parse(row.image_urls || '[]');
      if (Array.isArray(arr)) for (const u of arr) { const ap = extractBlobPath(u); if (ap && !allBlobPaths.has(ap)) missingRefs.push(ap); }
    } catch (_error) {}
  }

  if (missingRefs.length > 0) {
    const uniq = [...new Set(missingRefs)].sort();
    throw new Error(`Neon now references missing blob paths: ${uniq.join(', ')}`);
  }

  console.log(`Done. sectionUpdates=${sectionUpdates} kavUpdates=${kavUpdates} bookUpdates=${bookUpdates} clayUpdates=${clayUpdates} guestUpdates=${guestUpdates}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
