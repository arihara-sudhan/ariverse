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

const OLD_SLUG = 'untitled';
const NEW_SLUG = 'oyvu-naal';
const OLD_FOLDER = `arichuvadi/posts/${OLD_SLUG}`;
const NEW_FOLDER = `arichuvadi/posts/${NEW_SLUG}`;

function cleanText(value) {
  return String(value ?? '').trim();
}

function normalizePath(value) {
  return cleanText(value).replace(/^\/+/, '').replace(/\/+$/, '');
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
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodeStoragePath(storagePath)}`);
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Could not download ${storagePath}: ${response.status} ${details}`);
  }
  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  };
}

async function uploadObject(storagePath, body, contentType) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodeStoragePath(storagePath)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'x-upsert': 'true',
      'content-type': contentType || 'application/octet-stream',
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

async function copyStoragePath(sourcePath, destinationPath) {
  const source = normalizePath(sourcePath);
  const destination = normalizePath(destinationPath);
  if (!source || !destination) return null;
  if (source === destination) return destination;

  const { body, contentType } = await downloadObject(source);
  await uploadObject(destination, body, contentType);
  await deleteObject(source);
  return destination;
}

async function main() {
  const rows = await sql`
    SELECT id, slug, title, storage_folder, content_path, cover_image_path, image_paths
    FROM arichuvadi
    WHERE kind = 'post' AND slug IN (${OLD_SLUG}, ${NEW_SLUG})
    ORDER BY id ASC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    console.log('No Arichuvadi post found for rename.');
    return;
  }

  const currentSlug = cleanText(row.slug);
  const sourceFolder = normalizePath(row.storage_folder || OLD_FOLDER);
  const destinationFolder = NEW_FOLDER;
  const sourceImagesPrefix = `${sourceFolder}/images`;
  const destinationImagesPrefix = `${destinationFolder}/images`;
  const sourceImages = await listObjects(sourceImagesPrefix);
  const nextImagePaths = [];

  for (const entry of sourceImages) {
    if (!entry?.name || entry.name === 'images' || entry.name === 'cover.webp') continue;
    const sourcePath = `${sourceImagesPrefix}/${entry.name}`;
    const destinationPath = `${destinationImagesPrefix}/${entry.name}`;
    await copyStoragePath(sourcePath, destinationPath);
    nextImagePaths.push(destinationPath);
  }

  await sql`
    UPDATE arichuvadi
    SET
      slug = ${NEW_SLUG},
      storage_folder = ${destinationFolder},
      content_path = ${`${destinationFolder}/content.md`},
      cover_image_path = ${`${destinationFolder}/images/cover.webp`},
      image_paths = ${JSON.stringify(nextImagePaths)}::jsonb,
      updated_at = NOW()
    WHERE id = ${row.id} AND kind = 'post'
  `;

  console.log(`Renamed ${currentSlug} -> ${NEW_SLUG} for row ${row.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
