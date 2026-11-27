import { readFile } from 'node:fs/promises';
import { put } from '@vercel/blob';
import formidable from 'formidable';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';
import { IMAGE_MIME_TYPES, SUPABASE_IMAGE_MAX_BYTES } from '../../../lib/uploadPolicy';

const MAX_UPLOAD_BYTES = SUPABASE_IMAGE_MAX_BYTES;
const ALLOWED_MIME_TO_EXT = Object.fromEntries(IMAGE_MIME_TYPES.map((type) => [
  type,
  type === 'image/jpeg' ? '.jpg' : `.${type.slice('image/'.length)}`,
]));

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  const form = formidable({
    multiples: true,
    maxFiles: 20,
    maxFileSize: MAX_UPLOAD_BYTES,
    maxTotalFileSize: MAX_UPLOAD_BYTES,
    filter: () => true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function normalizeBlobUrl(url) {
  const input = String(url || '').trim();
  if (!input) return '';
  try {
    const parsed = new URL(input);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function toGenerationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeFiles(files) {
  const input = files?.images || files?.image;
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
}

function getFileExtension(file) {
  const mime = String(file?.mimetype || '').trim().toLowerCase();
  if (mime && ALLOWED_MIME_TO_EXT[mime]) {
    return ALLOWED_MIME_TO_EXT[mime];
  }

  const originalName = String(file?.originalFilename || '').trim();
  const match = originalName.match(/\.[^/.]+$/);
  if (match) {
    return match[0].toLowerCase();
  }

  return '.bin';
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!enforceSameOriginWrite(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { files } = await parseForm(req);
    const imageFiles = normalizeFiles(files);
    if (imageFiles.length === 0) {
      res.status(400).json({ error: 'No images provided.' });
      return;
    }
    const unsupported = imageFiles.find((file) => !ALLOWED_MIME_TO_EXT[String(file.mimetype || '').trim().toLowerCase()]);
    if (unsupported) {
      res.status(415).json({ error: 'Unsupported résumé page image type. Use JPEG, PNG, WebP, or GIF.' });
      return;
    }

    const generationId = toGenerationId();
    const uploadedUrls = [];

    for (let index = 0; index < imageFiles.length; index += 1) {
      const file = imageFiles[index];
      const fileBuffer = await readFile(file.filepath);
      const outputExt = getFileExtension(file);
      const fileName = `ari-resume/pages/${generationId}/page-${index + 1}${outputExt}`;
      const blob = await put(fileName, fileBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: file.mimetype || 'application/octet-stream',
      });
      uploadedUrls.push(blob.url);
    }

    res.status(200).json({ pageImageUrls: uploadedUrls });
  } catch (error) {
    if (error?.code === 'ETOOBIG' || error?.httpCode === 413) {
      res.status(413).json({ error: 'This legacy batch route accepts at most 4 MiB total. Use the admin direct-upload flow for résumé pages up to 20 MiB each.' });
      return;
    }
    res.status(500).json({ error: 'Could not upload resume images.' });
  }
}
