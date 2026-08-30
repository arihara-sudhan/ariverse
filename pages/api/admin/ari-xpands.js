import { isAdminRequest } from '../../../lib/adminAuth';
import { createXpand, listXpands } from '../../../lib/ariXpands';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';
import { toCleanText } from '../../../lib/requestUtils';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const xpands = await listXpands({ includePrivate: true });
      res.status(200).json({ xpands });
      return;
    }

    if (req.method === 'POST') {
      if (!enforceSameOriginWrite(req, res)) return;
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const limit = checkRateLimit(req, 'admin-ari-xpands-create', 20, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }

      const title = toCleanText(req.body?.title, 180);
      const visibility = toCleanText(req.body?.visibility, 20).toLowerCase() || 'public';
      if (!title) {
        res.status(400).json({ error: 'Title is required.' });
        return;
      }

      const xpand = await createXpand({
        title,
        visibility,
        status: 'active',
      });
      res.status(201).json({ ok: true, xpand });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Unexpected server error.' });
  }
}
