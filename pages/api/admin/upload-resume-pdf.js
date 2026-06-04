import { readFile } from 'node:fs/promises';
import { del, put } from '@vercel/blob';
import formidable from 'formidable';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

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

function normalizeBlobPath(url) {
  const normalizedUrl = normalizeBlobUrl(url);
  if (!normalizedUrl) return '';
  try {
    return decodeURIComponent(new URL(normalizedUrl).pathname.replace(/^\/+/, ''));
  } catch {
    return '';
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
    const file = files?.pdf?.[0] || files?.file?.[0] || files?.pdf || files?.file;
    if (!file) {
      res.status(400).json({ error: 'No PDF provided.' });
      return;
    }

    const mimeType = String(file.mimetype || '').toLowerCase();
    if (mimeType !== 'application/pdf' && !String(file.originalFilename || '').toLowerCase().endsWith('.pdf')) {
      res.status(400).json({ error: 'Only PDF files are allowed.' });
      return;
    }

    const currentUrl = Array.isArray(fields?.currentUrl) ? fields.currentUrl[0] : fields?.currentUrl;
    const fileName = 'ari-resume/resume.pdf';
    const fileBuffer = await readFile(file.filepath);
    const existingUrl = normalizeBlobUrl(currentUrl);
    if (existingUrl && normalizeBlobPath(existingUrl) !== fileName) {
      try {
        await del(existingUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (_deleteError) {
      }
    }

    const blob = await put(fileName, fileBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/pdf',
    });

    res.status(200).json({ pdfUrl: `${blob.url}?v=${Date.now()}`, storageUrl: blob.url });
  } catch (_error) {
    res.status(500).json({ error: 'Upload failed.' });
  }
}
