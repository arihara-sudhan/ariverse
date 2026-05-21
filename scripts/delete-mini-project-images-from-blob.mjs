import fs from 'node:fs';
import { del } from '@vercel/blob';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is required');

const text = fs.readFileSync('data/miniProjects.js', 'utf8');
const matches = [...text.matchAll(/https:\/\/nbmpfojwah4n8nms\.public\.blob\.vercel-storage\.com\/assets\/mini-projects\/[^'"\s]+/g)];
const urls = [...new Set(matches.map((m) => m[0]))];

if (urls.length === 0) {
  console.log('No mini-project blob URLs found in data/miniProjects.js');
  process.exit(0);
}

console.log(`Deleting ${urls.length} blob file(s)...`);
await del(urls, { token });
urls.forEach((u) => console.log(`Deleted: ${u}`));
