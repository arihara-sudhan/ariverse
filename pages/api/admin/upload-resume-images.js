import { readFile } from 'node:fs/promises';
import { del, put } from '@vercel/blob';
import formidable from 'formidable';
import sharp from 'sharp';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
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
    multiples: true,
    maxFiles: 20,
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

function normalizeCurrentUrls(fields) {
  const raw = Array.isArray(fields?.currentUrls) ? fields.currentUrls[0] : fields?.currentUrls;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed.map((url) => String(url || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
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
    const { files, fields } = await parseForm(req);
    const imageFiles = normalizeFiles(files);
    if (imageFiles.length === 0) {
      res.status(400).json({ error: 'No images provided.' });
      return;
    }

    const currentUrls = normalizeCurrentUrls(fields);
    const generationId = toGenerationId();
    const uploadedUrls = [];

    for (let index = 0; index < imageFiles.length; index += 1) {
      const file = imageFiles[index];
      const fileBuffer = await readFile(file.filepath);
      const webpBuffer = await sharp(fileBuffer, { animated: true })
        .webp({ quality: 100, effort: 3 })
        .toBuffer();
      const fileName = `ari-resume/pages/${generationId}/page-${index + 1}.webp`;
      const blob = await put(fileName, webpBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'image/webp',
      });
      uploadedUrls.push(blob.url);
    }

    await Promise.all(
      currentUrls.map(async (url) => {
        try {
          const normalizedUrl = normalizeBlobUrl(url);
          if (!normalizedUrl) return;
          await del(normalizedUrl, {
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
        } catch (_deleteError) {
        }
      }),
    );

    res.status(200).json({ pageImageUrls: uploadedUrls });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Could not upload resume images.' });
  }
}
