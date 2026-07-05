import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';
const SUPABASE_URL = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_BUCKET = String(
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
    process.env.SUPABASE_STORAGE_BUCKET ||
    'ariverse',
).trim() || 'ariverse';
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!DATABASE_URL) throw new Error('DATABASE_URL is missing.');
if (!SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing.');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing.');

const sql = neon(DATABASE_URL);

const COVER_FILENAME_BY_OLD_POEM_FILENAME = new Map([
  ['kaathal.webp', 'arichuvadi/posts/kavithai-1/images/cover.webp'],
  ['unakkenave-naan.webp', 'arichuvadi/posts/kavithai-3/images/cover.webp'],
  ['aval.webp', 'arichuvadi/posts/kavithai-4/images/cover.webp'],
  ['nilavinum_azhagiya_mugam.webp', 'arichuvadi/posts/kavithai-5/images/cover.webp'],
  ['mazhai.webp', 'arichuvadi/posts/kavithai-7/images/cover.webp'],
  ['anbu.webp', 'arichuvadi/posts/kavithai-8/images/cover.webp'],
  ['aval-2.webp', 'arichuvadi/posts/kavithai-9/images/cover.webp'],
  ['kraamaththu-kaathali.webp', 'arichuvadi/posts/kavithai-10/images/cover.webp'],
  ['ambasamudram.webp', 'arichuvadi/posts/kavithai-11/images/cover.webp'],
  ['tenkasi-visuwanatham.webp', 'arichuvadi/posts/kavithai-12/images/cover.webp'],
  ['meelgiren.webp', 'arichuvadi/posts/kavithai-13/images/cover.webp'],
  ['kanavu.webp', 'arichuvadi/posts/kavithai-14/images/cover.webp'],
  ['kuzhappam.webp', 'arichuvadi/posts/kavithai-15/images/cover.webp'],
  ['annan-thangai.webp', 'arichuvadi/posts/kavithai-16/images/cover.webp'],
  ['nathi.webp', 'arichuvadi/posts/kavithai-17/images/cover.webp'],
  ['neelgirathu_yekkam.webp', 'arichuvadi/posts/kavithai-18/images/cover.webp'],
]);

function cleanText(value) {
  return String(value ?? '').trim();
}

function normalizePath(value) {
  return cleanText(value).replace(/^\/+/, '').replace(/\/+$/, '');
}

function publicUrlFromStoragePath(storagePath) {
  const path = normalizePath(storagePath);
  if (!path) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
}

function storagePathFromValue(value) {
  const input = cleanText(value);
  if (!input) return '';
  if (/^https?:\/\//i.test(input)) {
    try {
      const parsed = new URL(input);
      const prefix = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;
      if (parsed.pathname.startsWith(prefix)) {
        return normalizePath(parsed.pathname.slice(prefix.length));
      }
      return normalizePath(parsed.pathname);
    } catch (_error) {
      return '';
    }
  }
  return normalizePath(input.split('?')[0].split('#')[0]);
}

function fileNameFromPath(storagePath) {
  const path = normalizePath(storagePath);
  return path.split('/').pop() || '';
}

function encodeStoragePath(storagePath) {
  return normalizePath(storagePath)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function listObjects(prefix) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prefix: normalizePath(prefix),
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Could not list ${prefix}: ${response.status} ${details}`);
  }

  return response.json();
}

async function downloadObject(storagePath) {
  const response = await fetch(publicUrlFromStoragePath(storagePath));
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Could not download ${storagePath}: ${response.status} ${details}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function uploadObject(storagePath, body, contentType = 'application/octet-stream') {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodeStoragePath(storagePath)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'x-upsert': 'true',
      'content-type': contentType,
    },
    body,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Could not upload ${storagePath}: ${response.status} ${details}`);
  }
}

async function deleteObject(storagePath) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodeStoragePath(storagePath)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  });

  if (!response.ok && response.status !== 404) {
    const details = await response.text().catch(() => '');
    throw new Error(`Could not delete ${storagePath}: ${response.status} ${details}`);
  }
}

