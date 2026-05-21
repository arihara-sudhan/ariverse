import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { put } from '@vercel/blob';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is required');

const dataDir = path.join(process.cwd(), 'data');
const miniProjectsFile = path.join(dataDir, 'miniProjects.js');
if (!fs.existsSync(miniProjectsFile)) throw new Error('data/miniProjects.js does not exist');

const titleByPngName = {
  'angel-fish-3d.png': 'Modeling - Angel Fish: Blender',
  'arachnid-llm.png': 'Arachnid LLM: My Very First LLM',
  'classify-anything.png': 'Classify Anything: Swin Transformer',
  'clip-image-text.png': 'CLIP: Text to Image',
  'dialect-clacfication.png': 'Dialect Classification',
  'fewshot-object-detection.png': 'Fewshot Object Detection',
  'frog_rl.png': 'Frog Catcher - RL Algorithm',
  'genie-phenie.png': 'Genie-Phenie: An LLM for Gene Screening',
  'image-segmentation.png': 'Image Segmentation: GMM',
  'mnist-image-generation.png': 'MNIST Image Generation',
  'neural-style-transfer.png': 'Neural Style Transfer',
  'next-word-prediction.png': 'Next Word Prediction: Bigram',
  'next-word-prediction_tamil.png': 'Next Tamil Word Prediction: Bigram',
  'noise-removal.png': 'Noise Removal: AutoEncoder',
  'photo-enhancer.png': 'Photo Enhancement: AutoEncoder',
  'pterodactyle.png': 'Modeling - Pterodactyl: Blender',
  'rag-application.png': 'RAG Application',
  'yolo-object-detection.png': 'Object Detection: YOLO',
};

async function optimizePngLossless(filePath) {
  const input = fs.readFileSync(filePath);
  const output = await sharp(input)
    .png({
      compressionLevel: 9,
      effort: 10,
      adaptiveFiltering: true,
      force: true,
    })
    .toBuffer();

  return output.length < input.length ? output : input;
}

async function main() {
  const pngFiles = fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => entry.name)
    .sort();

  const replacements = new Map();
  let totalBefore = 0;
  let totalAfter = 0;

  for (const fileName of pngFiles) {
    const title = titleByPngName[fileName];
    if (!title) continue;

    const absPath = path.join(dataDir, fileName);
    const original = fs.readFileSync(absPath);
    const optimized = await optimizePngLossless(absPath);
    const blobPath = `assets/mini-projects/${fileName}`;
    const blob = await put(blobPath, optimized, {
      access: 'public',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'image/png',
    });

    totalBefore += original.length;
    totalAfter += optimized.length;
    replacements.set(title, blob.url);
    console.log(`${fileName}: ${original.length} -> ${optimized.length} bytes`);
    console.log(`${blobPath} -> ${blob.url}`);
  }

  const source = fs.readFileSync(miniProjectsFile, 'utf8');
  const updated = source.replace(
    /title:\s*'([^']+)'\s*,\s*embedLink:\s*'([^']+)'\s*,\s*logo:\s*'([^']+)'/g,
    (match, title, embedLink, logo) => {
      if (!replacements.has(title)) return match;
      const nextLogo = replacements.get(title);
      return `title: '${title}', embedLink: '${embedLink}', logo: '${nextLogo}'`;
    },
  );

  fs.writeFileSync(miniProjectsFile, updated);
  console.log(`Updated ${replacements.size} mini-project logo URLs in data/miniProjects.js`);
  console.log(`Total bytes: ${totalBefore} -> ${totalAfter} (saved ${totalBefore - totalAfter})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
