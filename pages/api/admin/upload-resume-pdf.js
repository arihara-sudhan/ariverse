import { readFile } from 'node:fs/promises';
import { del, put } from '@vercel/blob';
import formidable from 'formidable';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const RESUME_BLOB_PATH = 'ari-resume/resume.pdf';

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
    filter: ({ mimetype }) => mimetype === 'application/pdf' || mimetype === 'application/octet-stream',
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
    const file = files?.pdf?.[0] || files?.pdf;

    if (!file) {
      res.status(400).json({ error: 'No PDF provided.' });
      return;
    }

    const currentUrl = Array.isArray(fields?.currentUrl) ? fields.currentUrl[0] : fields?.currentUrl;
    const fileBuffer = await readFile(file.filepath);
    const blob = await put(RESUME_BLOB_PATH, fileBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'application/pdf',
    });

    const normalizedCurrent = normalizeBlobUrl(currentUrl);
    if (normalizedCurrent && normalizeBlobPath(normalizedCurrent) !== RESUME_BLOB_PATH) {
      try {
        await del(normalizedCurrent, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (_deleteError) {
      }
    }

    res.status(200).json({ pdfUrl: blob.url });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Could not upload resume PDF.' });
  }
}
