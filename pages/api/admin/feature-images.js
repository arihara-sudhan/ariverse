import { isAdminRequest } from '../../../lib/adminAuth';
import { addFeatureImage, listFeatureImages } from '../../../lib/adminData';
import { enforceSameOriginWrite } from '../../../lib/security';
import { revalidatePublicPaths } from '../../../lib/publicRevalidation';

export default async function handler(req, res) {
  try {
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
      const refresh = await revalidatePublicPaths(res, ['/']);
      res.status(201).json({ image, refresh });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(503).json({ error: 'Feature images are temporarily unavailable because the database could not be reached.' });
  }
}
