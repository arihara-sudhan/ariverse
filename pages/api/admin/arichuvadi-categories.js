import { isAdminRequest } from '../../../lib/adminAuth';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';
import { createArichuvadiCategory, listArichuvadiCategories } from '../../../lib/arichuvadiAdmin';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const categories = await listArichuvadiCategories();
      res.status(200).json({ categories });
      return;
    }

    if (req.method === 'POST') {
      if (!enforceSameOriginWrite(req, res)) return;
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const limit = checkRateLimit(req, 'admin-arichuvadi-category-create', 20, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }

      const created = await createArichuvadiCategory(req.body || {});
      if (!created) {
        res.status(500).json({ error: 'Could not create category.' });
        return;
      }

      res.status(201).json({ ok: true, category: created });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
