import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { list } from '@vercel/blob';

loadEnv({ path: path.join(process.cwd(), '.env') });

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  throw new Error('BLOB_READ_WRITE_TOKEN is required');
}

const outputArg = process.argv[2];
const prefixArg = process.argv[3];
const outputRoot = path.resolve(process.cwd(), outputArg || 'blob-download');
const prefix = typeof prefixArg === 'string' && prefixArg.trim() ? prefixArg.trim() : undefined;

function toSafeRelativePath(value) {
  const input = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
  let normalized = path.posix.normalize(input);
  normalized = normalized.replace(/\/uploads\/uploads\//g, '/uploads/');
  if (normalized.startsWith('assets/mini-projects/')) {
    normalized = normalized.replace(/^assets\/mini-projects\//, 'mini-projects/');
  }
  if (!normalized || normalized === '.' || normalized.startsWith('..') || normalized.includes('/../')) {
    return null;
  }
  return normalized;
}

async function ensureDirectory(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function downloadBlob(blob) {
  const relativePath = toSafeRelativePath(blob.pathname);
  if (!relativePath) {
    console.warn(`Skipping unsafe pathname: ${blob.pathname}`);
    return { skipped: true, bytes: 0 };
  }

  const targetPath = path.join(outputRoot, ...relativePath.split('/'));
  const targetDir = path.dirname(targetPath);
  await ensureDirectory(targetDir);

  const response = await fetch(blob.url);
  if (!response.ok) {
    throw new Error(`Failed to download ${blob.url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(targetPath, buffer);
  return { skipped: false, bytes: buffer.length };
}

async function main() {
  await ensureDirectory(outputRoot);
  let cursor;
  let page = 0;
  let totalFiles = 0;
  let totalBytes = 0;

  while (true) {
    page += 1;
    const result = await list({
      token,
      cursor,
      limit: 1000,
      prefix,
    });

    const blobs = Array.isArray(result.blobs) ? result.blobs : [];
    for (const blob of blobs) {
      const downloadResult = await downloadBlob(blob);
      if (!downloadResult.skipped) {
        totalFiles += 1;
        totalBytes += downloadResult.bytes;
      }
    }

    if (!result.hasMore || !result.cursor) break;
    cursor = result.cursor;
  }

  console.log(`Downloaded ${totalFiles} files (${totalBytes} bytes) to: ${outputRoot}`);
  if (prefix) {
    console.log(`Prefix used: ${prefix}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
