import { isAdminRequest } from '../../../../lib/adminAuth';
import { checkRateLimit, enforceSameOriginWrite } from '../../../../lib/security';
import { deleteArizonePost, getArizoneAdminPostById, updateArizonePost } from '../../../../lib/arizoneAdmin';

export default async function handler(req, res) {
  try {
    const id = req.query?.id;

    if (req.method === 'GET') {
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const post = await getArizoneAdminPostById(id);
      if (!post) {
        res.status(404).json({ error: 'Post not found.' });
        return;
      }
      res.status(200).json({ post });
      return;
    }

    if (req.method === 'PATCH') {
      if (!enforceSameOriginWrite(req, res)) return;
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const limit = checkRateLimit(req, 'admin-arizone-update', 30, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }

      const updated = await updateArizonePost(id, req.body || {});
      if (!updated) {
        res.status(404).json({ error: 'Post not found.' });
        return;
      }

      res.status(200).json({ ok: true, post: updated });
      return;
    }

    if (req.method === 'DELETE') {
      if (!enforceSameOriginWrite(req, res)) return;
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const limit = checkRateLimit(req, 'admin-arizone-delete', 12, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }

      const deleted = await deleteArizonePost(id);
      if (!deleted) {
        res.status(404).json({ error: 'Post not found.' });
        return;
      }

      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
