import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function hashBuffer(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function cleanupOldGenerations(rootDir, keepHash) {
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.name !== keepHash)
        .map((entry) => fs.rm(path.join(rootDir, entry.name), { recursive: true, force: true })),
    );
  } catch (_error) {
    // Nothing to clean yet.
  }
}

export async function ensureResumeImages(pdfUrl) {
  if (!pdfUrl || typeof pdfUrl !== 'string') return [];
  const trimmedUrl = pdfUrl.trim();
  if (!trimmedUrl.toLowerCase().includes('.pdf')) return [];

  const rootDir = path.join(process.cwd(), 'public', 'generated', 'resume');

  const response = await fetch(trimmedUrl);
  if (!response.ok) throw new Error(`Resume PDF fetch failed: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);
  const hash = hashBuffer(pdfBuffer);
  const outputDir = path.join(rootDir, hash);
  const manifestPath = path.join(outputDir, 'manifest.json');

  try {
    const existingManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    if (Array.isArray(existingManifest?.images) && existingManifest.images.length > 0) {
      await cleanupOldGenerations(rootDir, hash);
      return existingManifest.images;
    }
  } catch (_error) {
    // Missing or malformed manifest; regenerate below.
  }

  const pdfPath = path.join(outputDir, 'source.pdf');

  await ensureDir(outputDir);
  await fs.writeFile(pdfPath, pdfBuffer);

  const outputPrefix = path.join(outputDir, 'page');
  await execFileAsync('pdftoppm', ['-png', '-r', '180', pdfPath, outputPrefix], { windowsHide: true });

  const generated = await fs.readdir(outputDir);
  const pageFiles = generated
    .filter((name) => /^page-\d+\.png$/i.test(name))
    .sort((a, b) => {
      const aNum = Number((a.match(/\d+/) || ['0'])[0]);
      const bNum = Number((b.match(/\d+/) || ['0'])[0]);
      return aNum - bNum;
    });
  const images = pageFiles.map((fileName) => `/generated/resume/${hash}/${fileName}`);
  const totalPages = images.length;
  if (totalPages <= 0) return [];

  await fs.writeFile(
    manifestPath,
    JSON.stringify({ source: trimmedUrl, totalPages, images, generatedAt: new Date().toISOString() }, null, 2),
    'utf8',
  );
  await cleanupOldGenerations(rootDir, hash);

  return images;
}
