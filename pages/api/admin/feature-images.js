import { isAdminRequest } from '../../../lib/adminAuth';
import { addFeatureImage, listFeatureImages } from '../../../lib/adminData';
import { enforceSameOriginWrite } from '../../../lib/security';

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ images: await listFeatureImages() });
    return;
  }

  if (!enforceSameOriginWrite(req, res)) {
    return;
  }

  if (req.method === 'POST') {
    const imageUrl = String(req.body?.imageUrl || '').trim();
    if (!imageUrl) {
      res.status(400).json({ error: 'Image URL is required.' });
      return;
    }

    const image = await addFeatureImage({ imageUrl });
    res.status(201).json({ image });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
