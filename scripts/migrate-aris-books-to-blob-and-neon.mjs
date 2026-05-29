import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

const token = process.env.BLOB_READ_WRITE_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is required');
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = neon(databaseUrl);
const seedPath = path.join(process.cwd(), 'data', 'aris-books-seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const GH_API = 'https://api.github.com/repos/arihara-sudhan/arihara-sudhan.github.io/contents/books/covers';

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS aris_books_entries (
      id SERIAL PRIMARY KEY,
      link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
      cover_url TEXT NOT NULL DEFAULT '',
      book_url TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      tag TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`UPDATE profile_links SET href = '/aris-books' WHERE label = 'My Books'`;
  const linkRows = await sql`SELECT id FROM profile_links WHERE label = 'My Books' LIMIT 1`;
  if (!linkRows[0]) throw new Error('Profile link "My Books" not found');
  const linkId = linkRows[0].id;

  const res = await fetch(GH_API, { headers: { 'User-Agent': 'ariverse-migrator' } });
  if (!res.ok) throw new Error(`GitHub contents API failed: ${res.status}`);
  const items = await res.json();
  const pngItems = items.filter((item) => item?.type === 'file' && /\.png$/i.test(item?.name || ''));
  if (pngItems.length === 0) throw new Error('No PNG files found in source folder');

  const coverUrlByName = new Map();
  for (const item of pngItems) {
    const fileRes = await fetch(item.download_url);
    if (!fileRes.ok) throw new Error(`Failed downloading ${item.name}: ${fileRes.status}`);
    const bytes = await fileRes.arrayBuffer();
    const blob = await put(`aris-books/book-covers/${item.name}`, bytes, {
      access: 'public',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'image/png',
    });
    coverUrlByName.set(item.name.toLowerCase(), blob.url);
  }

  const heroName = coverUrlByName.has('langchain.png') ? 'langchain.png' : pngItems[0].name;
  const heroSource = pngItems.find((x) => x.name.toLowerCase() === heroName.toLowerCase()) || pngItems[0];
  const heroBytes = await (await fetch(heroSource.download_url)).arrayBuffer();
  const heroBlob = await put('aris-books/hero.png', heroBytes, {
    access: 'public',
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'image/png',
  });

  await sql`
    INSERT INTO section_heroes (link_id, heading, description, quote, image_url, updated_at)
    VALUES (${linkId}, 'Aris Books', '', '', ${heroBlob.url}, now())
    ON CONFLICT (link_id)
    DO UPDATE SET heading = EXCLUDED.heading, image_url = EXCLUDED.image_url, updated_at = now()
  `;

  await sql`DELETE FROM aris_books_entries WHERE link_id = ${linkId}`;
  for (let i = 0; i < seed.length; i += 1) {
    const row = seed[i];
    const coverName = path.basename(String(row.cover || '')).toLowerCase();
    const coverUrl = coverUrlByName.get(coverName) || '';
    const bookUrl = String(row.url || '').replace('/my-books/', '/aris-books/');
    await sql`
      INSERT INTO aris_books_entries (link_id, cover_url, book_url, name, tag, sort_order)
      VALUES (${linkId}, ${coverUrl}, ${bookUrl}, ${row.name || ''}, ${row.tag || ''}, ${i + 1})
    `;
  }

  console.log(`Uploaded ${coverUrlByName.size} covers to aris-books/book-covers`);
  console.log(`Hero: ${heroBlob.url}`);
  console.log(`Seeded ${seed.length} rows into aris_books_entries`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
