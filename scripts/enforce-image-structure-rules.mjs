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
const isDryRun = process.argv.includes('--dry-run');
const shouldDeleteOld = process.argv.includes('--delete-old');

function slugify(input) {
  const text = String(input || '').trim().toLowerCase().normalize('NFKC');
  const slug = text
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
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

function extFromUrl(url) {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split('/').pop() || '';
    const dot = name.lastIndexOf('.');
    if (dot !== -1) return name.slice(dot);
  } catch (_error) {
    // ignore
  }
  return '.png';
}

function isBlobUrl(url) {
  return typeof url === 'string' && /^https?:\/\//.test(url) && url.includes('.public.blob.vercel-storage.com');
}

async function fetchBlobMap() {
  let cursor;
  const byUrl = new Map();
  const byPath = new Map();
  while (true) {
    const result = await list({ token, cursor, limit: 1000 });
    for (const blob of result.blobs || []) {
      byUrl.set(blob.url, blob);
      byPath.set(String(blob.pathname || '').replace(/^\/+/, ''), blob);
    }
    if (!result.hasMore || !result.cursor) break;
    cursor = result.cursor;
  }
  return { byUrl, byPath };
}

async function copyToPath(oldUrl, newPath, cache) {
  if (!isBlobUrl(oldUrl)) return oldUrl;
  const normalizedPath = String(newPath || '').replace(/^\/+/, '');
  const existing = cache.byPath.get(normalizedPath);
  if (existing) return existing.url;

  const response = await fetch(oldUrl);
  if (!response.ok) throw new Error(`Failed to fetch ${oldUrl}: ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (isDryRun) {
    return `dryrun://${normalizedPath}`;
  }
  const created = await put(normalizedPath, body, {
    token,
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  cache.byPath.set(normalizedPath, { ...created, pathname: normalizedPath });
  cache.byUrl.set(created.url, { ...created, pathname: normalizedPath });
  return created.url;
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

async function main() {
  const cache = await fetchBlobMap();
  const toDelete = new Set();
  let moved = 0;
  let dbUpdates = 0;

  const profileLinks = await sql`SELECT id, label, href FROM profile_links`;
  const sectionHeroes = await sql`SELECT id, link_id, image_url FROM section_heroes`;
  const kav = await sql`SELECT id, kavithai_name, image_url FROM ariyin_kavithaigal`;
  const books = await sql`SELECT id, title, category, subcategory, image_url FROM books_read_entries`;
  const clay = await sql`SELECT id, entry_title, image_url, image_urls FROM clay_play_entries`;
  const guest = await sql`SELECT id, entry_title, image_url, image_urls FROM guest_lectures_entries`;

  const labelByLinkId = new Map(profileLinks.map((r) => [r.id, r.label]));
  const hrefByLinkId = new Map(profileLinks.map((r) => [r.id, r.href]));

  async function migrateSingle(oldUrl, targetPath) {
    if (!isBlobUrl(oldUrl)) return oldUrl;
    const oldPath = new URL(oldUrl).pathname.replace(/^\/+/, '');
    const normalizedTarget = targetPath.replace(/^\/+/, '');
    if (oldPath === normalizedTarget) return oldUrl;

    let nextUrl = oldUrl;
    try {
      nextUrl = await copyToPath(oldUrl, normalizedTarget, cache);
    } catch (error) {
      console.warn(`skip move (missing/unreadable source): ${oldUrl} -> ${normalizedTarget} (${error.message})`);
      return oldUrl;
    }
    moved += 1;
    toDelete.add(oldUrl);
    return nextUrl;
  }

  for (const row of sectionHeroes) {
    const label = labelByLinkId.get(row.link_id) || '';
    const href = String(hrefByLinkId.get(row.link_id) || '');
    if (!isBlobUrl(row.image_url)) continue;
    const ext = extFromUrl(row.image_url);
    const targetPath = heroPathForSection(label, href, ext);
    if (!targetPath) continue;

    const nextUrl = await migrateSingle(row.image_url, targetPath);
    if (nextUrl !== row.image_url) {
      dbUpdates += 1;
      if (!isDryRun) await sql`UPDATE section_heroes SET image_url = ${nextUrl} WHERE id = ${row.id}`;
    }
  }

  for (const row of kav) {
    if (!isBlobUrl(row.image_url)) continue;
    const ext = extFromUrl(row.image_url);
    const targetPath = `ariyin-kavithaigal/${slugify(row.kavithai_name)}${ext}`;
    const nextUrl = await migrateSingle(row.image_url, targetPath);
    if (nextUrl !== row.image_url) {
      dbUpdates += 1;
      if (!isDryRun) await sql`UPDATE ariyin_kavithaigal SET image_url = ${nextUrl} WHERE id = ${row.id}`;
    }
  }

  for (const row of books) {
    if (!isBlobUrl(row.image_url)) continue;
    const ext = extFromUrl(row.image_url);
    const targetPath = `books-read/${languageSlug(row.category)}/${bookSubcategorySlug(row.subcategory)}/${slugify(row.title)}${ext}`;
    const nextUrl = await migrateSingle(row.image_url, targetPath);
    if (nextUrl !== row.image_url) {
      dbUpdates += 1;
      if (!isDryRun) await sql`UPDATE books_read_entries SET image_url = ${nextUrl} WHERE id = ${row.id}`;
    }
  }

  for (const row of clay) {
    const entrySlug = slugify(row.entry_title);
    if (isBlobUrl(row.image_url)) {
      const ext = extFromUrl(row.image_url);
      const targetPath = `clay-play/${entrySlug}/${entrySlug}${ext}`;
      const nextUrl = await migrateSingle(row.image_url, targetPath);
      if (nextUrl !== row.image_url) {
        dbUpdates += 1;
        if (!isDryRun) await sql`UPDATE clay_play_entries SET image_url = ${nextUrl} WHERE id = ${row.id}`;
      }
    }

    try {
      const parsed = JSON.parse(row.image_urls || '[]');
      if (!Array.isArray(parsed)) continue;
      const nextArr = [];
      let changed = false;
      let idx = 0;
      for (const raw of parsed) {
        idx += 1;
        if (!isBlobUrl(raw)) {
          nextArr.push(raw);
          continue;
        }
        const ext = extFromUrl(raw);
        const targetPath = `clay-play/${entrySlug}/${entrySlug}-${idx}${ext}`;
        const nextUrl = await migrateSingle(raw, targetPath);
        if (nextUrl !== raw) changed = true;
        nextArr.push(nextUrl);
      }
      if (changed) {
        dbUpdates += 1;
        if (!isDryRun) await sql`UPDATE clay_play_entries SET image_urls = ${JSON.stringify(nextArr)} WHERE id = ${row.id}`;
      }
    } catch (_error) {
      // ignore bad JSON
    }
  }

  for (const row of guest) {
    const lectureSlug = slugify(row.entry_title);
    if (isBlobUrl(row.image_url)) {
      const ext = extFromUrl(row.image_url);
      const targetPath = `guest-lectures/${lectureSlug}/${lectureSlug}${ext}`;
      const nextUrl = await migrateSingle(row.image_url, targetPath);
      if (nextUrl !== row.image_url) {
        dbUpdates += 1;
        if (!isDryRun) await sql`UPDATE guest_lectures_entries SET image_url = ${nextUrl} WHERE id = ${row.id}`;
      }
    }

    try {
      const parsed = JSON.parse(row.image_urls || '[]');
      if (!Array.isArray(parsed)) continue;
      const nextArr = [];
      let changed = false;
      let idx = 0;
      for (const raw of parsed) {
        idx += 1;
        if (!isBlobUrl(raw)) {
          nextArr.push(raw);
          continue;
        }
        const ext = extFromUrl(raw);
        const targetPath = `guest-lectures/${lectureSlug}/${lectureSlug}-${idx}${ext}`;
        const nextUrl = await migrateSingle(raw, targetPath);
        if (nextUrl !== raw) changed = true;
        nextArr.push(nextUrl);
      }
      if (changed) {
        dbUpdates += 1;
        if (!isDryRun) await sql`UPDATE guest_lectures_entries SET image_urls = ${JSON.stringify(nextArr)} WHERE id = ${row.id}`;
      }
    } catch (_error) {
      // ignore bad JSON
    }
  }

  const assetCandidatePaths = ['assets/hero/ari.png', 'assets/hero/glory-lily.jpg'];
  for (const oldPath of assetCandidatePaths) {
    const blob = cache.byPath.get(oldPath);
    if (!blob) continue;
    const newPath = `assets/${oldPath.split('/').pop()}`;
    await migrateSingle(blob.url, newPath);
  }

  if (!isDryRun && shouldDeleteOld && toDelete.size > 0) {
    await del([...toDelete], { token });
  }

  console.log(`done dryRun=${isDryRun} moved=${moved} dbUpdates=${dbUpdates} deleteOld=${shouldDeleteOld} oldDeleted=${toDelete.size}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});