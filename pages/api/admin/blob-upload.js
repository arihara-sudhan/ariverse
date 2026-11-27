import { handleUpload } from '@vercel/blob/client';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';
import {
  IMAGE_MIME_TYPES,
  RESUME_BLOB_MAX_BYTES,
  RESUME_PDF_MIME_TYPES,
} from '../../../lib/uploadPolicy';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const PDF_PATH = new RegExp(`^ari-resume/pending/resume-${UUID}\\.pdf$`, 'i');
const PAGE_PATH = new RegExp(`^ari-resume/pending/pages-${UUID}/page-(?:[1-9]|1[0-9]|20)-${UUID}\\.(?:jpg|png|webp|gif)$`, 'i');

function parseClientPayload(value) {
  try {
    const payload = JSON.parse(String(value || '{}'));
    return payload && typeof payload === 'object' ? payload : {};
  } catch (_error) {
    return {};
  }
}

function getUploadKind(pathname, clientPayload) {
  const payload = parseClientPayload(clientPayload);
  const path = String(pathname || '').trim();
  if (payload.kind === 'resume-pdf' && PDF_PATH.test(path)) return 'resume-pdf';
  if (payload.kind === 'resume-page' && PAGE_PATH.test(path)) return 'resume-page';
  return '';
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '32kb',
    },
  },
};

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
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = getUploadKind(pathname, clientPayload);
        if (!kind) throw new Error('Upload target is not allowed.');
        return {
          addRandomSuffix: false,
          allowOverwrite: false,
          allowedContentTypes: kind === 'resume-pdf' ? RESUME_PDF_MIME_TYPES : IMAGE_MIME_TYPES,
          maximumSizeInBytes: RESUME_BLOB_MAX_BYTES,
          tokenPayload: JSON.stringify({ kind }),
        };
      },
    });
    res.status(200).json(jsonResponse);
  } catch (_error) {
    res.status(400).json({ error: 'Could not authorize the upload.' });
  }
}
