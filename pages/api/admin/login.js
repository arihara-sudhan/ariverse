import { isValidAdminPassword, setAdminCookie } from '../../../lib/adminAuth';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
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
