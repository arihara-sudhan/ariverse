import { isAdminRequest } from '../../../lib/adminAuth';
import {
  addBinomialItem,
  addLinkItem,
  deleteLinkItem,
  getLinkItemById,
  getProfileLinkByLabel,
  listLinkItems,
  updateLinkItem,
} from '../../../lib/adminData';

function toCleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toImageUrls(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method === 'GET') {
    const linkId = Number(req.query.linkId);
    if (!Number.isInteger(linkId) || linkId <= 0) {
      res.status(400).json({ error: 'Invalid link id.' });
      return;
    }

    res.status(200).json({ items: await listLinkItems(linkId) });
    return;
  }

  if (req.method === 'POST') {
    const linkId = Number(req.body?.linkId);
    const imageUrl = toCleanText(req.body?.imageUrl);
    const youtubeUrl = toCleanText(req.body?.youtubeUrl);
    const markdownText = toCleanText(req.body?.markdownText);
    const kavithaiFrom = toCleanText(req.body?.kavithaiFrom);
    const imageUrls = toImageUrls(req.body?.imageUrls);
    const imageAlign = toCleanText(req.body?.imageAlign).toLowerCase() === 'right' ? 'right' : 'left';
    const binomialLink = await getProfileLinkByLabel('Binomial Names');
    const clayPlayLink = await getProfileLinkByLabel('Clay Play');
    const isBinomial = Boolean(binomialLink && binomialLink.id === linkId);
    const isClayPlay = Boolean(clayPlayLink && clayPlayLink.id === linkId);

    if (!Number.isInteger(linkId) || linkId <= 0 || !markdownText || !kavithaiFrom) {
      res.status(400).json({ error: 'Invalid payload.' });
      return;
    }

    if (isBinomial && !youtubeUrl) {
      res.status(400).json({ error: 'YouTube URL is required.' });
      return;
    }

    if (isClayPlay && imageUrls.length === 0 && !imageUrl) {
      res.status(400).json({ error: 'At least one image is required for Clay Play entries.' });
      return;
    }

    const item = isBinomial
      ? await addBinomialItem({ linkId, name: kavithaiFrom, youtubeUrl, caption: markdownText })
      : await addLinkItem({ linkId, imageUrl, imageUrls, markdownText, kavithaiFrom, imageAlign });
    res.status(201).json({ item });
    return;
  }

  if (req.method === 'PUT') {
    const id = Number(req.body?.id);
    const imageUrl = toCleanText(req.body?.imageUrl);
    const youtubeUrl = toCleanText(req.body?.youtubeUrl);
    const markdownText = toCleanText(req.body?.markdownText);
    const kavithaiFrom = toCleanText(req.body?.kavithaiFrom);
    const imageUrls = toImageUrls(req.body?.imageUrls);
    const imageAlign = toCleanText(req.body?.imageAlign).toLowerCase() === 'right' ? 'right' : 'left';
    const binomialLink = await getProfileLinkByLabel('Binomial Names');
    const clayPlayLink = await getProfileLinkByLabel('Clay Play');
    const existing = await getLinkItemById(id);
    const isBinomial = Boolean(existing && binomialLink && existing.linkId === binomialLink.id);
    const isClayPlay = Boolean(existing && clayPlayLink && existing.linkId === clayPlayLink.id);

    if (!Number.isInteger(id) || id <= 0 || !markdownText || !kavithaiFrom) {
      res.status(400).json({ error: 'Invalid payload.' });
      return;
    }

    if (isBinomial && !youtubeUrl) {
      res.status(400).json({ error: 'YouTube URL is required.' });
      return;
    }

    if (isClayPlay && imageUrls.length === 0 && !imageUrl) {
      res.status(400).json({ error: 'At least one image is required for Clay Play entries.' });
      return;
    }

    await updateLinkItem({ id, imageUrl, imageUrls, youtubeUrl, markdownText, kavithaiFrom, imageAlign });
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const id = Number(req.body?.id);
    const linkId = Number(req.body?.linkId);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid item id.' });
      return;
    }

    await deleteLinkItem(id, Number.isInteger(linkId) && linkId > 0 ? linkId : undefined);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
