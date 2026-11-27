import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceRateLimit, enforceSameOriginWrite } from '../../../lib/security';
import { createArichuvadiCategory, listArichuvadiCategories } from '../../../lib/arichuvadiAdmin';
import { revalidatePublicPaths } from '../../../lib/publicRevalidation';

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
      if (!(await enforceRateLimit(req, res, 'admin-arichuvadi-category-create', 20, 10 * 60 * 1000))) return;

      const created = await createArichuvadiCategory(req.body || {});
      if (!created) {
        res.status(500).json({ error: 'Could not create category.' });
        return;
      }

      const refresh = await revalidatePublicPaths(res, ['/arichuvadi']);
      res.status(201).json({ ok: true, category: created, refresh });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
