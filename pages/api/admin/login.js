import { isAdminAuthConfigured, isValidAdminPassword, setAdminCookie } from '../../../lib/adminAuth';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';

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
  const limit = checkRateLimit(req, 'admin-login', 8, 10 * 60 * 1000);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(Math.ceil((limit.retryAfterMs || 0) / 1000)));
    res.status(429).json({ error: 'Too many login attempts. Please try later.' });
    return;
  }

  const password = req.body?.password;
  if (!isValidAdminPassword(password)) {
    res.status(401).json({ error: 'Invalid password.' });
    return;
  }

  setAdminCookie(res);
  res.status(200).json({ ok: true });
}
