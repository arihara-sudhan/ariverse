import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

const databaseUrl = process.env.DATABASE_URL;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

if (!databaseUrl) throw new Error('DATABASE_URL is required');
if (!blobToken) throw new Error('BLOB_READ_WRITE_TOKEN is required');

const sql = neon(databaseUrl);

function slugify(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const slug = text.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'untitled';
}

async function main() {
  const rows = await sql`
    SELECT id, image_url, kavithai_name
    FROM ariyin_kavithaigal
    WHERE TRIM(COALESCE(image_url, '')) <> ''
    ORDER BY id ASC
  `;

  let moved = 0;
  let skipped = 0;

  for (const row of rows) {
    const imageUrl = String(row.image_url || '').trim();

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      skipped += 1;
      continue;
    }

    if (!imageUrl.startsWith('/uploads/')) {
      skipped += 1;
      continue;
    }

    const localPath = path.join(process.cwd(), 'public', imageUrl);
    if (!fs.existsSync(localPath)) {
      console.warn(`Missing file for row ${row.id}: ${localPath}`);
      skipped += 1;
      continue;
    }

    const ext = path.extname(localPath) || '.png';
    const base = slugify(row.kavithai_name);
    const blobPath = `ariyin-kavithaigal/${base}${ext}`;

    const blob = await put(blobPath, fs.readFileSync(localPath), {
      access: 'public',
      token: blobToken,
      addRandomSuffix: true,
      contentType: undefined,
    });

    await sql`UPDATE ariyin_kavithaigal SET image_url = ${blob.url} WHERE id = ${row.id}`;
    moved += 1;
  }

  console.log(`Migrated ${moved} images to Blob. Skipped ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
