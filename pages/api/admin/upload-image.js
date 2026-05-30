import { readFile } from 'node:fs/promises';
import { put } from '@vercel/blob';
import formidable from 'formidable';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: MAX_UPLOAD_BYTES,
    filter: ({ mimetype }) => Boolean(mimetype && ALLOWED_MIME_TO_EXT[mimetype]),
  });
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

function buildBlobPath({ section, title, category, subcategory, baseName, ext }) {
  const sectionFolder = toFolderName(section);
  const titleFolder = toFolderName(title);
  const categoryFolder = toFolderName(category);
  const subcategoryFolder = toFolderName(subcategory);

  // All hero uploads should be a single file directly under the section folder.
  if (titleFolder === 'hero') {
    if (sectionFolder === 'career' || sectionFolder === 'works' || sectionFolder === 'experience') {
      return `projects/hero${ext}`;
    }
    return `${sectionFolder}/hero${ext}`;
  }

  // Career assets follow fixed folders under projects/
  if (sectionFolder === 'career' || sectionFolder === 'works' || sectionFolder === 'experience') {
    const isCompanyLogo = titleFolder.endsWith('-company-logo') || titleFolder.includes('company-logo');
    if (isCompanyLogo) {
      return `projects/company-logos/${baseName}${ext}`;
    }
    return `projects/company-photos/${baseName}${ext}`;
  }

  return `${sectionFolder}/${categoryFolder}/${subcategoryFolder}/${titleFolder}/${baseName}${ext}`;
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!enforceSameOriginWrite(req, res)) {
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

    const ext = ALLOWED_MIME_TO_EXT[file.mimetype] || '.png';
    const section = Array.isArray(fields?.section) ? fields.section[0] : fields?.section;
    const title = Array.isArray(fields?.title) ? fields.title[0] : fields?.title;
    const category = Array.isArray(fields?.category) ? fields.category[0] : fields?.category;
    const subcategory = Array.isArray(fields?.subcategory) ? fields.subcategory[0] : fields?.subcategory;
    const baseName = toFileBaseFromOriginalName(file.originalFilename || '');
    const fileName = buildBlobPath({ section, title, category, subcategory, baseName, ext });

    if (Number(file.size || 0) > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: 'File too large.' });
      return;
    }

    const fileBuffer = await readFile(file.filepath);

    const blob = await put(fileName, fileBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
      contentType: file.mimetype,
    });

    res.status(200).json({ imageUrl: blob.url });
  } catch (_error) {
    res.status(500).json({ error: 'Upload failed.' });
  }
}
