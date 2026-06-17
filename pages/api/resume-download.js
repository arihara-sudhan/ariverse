import { getProfileLinkByLabel, getResumeAssets } from '../../lib/adminData';
import { toPublicStorageUrl } from '../../lib/storage';

const RESUME_PDF_FALLBACK_URL = toPublicStorageUrl('ari-resume/resume.pdf');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const link = await getProfileLinkByLabel('Resume');
  if (!link) {
    res.status(404).json({ error: 'Resume section not found.' });
    return;
  }

  const asset = await getResumeAssets(link.id);
  const pdfUrl = String(asset?.pdfUrl || '').trim() || RESUME_PDF_FALLBACK_URL;
  if (!pdfUrl) {
    res.status(404).json({ error: 'No resume PDF has been uploaded yet.' });
    return;
  }

  try {
    const upstream = await fetch(pdfUrl);
    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: 'Could not fetch the resume PDF.' });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'application/pdf';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="Ariharasudhan-Resume.pdf"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buffer);
  } catch (_error) {
    res.status(500).json({ error: 'Could not download the resume PDF.' });
  }
}
