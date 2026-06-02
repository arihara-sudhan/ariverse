import { isAdminRequest } from '../../../lib/adminAuth';
import { getProfileLinkById, getSectionHero, upsertSectionHero } from '../../../lib/adminData';
import { toCleanText } from '../../../lib/requestUtils';
import { enforceSameOriginWrite, isSafePublicHref } from '../../../lib/security';

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!enforceSameOriginWrite(req, res)) {
    return;
  }

  if (req.method === 'GET') {
    const linkId = Number(req.query.linkId);
    if (!Number.isInteger(linkId) || linkId <= 0) {
      res.status(400).json({ error: 'Invalid link id.' });
      return;
    }
    const link = await getProfileLinkById(linkId);
    if (!link) {
      res.status(404).json({ error: 'Section not found.' });
      return;
    }
    const hero = await getSectionHero(linkId, link.label);
    res.status(200).json({ hero });
    return;
  }

  if (req.method === 'PUT') {
    const linkId = Number(req.body?.linkId);
    const heading = toCleanText(req.body?.heading);
    const description = toCleanText(req.body?.description);
    const quote = toCleanText(req.body?.quote);
    const imageUrl = toCleanText(req.body?.imageUrl);
    if (imageUrl && !isSafePublicHref(imageUrl)) {
      res.status(400).json({ error: 'Invalid hero image URL.' });
      return;
    }

    if (!Number.isInteger(linkId) || linkId <= 0) {
      res.status(400).json({ error: 'Invalid link id.' });
      return;
    }
    const link = await getProfileLinkById(linkId);
    if (!link) {
      res.status(404).json({ error: 'Section not found.' });
      return;
    }

    const hero = await upsertSectionHero({
      linkId,
      heading: heading || link.label,
      description,
      quote,
      imageUrl,
    });
    res.status(200).json({ hero });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
