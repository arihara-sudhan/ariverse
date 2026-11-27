import { del } from '@vercel/blob';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';
import { getProfileLinkBySectionKey, getResumeAssets, upsertResumeAssets } from '../../../lib/adminData';

function normalizeBlobUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  try {
    const parsed = new URL(input);
    parsed.search = '';
    parsed.hash = '';
    if (!parsed.hostname.endsWith('.public.blob.vercel-storage.com')) return '';
    return parsed.toString();
  } catch (_error) {
    return '';
  }
}

async function deleteReplacedBlob(url) {
  const normalizedUrl = normalizeBlobUrl(url);
  if (!normalizedUrl) return;
  try {
    await del(normalizedUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (_error) {
    // Cleanup is best effort. The committed metadata remains authoritative.
  }
}

async function deleteReplacedBlobs(previousAsset, nextAsset, field) {
  const previous = field === 'pdfUrl'
    ? [previousAsset?.pdfUrl]
    : (Array.isArray(previousAsset?.pageImageUrls) ? previousAsset.pageImageUrls : []);
  const next = field === 'pdfUrl'
    ? [nextAsset?.pdfUrl]
    : (Array.isArray(nextAsset?.pageImageUrls) ? nextAsset.pageImageUrls : []);
  const nextSet = new Set(next.map((url) => normalizeBlobUrl(url)).filter(Boolean));
  await Promise.all(previous
    .map((url) => normalizeBlobUrl(url))
    .filter((url) => url && !nextSet.has(url))
    .map(deleteReplacedBlob));
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!enforceSameOriginWrite(req, res)) return;

  const link = await getProfileLinkBySectionKey('resume');
  if (!link) {
    res.status(404).json({ error: 'Resume section not found.' });
    return;
  }

  if (req.method === 'GET') {
    const asset = await getResumeAssets(link.id);
    res.status(200).json({ asset });
    return;
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body || {};
      const currentAsset = await getResumeAssets(link.id);
      const hasResumeText = Object.prototype.hasOwnProperty.call(body, 'resumeText');
      const hasPdfUrl = Object.prototype.hasOwnProperty.call(body, 'pdfUrl');
      const hasPageImageUrls = Object.prototype.hasOwnProperty.call(body, 'pageImageUrls');
      const asset = await upsertResumeAssets({
        linkId: link.id,
        resumeText: hasResumeText ? String(body.resumeText || '') : String(currentAsset?.resumeText || ''),
        pdfUrl: hasPdfUrl ? String(body.pdfUrl || '').trim() : String(currentAsset?.pdfUrl || '').trim(),
        pageImageUrls: hasPageImageUrls
          ? Array.isArray(body.pageImageUrls)
            ? body.pageImageUrls
            : []
          : Array.isArray(currentAsset?.pageImageUrls)
            ? currentAsset.pageImageUrls
            : [],
      });
      if (hasPdfUrl) await deleteReplacedBlobs(currentAsset, asset, 'pdfUrl');
      if (hasPageImageUrls) await deleteReplacedBlobs(currentAsset, asset, 'pageImageUrls');
      res.status(200).json({ asset });
    } catch (_error) {
      res.status(500).json({ error: 'Could not save resume assets.' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
