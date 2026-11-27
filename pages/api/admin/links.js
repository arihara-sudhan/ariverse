import { isAdminRequest } from '../../../lib/adminAuth';
import { addProfileLink, getProfileLinkById, listProfileLinks, setProfileLinkHidden, updateProfileLinkLabel } from '../../../lib/adminData';
import { toCleanText } from '../../../lib/requestUtils';
import { enforceSameOriginWrite, isSafePublicHref } from '../../../lib/security';
import { publicPathsForProfileLink, revalidatePublicPaths } from '../../../lib/publicRevalidation';

const LINK_CATEGORIES = ['PROFESSIONAL', 'PASSIONAL', 'HOBBYAL'];

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!enforceSameOriginWrite(req, res)) {
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ links: await listProfileLinks() });
    return;
  }

  if (req.method === 'POST') {
    const label = toCleanText(req.body?.label);
    const href = toCleanText(req.body?.href);
    const sectionKey = toCleanText(req.body?.sectionKey);
    const category = toCleanText(req.body?.category).toUpperCase();

    if (!label || !href) {
      res.status(400).json({ error: 'Label and URL are required.' });
      return;
    }
    if (!isSafePublicHref(href)) {
      res.status(400).json({ error: 'URL must be relative path or HTTPS URL.' });
      return;
    }

    if (!LINK_CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'Category must be PROFESSIONAL, PASSIONAL, or HOBBYAL.' });
      return;
    }

    const link = await addProfileLink({ label, href, category, sectionKey });
    const refresh = await revalidatePublicPaths(res, publicPathsForProfileLink(link));
    res.status(201).json({ link, refresh });
    return;
  }

  if (req.method === 'PATCH') {
    const id = Number(req.body?.id);
    const hasLabel = typeof req.body?.label === 'string';
    const hasHidden = typeof req.body?.hidden !== 'undefined';
    const hidden = Boolean(req.body?.hidden);

    if (!Number.isInteger(id) || id <= 0 || (!hasLabel && !hasHidden)) {
      res.status(400).json({ error: 'Invalid link id.' });
      return;
    }

    const previousLink = await getProfileLinkById(id);
    let link = previousLink;
    if (hasLabel) {
      const label = toCleanText(req.body.label);
      if (!label) {
        res.status(400).json({ error: 'Label is required.' });
        return;
      }
      link = await updateProfileLinkLabel(id, label);
    }
    if (hasHidden) {
      await setProfileLinkHidden(id, hidden);
      link = await getProfileLinkById(id);
    }
    const refresh = await revalidatePublicPaths(res, publicPathsForProfileLink(link || previousLink));
    res.status(200).json({ ok: true, link, refresh });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
