import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';
import { getProfileLinkByLabel, getResumeAssets, upsertResumeAssets } from '../../../lib/adminData';

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!enforceSameOriginWrite(req, res)) return;

  const link = await getProfileLinkByLabel('Resume');
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
      const { pdfUrl, pageImageUrls } = req.body || {};
      const asset = await upsertResumeAssets({
        linkId: link.id,
        pdfUrl: String(pdfUrl || '').trim(),
        pageImageUrls: Array.isArray(pageImageUrls) ? pageImageUrls : [],
      });
      res.status(200).json({ asset });
    } catch (_error) {
      res.status(500).json({ error: 'Could not save resume assets.' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
