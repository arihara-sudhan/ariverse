import { isAdminRequest } from '../../../../lib/adminAuth';
import { archiveXpand, deleteXpand, getXpandById, updateXpand } from '../../../../lib/ariXpands';
import { checkRateLimit, enforceSameOriginWrite } from '../../../../lib/security';

export default async function handler(req, res) {
  try {
    const id = Number(req.query?.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid xpand id.' });
      return;
    }

    if (req.method === 'GET') {
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const xpand = await getXpandById(id, { includePrivate: true, includeChildren: true });
      if (!xpand) {
        res.status(404).json({ error: 'Xpand not found.' });
        return;
      }
      res.status(200).json({ xpand });
      return;
    }

    if (req.method === 'PATCH') {
      if (!enforceSameOriginWrite(req, res)) return;
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const limit = checkRateLimit(req, 'admin-ari-xpands-update', 40, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }

      const action = String(req.body?.action || '').trim().toLowerCase();
      const xpand = action === 'archive'
        ? await archiveXpand(id)
        : await updateXpand(id, req.body || {});
      if (!xpand) {
        res.status(404).json({ error: 'Xpand not found.' });
        return;
      }
      res.status(200).json({ ok: true, xpand });
      return;
    }

    if (req.method === 'DELETE') {
      if (!enforceSameOriginWrite(req, res)) return;
      if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }
      const limit = checkRateLimit(req, 'admin-ari-xpands-delete', 12, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }
      const deleted = await deleteXpand(id);
      if (!deleted) {
        res.status(404).json({ error: 'Xpand not found.' });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Unexpected server error.' });
  }
}
