import { isAdminRequest } from '../../../lib/adminAuth';
import { listShelfEntries } from '../../../lib/adminData';

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const images = await listShelfEntries();
    res.status(200).json({
      images: images
        .map((item) => ({
          name: String(item.name || '').trim() || 'Untitled',
          subname: String(item.subname || '').trim(),
          url: String(item.imageUrl || '').trim(),
        }))
        .filter((item) => item.url),
    });
  } catch (_error) {
    res.status(500).json({ error: 'Could not load images.' });
  }
}
