import { readFile } from 'node:fs/promises';
import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import formidable from 'formidable';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';
import { SUPABASE_IMAGE_MAX_BYTES } from '../../../lib/uploadPolicy';

const MAX_UPLOAD_BYTES = SUPABASE_IMAGE_MAX_BYTES;

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
    const file = files?.pdf?.[0] || files?.pdf;

    if (!file) {
      res.status(400).json({ error: 'No PDF provided.' });
      return;
    }
    if (file.mimetype !== 'application/pdf' && file.mimetype !== 'application/octet-stream') {
      res.status(415).json({ error: 'Unsupported résumé file type. Choose a PDF file.' });
      return;
    }

    const fileBuffer = await readFile(file.filepath);
    const blob = await put(`ari-resume/pending/resume-${randomUUID()}.pdf`, fileBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: false,
      contentType: 'application/pdf',
    });

    res.status(200).json({ pdfUrl: blob.url });
  } catch (error) {
    if (error?.code === 'ETOOBIG' || error?.httpCode === 413) {
      res.status(413).json({ error: 'File too large for this legacy route. Use the admin direct-upload flow for résumé PDFs up to 20 MiB.' });
      return;
    }
    res.status(500).json({ error: 'Could not upload resume PDF.' });
  }
}
