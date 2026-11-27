import { isAdminRequest } from '../../../../lib/adminAuth';
import { enforceRateLimit, enforceSameOriginWrite } from '../../../../lib/security';
import { deleteArichuvadiCategory, getArichuvadiCategoryById, updateArichuvadiCategory } from '../../../../lib/arichuvadiAdmin';
import { revalidatePublicPaths } from '../../../../lib/publicRevalidation';

export default async function handler(req, res) {
  try {
    const id = req.query?.id;

    if (req.method === 'GET') {
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const category = await getArichuvadiCategoryById(id);
      if (!category) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }
      res.status(200).json({ category });
      return;
    }

    if (req.method === 'PATCH') {
      if (!enforceSameOriginWrite(req, res)) return;
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      if (!(await enforceRateLimit(req, res, 'admin-arichuvadi-category-update', 30, 10 * 60 * 1000))) return;

      const updated = await updateArichuvadiCategory(id, req.body || {});
      if (!updated) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }

      const refresh = await revalidatePublicPaths(res, ['/arichuvadi']);
      res.status(200).json({ ok: true, category: updated, refresh });
      return;
    }

    if (req.method === 'DELETE') {
      if (!enforceSameOriginWrite(req, res)) return;
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      if (!(await enforceRateLimit(req, res, 'admin-arichuvadi-category-delete', 12, 10 * 60 * 1000))) return;

      const deleted = await deleteArichuvadiCategory(id);
      if (!deleted) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }

      const refresh = await revalidatePublicPaths(res, ['/arichuvadi']);
      res.status(200).json({ ok: true, refresh });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