async function copyObject(sourcePath, destinationPath, { deleteSource = true } = {}) {
  const source = normalizePath(sourcePath);
  const destination = normalizePath(destinationPath);
  if (!source || !destination || source === destination) return;

  let body;
  try {
    body = await downloadObject(source);
  } catch (error) {
    if (String(error?.message || '').includes('404')) {
      const probe = await fetch(publicUrlFromStoragePath(destination));
      if (probe.ok) return;
    }
    throw error;
  }
  await uploadObject(destination, body);
  if (deleteSource) {
    await deleteObject(source);
  }
}

async function updateArichuvadiRow(row, nextFolder, nextCoverPath, nextImagePaths) {
  await sql`
    UPDATE arichuvadi
    SET
      storage_folder = ${nextFolder},
      content_path = ${`${nextFolder}/content.md`},
      cover_image_path = ${nextCoverPath},
      image_paths = ${JSON.stringify(nextImagePaths)}::jsonb,
      updated_at = NOW()
    WHERE id = ${row.id} AND kind = 'post'
  `;
}

async function updateLegacyPoemImage(oldFileName, newStoragePath) {
  const publicUrl = publicUrlFromStoragePath(newStoragePath);
  await sql`
    UPDATE ariyin_kavithaigal
    SET image_url = ${publicUrl}
    WHERE image_url LIKE ${`%/${oldFileName}`}
  `;
}

async function migrateUntitledRow(row) {
  const nextFolder = `arichuvadi/posts/${row.slug}`;
  const nextCoverPath = `${nextFolder}/images/cover.webp`;
  const currentFolder = normalizePath(row.storage_folder);
  const sourceCoverPath = storagePathFromValue(row.cover_image_path);
  const sourcePrefix = sourceCoverPath ? sourceCoverPath.replace(/\/cover\.webp$/i, '') : (currentFolder ? `${currentFolder}/images` : '');
  const listed = sourcePrefix ? await listObjects(sourcePrefix) : [];
  const nextImagePaths = [];

  for (const entry of listed) {
    const sourcePath = `${sourcePrefix}/${entry.name}`;
    const destinationPath = `${nextFolder}/images/${entry.name}`;
    await copyObject(sourcePath, destinationPath, { deleteSource: false });
    if (entry.name !== 'cover.webp') {
      nextImagePaths.push(destinationPath);
    }
  }

  await updateArichuvadiRow(row, nextFolder, nextCoverPath, nextImagePaths);
  console.log(`Updated untitled post ${row.id}: ${currentFolder} -> ${nextFolder}`);
}

async function migratePoemRow(row) {
  const nextFolder = `arichuvadi/posts/${row.slug}`;
  const nextCoverPath = `${nextFolder}/images/cover.webp`;
  const sourcePath = storagePathFromValue(row.cover_image_path);
  if (!sourcePath) {
    throw new Error(`Row ${row.id} is missing a usable cover image path.`);
  }

  await copyObject(sourcePath, nextCoverPath, { deleteSource: true });
  await updateArichuvadiRow(row, nextFolder, nextCoverPath, []);

  const oldFileName = fileNameFromPath(sourcePath);
  if (oldFileName) {
    await updateLegacyPoemImage(oldFileName, nextCoverPath);
  }

  console.log(`Moved poem ${row.id} (${row.slug}): ${sourcePath} -> ${nextCoverPath}`);
}

async function main() {
  const rows = await sql`
    SELECT id, slug, title, storage_folder, content_path, cover_image_path, image_paths, category_slug
    FROM arichuvadi
    WHERE kind = 'post'
    ORDER BY id ASC
  `;

  const untitled = rows.find((row) => normalizePath(row.slug) === 'untitled');
  const poems = rows.filter((row) => normalizePath(row.slug).startsWith('kavithai-'));

  if (untitled) {
    await migrateUntitledRow(untitled);
  }

  for (const row of poems) {
    await migratePoemRow(row);
  }

  console.log(`Finished migrating ${poems.length + (untitled ? 1 : 0)} Arichuvadi posts.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
