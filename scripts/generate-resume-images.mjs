import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const RESUME_ROOT_DIR = path.join(process.cwd(), 'public', 'generated', 'resume');
const LATEST_MANIFEST_PATH = path.join(RESUME_ROOT_DIR, 'latest.json');
const DEFAULT_RESUME_DOC_URL = 'https://arihara-sudhan.github.io/resume/resume.pdf';

function hashBuffer(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
}

function isPdfBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.subarray(0, 4).toString('utf8') === '%PDF';
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (_error) {
    return null;
  }
}

async function cleanupOldGenerations(rootDir, keepHash) {
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && entry.name !== keepHash)
        .map((entry) => fs.rm(path.join(rootDir, entry.name), { recursive: true, force: true })),
    );
  } catch (_error) {
    // Nothing to clean yet.
  }
}

async function writeLatestManifest({ source, hash, images, totalPages }) {
  await fs.writeFile(
    LATEST_MANIFEST_PATH,
    JSON.stringify(
      {
        source,
        hash,
        totalPages,
        images,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );
}

async function generateResumeImagesFromBuffer({ pdfBuffer, sourceUrl }) {
  const hash = hashBuffer(pdfBuffer);
  const outputDir = path.join(RESUME_ROOT_DIR, hash);
  const manifestPath = path.join(outputDir, 'manifest.json');

  try {
    const existingManifest = await readJson(manifestPath);
    if (Array.isArray(existingManifest?.images) && existingManifest.images.length > 0) {
      await writeLatestManifest({
        source: sourceUrl,
        hash,
        totalPages: existingManifest.images.length,
        images: existingManifest.images,
      });
      await cleanupOldGenerations(RESUME_ROOT_DIR, hash);
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
    JSON.stringify({ source: sourceUrl, hash, totalPages, images, generatedAt: new Date().toISOString() }, null, 2),
    'utf8',
  );
  await writeLatestManifest({ source: sourceUrl, hash, totalPages, images });
  await cleanupOldGenerations(RESUME_ROOT_DIR, hash);

  return images;
}

function getSourceUrl() {
  const arg = process.argv.slice(2).find((item) => item.startsWith('--source='));
  const sourceFromArg = arg ? arg.slice('--source='.length).trim() : '';
  const source = sourceFromArg || process.env.RESUME_PDF_URL || DEFAULT_RESUME_DOC_URL;
  return source.trim();
}

async function main() {
  const sourceUrl = getSourceUrl();
  if (!sourceUrl) {
    throw new Error('A resume PDF URL is required.');
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Resume PDF fetch failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);
  if (!isPdfBuffer(pdfBuffer)) {
    throw new Error('Resume source did not look like a PDF.');
  }

  const images = await generateResumeImagesFromBuffer({ pdfBuffer, sourceUrl });
  console.log(JSON.stringify({ sourceUrl, count: images.length, images }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
