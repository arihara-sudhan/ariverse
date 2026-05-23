import { clearAdminCookie } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!enforceSameOriginWrite(req, res)) {
    return;
  }

  clearAdminCookie(res);
  res.status(200).json({ ok: true });
}
