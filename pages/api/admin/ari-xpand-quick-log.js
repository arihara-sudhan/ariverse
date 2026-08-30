import { isAdminRequest } from '../../../lib/adminAuth';
import { applyQuickLog } from '../../../lib/ariXpands';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';
import { toCleanText } from '../../../lib/requestUtils';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    if (!enforceSameOriginWrite(req, res)) return;
    if (!isAdminRequest(req)) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }
    const limit = checkRateLimit(req, 'admin-ari-xpands-quick-log', 60, 10 * 60 * 1000);
    if (!limit.ok) {
      res.status(429).json({ error: 'Too many requests. Please try later.' });
      return;
    }

    const xpandId = Number(req.body?.xpandId);
    const input = typeof req.body?.input === 'string' ? req.body.input : '';
    const visibility = toCleanText(req.body?.visibility, 20).toLowerCase() || 'public';

    const result = await applyQuickLog({ xpandId, input, visibility });
    if (!result.ok) {
      res.status(400).json({ error: 'Quick log validation failed.', errors: result.errors || [] });
      return;
    }

    res.status(200).json({ ok: true, log: result.log, commands: result.commands });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Unexpected server error.' });
  }
}
