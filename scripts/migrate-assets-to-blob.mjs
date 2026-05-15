import fs from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is required');

const rootDir = path.join(process.cwd(), 'public', 'assets');
if (!fs.existsSync(rootDir)) throw new Error('public/assets does not exist');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(abs));
    else if (entry.isFile()) files.push(abs);
  }
  return files;
}

async function main() {
  const files = walk(rootDir);
  let uploaded = 0;

  for (const file of files) {
    const rel = path.relative(rootDir, file).replace(/\\/g, '/');
    const blobPath = `assets/${rel}`;
    const body = fs.readFileSync(file);

    const blob = await put(blobPath, body, {
      access: 'public',
      token,
      addRandomSuffix: false,
    });

    uploaded += 1;
    console.log(`${blobPath} -> ${blob.url}`);
  }

  console.log(`Uploaded ${uploaded} asset files to Blob.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
