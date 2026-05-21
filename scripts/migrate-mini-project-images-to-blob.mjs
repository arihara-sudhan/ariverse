import fs from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';
import sharp from 'sharp';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is required');

const root = process.cwd();
const dataDir = path.join(root, 'data');
const outDir = path.join(root, 'public', 'assets', 'mini-projects');
const dataFile = path.join(root, 'data', 'miniProjects.js');

const mappings = [
  { source: 'genie-phenie.png', target: 'genie-phenie.webp', title: 'Genie-Phenie: An LLM for Gene Screening' },
  { source: 'arachnid-llm.png', target: 'arachnid-llm.webp', title: 'Arachnid LLM: My Very First LLM' },
  { source: 'frog_rl.png', target: 'frog-rl.webp', title: 'Frog Catcher - RL Algorithm' },
  { source: 'angel-fish-3d.png', target: 'angel-fish-3d.webp', title: 'Modeling - Angel Fish: Blender' },
  { source: 'dialect-clacfication.png', target: 'dialect-classification.webp', title: 'Dialect Classification' },
  { source: 'next-word-prediction.png', target: 'next-word-prediction.webp', title: 'Next Word Prediction: Bigram' },
  { source: 'next-word-prediction_tamil.png', target: 'next-word-prediction-tamil.webp', title: 'Next Tamil Word Prediction: Bigram' },
  { source: 'rag-application.png', target: 'rag-application.webp', title: 'RAG Application' },
  { source: 'yolo-object-detection.png', target: 'yolo-object-detection.webp', title: 'Object Detection: YOLO' },
  { source: 'photo-enhancer.png', target: 'photo-enhancer.webp', title: 'Photo Enhancement: AutoEncoder' },
  { source: 'noise-removal.png', target: 'noise-removal.webp', title: 'Noise Removal: AutoEncoder' },
  { source: 'classify-anything.png', target: 'classify-anything.webp', title: 'Classify Anything: Swin Transformer' },
  { source: 'mnist-image-generation.png', target: 'mnist-image-generation.webp', title: 'MNIST Image Generation' },
  { source: 'pterodactyle.png', target: 'pterodactyl.webp', title: 'Modeling - Pterodactyl: Blender' },
  { source: 'fewshot-object-detection.png', target: 'fewshot-object-detection.webp', title: 'Fewshot Object Detection' },
  { source: 'neural-style-transfer.png', target: 'neural-style-transfer.webp', title: 'Neural Style Transfer' },
  { source: 'image-segmentation.png', target: 'image-segmentation.webp', title: 'Image Segmentation: GMM' },
  { source: 'clip-image-text.png', target: 'clip-image-text.webp', title: 'CLIP: Text to Image' },
];

fs.mkdirSync(outDir, { recursive: true });

async function optimize(sourcePath, outPath) {
  await sharp(sourcePath)
    .rotate()
    .webp({ lossless: true, effort: 6 })
    .toFile(outPath);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const uploadedByTitle = new Map();

  for (const item of mappings) {
    const sourcePath = path.join(dataDir, item.source);
    const outPath = path.join(outDir, item.target);

    if (!fs.existsSync(sourcePath)) {
      console.warn(`Skipping missing source: ${item.source}`);
      continue;
    }

    await optimize(sourcePath, outPath);

    const body = fs.readFileSync(outPath);
    const blobPath = `assets/mini-projects/${item.target}`;
    const blob = await put(blobPath, body, {
      access: 'public',
      token,
      addRandomSuffix: false,
    });

    uploadedByTitle.set(item.title, blob.url);

    const inSize = fs.statSync(sourcePath).size;
    const outSize = fs.statSync(outPath).size;
    const savedPct = (((inSize - outSize) / inSize) * 100).toFixed(1);
    console.log(`${item.source} -> ${item.target} | ${(inSize / 1024).toFixed(1)}KB -> ${(outSize / 1024).toFixed(1)}KB (${savedPct}% saved)`);
    console.log(`Blob: ${blob.url}`);
  }

  let text = fs.readFileSync(dataFile, 'utf8');
  for (const [title, url] of uploadedByTitle.entries()) {
    const re = new RegExp(`(title: '${escapeRegExp(title)}',\\s*embedLink: '[^']+',\\s*logo: )'[^']*'`);
    text = text.replace(re, `$1'${url}'`);
  }

  fs.writeFileSync(dataFile, text, 'utf8');
  console.log(`Updated ${uploadedByTitle.size} mini-project logos in data/miniProjects.js`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
