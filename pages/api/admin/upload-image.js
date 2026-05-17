import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { put } from '@vercel/blob';
import formidable from 'formidable';
import { isAdminRequest } from '../../../lib/adminAuth';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function toFolderName(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const slug = text
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'uploads';
}

function toFileNameBase(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const slug = text
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `img-${Date.now()}`;
}

function toFileBaseFromOriginalName(fileName) {
  const raw = typeof fileName === 'string' ? fileName : '';
  const base = raw.replace(/\.[^/.]+$/, '');
  return toFileNameBase(base);
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { files, fields } = await parseForm(req);
    const file = files?.image?.[0] || files?.image;

    if (!file) {
      res.status(400).json({ error: 'No image provided.' });
      return;
    }

    const ext = (path.extname(file.originalFilename || '') || '.png').toLowerCase();
    const section = Array.isArray(fields?.section) ? fields.section[0] : fields?.section;
    const title = Array.isArray(fields?.title) ? fields.title[0] : fields?.title;
    const category = Array.isArray(fields?.category) ? fields.category[0] : fields?.category;
    const subcategory = Array.isArray(fields?.subcategory) ? fields.subcategory[0] : fields?.subcategory;
    const folder = toFolderName(section);
    const titleFolder = toFolderName(title);
    const categoryFolder = toFolderName(category);
    const subcategoryFolder = toFolderName(subcategory);
    const baseName = toFileBaseFromOriginalName(file.originalFilename || '');
    const fileName = `${folder}/${categoryFolder}/${subcategoryFolder}/${titleFolder}/${baseName}${ext}`;
    const fileBuffer = await readFile(file.filepath);

    const blob = await put(fileName, fileBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });

    res.status(200).json({ imageUrl: blob.url });
  } catch (_error) {
    res.status(500).json({ error: 'Upload failed.' });
  }
}
