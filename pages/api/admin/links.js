import { isAdminRequest } from '../../../lib/adminAuth';
import { addProfileLink, listProfileLinks, setProfileLinkHidden } from '../../../lib/adminData';

const LINK_CATEGORIES = ['PROFESSIONAL', 'PASSIONAL', 'HOBBYAL'];

function toCleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ links: await listProfileLinks() });
    return;
  }

  if (req.method === 'POST') {
    const label = toCleanText(req.body?.label);
    const href = toCleanText(req.body?.href);
    const category = toCleanText(req.body?.category).toUpperCase();

    if (!label || !href) {
      res.status(400).json({ error: 'Label and URL are required.' });
      return;
    }

    if (!LINK_CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'Category must be PROFESSIONAL, PASSIONAL, or HOBBYAL.' });
      return;
    }

    const link = await addProfileLink({ label, href, category });
    res.status(201).json({ link });
    return;
  }

  if (req.method === 'PATCH') {
    const id = Number(req.body?.id);
    const hidden = Boolean(req.body?.hidden);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid link id.' });
      return;
    }

    await setProfileLinkHidden(id, hidden);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
