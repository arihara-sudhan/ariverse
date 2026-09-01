import { isAdminAuthConfigured, isValidAdminPassword, setAdminCookie } from '../../../lib/adminAuth';
import {
  clearRateLimit,
  enforceSameOriginWrite,
  getRateLimitStatus,
  incrementRateLimit,
} from '../../../lib/security';

export default function handler(req, res) {
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
    clearRateLimit(req, 'admin-login');
    setAdminCookie(res);
    res.status(200).json({ ok: true });
    return;
  }

  const limit = getRateLimitStatus(req, 'admin-login', 8, 10 * 60 * 1000);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(Math.ceil((limit.retryAfterMs || 0) / 1000)));
    res.status(429).json({ error: 'Too many login attempts. Please try later.' });
    return;
  }

  incrementRateLimit(req, 'admin-login', 8, 10 * 60 * 1000);
  res.status(401).json({ error: 'Invalid password.' });
}
