import { isAdminAuthConfigured, isValidAdminPassword, setAdminCookie } from '../../../lib/adminAuth';
import {
  clearRateLimit,
  enforceSameOriginWrite,
  checkRateLimit,
} from '../../../lib/security';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!enforceSameOriginWrite(req, res)) {
    return;
  }
  if (!isAdminAuthConfigured()) {
    res.status(503).json({ error: 'Admin authentication is not configured.' });
    return;
  }
  const password = req.body?.password;
  const validPassword = isValidAdminPassword(password);
  if (validPassword) {
    await clearRateLimit(req, 'admin-login');
    setAdminCookie(res);
    res.status(200).json({ ok: true });
    return;
  }

  const limit = await checkRateLimit(req, 'admin-login', 8, 10 * 60 * 1000);
  if (!limit.ok && limit.storeUnavailable) {
    res.status(503).json({ error: 'Rate limiting is temporarily unavailable. Please try again shortly.' });
    return;
  }
  if (!limit.ok) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((limit.retryAfterMs || 0) / 1000))));
    res.status(429).json({ error: 'Too many login attempts. Please try later.' });
    return;
  }
  res.status(401).json({ error: 'Invalid password.' });
}
