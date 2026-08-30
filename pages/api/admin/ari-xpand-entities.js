import { isAdminRequest } from '../../../lib/adminAuth';
import {
  createXpandEntity,
  deleteXpandEntity,
  deleteXpandLog,
  updateXpandEntity,
  upsertXpandLog,
} from '../../../lib/ariXpands';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';
import { toCleanText } from '../../../lib/requestUtils';

export default async function handler(req, res) {
  try {
    if (!isAdminRequest(req)) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }
    if (req.method !== 'GET' && !enforceSameOriginWrite(req, res)) return;

    const entityType = toCleanText(req.body?.entityType || req.query?.entityType, 40).toLowerCase();

    if (req.method === 'POST') {
      const limit = checkRateLimit(req, 'admin-ari-xpands-entity-create', 80, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }
      if (entityType === 'log') {
        const log = await upsertXpandLog(req.body || {});
        res.status(201).json({ ok: true, entity: log });
        return;
      }
      const entity = await createXpandEntity(entityType, req.body || {});
      res.status(201).json({ ok: true, entity });
      return;
    }

    if (req.method === 'PATCH') {
      const limit = checkRateLimit(req, 'admin-ari-xpands-entity-update', 120, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }
      if (entityType === 'log') {
        const log = await upsertXpandLog(req.body || {});
        res.status(200).json({ ok: true, entity: log });
        return;
      }
      const entityId = Number(req.body?.id);
      const entity = await updateXpandEntity(entityType, entityId, req.body || {});
      if (!entity) {
        res.status(404).json({ error: 'Entity not found.' });
        return;
      }
      res.status(200).json({ ok: true, entity });
      return;
    }

    if (req.method === 'DELETE') {
      const limit = checkRateLimit(req, 'admin-ari-xpands-entity-delete', 40, 10 * 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }
      const entityId = Number(req.body?.id);
      if (!Number.isInteger(entityId) || entityId <= 0) {
        res.status(400).json({ error: 'Invalid entity id.' });
        return;
      }
      if (entityType === 'log') {
        await deleteXpandLog(entityId, Number(req.body?.xpandId));
      } else {
        await deleteXpandEntity(entityType, entityId);
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Unexpected server error.' });
  }
}
