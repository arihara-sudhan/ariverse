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
import { toCleanText, toCleanTextArray } from '../../../lib/requestUtils';
import { enforceSameOriginWrite, isAllowedYouTubeUrl, isSafePublicHref } from '../../../lib/security';

function toImageUrls(value) {
  return toCleanTextArray(value);
}

function toTagNames(value) {
  return toCleanTextArray(value);
}

function isValidBooksCategory(category) {
  return category === 'ENGLISH' || category === 'TAMIL';
}

function isValidBooksSubcategory(category, subcategory) {
  if (category === 'ENGLISH') return subcategory === 'FICTION' || subcategory === 'NON_FICTION';
  if (category === 'TAMIL') return subcategory === 'புனைவு' || subcategory === 'புனைவிலி';
  return false;
}

async function getSpecialLinkIds() {
  const [binomialLink, clayPlayLink, booksReadLink] = await Promise.all([
    getProfileLinkByLabel('Binomial Names'),
    getProfileLinkByLabel('Clay Play'),
    getProfileLinkByLabel('Books Read'),
  ]);
  return {
    binomialId: binomialLink?.id || null,
    clayPlayId: clayPlayLink?.id || null,
    booksReadId: booksReadLink?.id || null,
  };
}

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

    res.status(200).json({ items: await listLinkItems(linkId) });
    return;
  }

  if (req.method === 'POST') {
    const linkId = Number(req.body?.linkId);
    const imageUrl = toCleanText(req.body?.imageUrl);
    const companyLogoUrl = toCleanText(req.body?.companyLogoUrl);
    const youtubeUrl = toCleanText(req.body?.youtubeUrl);
    const markdownText = toCleanText(req.body?.markdownText);
    const bigDescription = toCleanText(req.body?.bigDescription);
    const projectTags = toTagNames(req.body?.projectTags);
    const kavithaiFrom = toCleanText(req.body?.kavithaiFrom);
    const subtitle = toCleanText(req.body?.subtitle);
    const dateText = toCleanText(req.body?.dateText);
    const category = toCleanText(req.body?.category);
    const booksCategory = category.toUpperCase();
    const subcategory = toCleanText(req.body?.subcategory);
    const imageUrls = toImageUrls(req.body?.imageUrls);
    const imageAlign = toCleanText(req.body?.imageAlign).toLowerCase() === 'right' ? 'right' : 'left';
    const specialIds = await getSpecialLinkIds();
    const isBinomial = Boolean(specialIds.binomialId && specialIds.binomialId === linkId);
    const isClayPlay = Boolean(specialIds.clayPlayId && specialIds.clayPlayId === linkId);
    const isBooksRead = Boolean(specialIds.booksReadId && specialIds.booksReadId === linkId);

    if (!Number.isInteger(linkId) || linkId <= 0 || !markdownText || !kavithaiFrom) {
      res.status(400).json({ error: 'Invalid payload.' });
      return;
    }

    if (isBinomial && !youtubeUrl) {
      res.status(400).json({ error: 'YouTube URL is required.' });
      return;
    }
    if (isBinomial && !isAllowedYouTubeUrl(youtubeUrl)) {
      res.status(400).json({ error: 'Invalid YouTube URL.' });
      return;
    }
    if (imageUrl && !isSafePublicHref(imageUrl)) {
      res.status(400).json({ error: 'Invalid image URL.' });
      return;
    }
    if (companyLogoUrl && !isSafePublicHref(companyLogoUrl)) {
      res.status(400).json({ error: 'Invalid company logo URL.' });
      return;
    }
    if (imageUrls.some((url) => !isSafePublicHref(url))) {
      res.status(400).json({ error: 'Invalid image URL list.' });
      return;
    }

    if (isClayPlay && imageUrls.length === 0 && !imageUrl) {
      res.status(400).json({ error: 'At least one image is required for Clay Play entries.' });
      return;
    }
    if (isBooksRead && !imageUrl) {
      res.status(400).json({ error: 'Cover image is required for Books Read entries.' });
      return;
    }
    if (isBooksRead && (!isValidBooksCategory(booksCategory) || !isValidBooksSubcategory(booksCategory, subcategory))) {
      res.status(400).json({ error: 'Invalid category/subcategory for Books Read.' });
      return;
    }

    const item = isBinomial
      ? await addBinomialItem({ linkId, name: kavithaiFrom, youtubeUrl, caption: markdownText })
      : await addLinkItem({
          linkId,
          imageUrl,
          imageUrls,
          companyLogoUrl,
          youtubeUrl,
          markdownText,
          bigDescription,
          projectTags,
          kavithaiFrom,
          subtitle,
          dateText,
          imageAlign,
          category: isBooksRead ? booksCategory : category,
          subcategory,
        });
    res.status(201).json({ item });
    return;
  }

  if (req.method === 'PUT') {
    const id = Number(req.body?.id);
    const linkId = Number(req.body?.linkId);
    const imageUrl = toCleanText(req.body?.imageUrl);
    const companyLogoUrl = toCleanText(req.body?.companyLogoUrl);
    const youtubeUrl = toCleanText(req.body?.youtubeUrl);
    const markdownText = toCleanText(req.body?.markdownText);
    const bigDescription = toCleanText(req.body?.bigDescription);
    const projectTags = toTagNames(req.body?.projectTags);
    const kavithaiFrom = toCleanText(req.body?.kavithaiFrom);
    const subtitle = toCleanText(req.body?.subtitle);
    const dateText = toCleanText(req.body?.dateText);
    const category = toCleanText(req.body?.category);
    const booksCategory = category.toUpperCase();
    const subcategory = toCleanText(req.body?.subcategory);
    const imageUrls = toImageUrls(req.body?.imageUrls);
    const imageAlign = toCleanText(req.body?.imageAlign).toLowerCase() === 'right' ? 'right' : 'left';
    const specialIds = await getSpecialLinkIds();
    const existing = await getLinkItemById(id, Number.isInteger(linkId) && linkId > 0 ? linkId : undefined);
    const isBinomial = Boolean(existing && specialIds.binomialId && existing.linkId === specialIds.binomialId);
    const isClayPlay = Boolean(existing && specialIds.clayPlayId && existing.linkId === specialIds.clayPlayId);
    const isBooksRead = Boolean(existing && specialIds.booksReadId && existing.linkId === specialIds.booksReadId);

    if (!Number.isInteger(id) || id <= 0 || !markdownText || !kavithaiFrom) {
      res.status(400).json({ error: 'Invalid payload.' });
      return;
    }

    if (isBinomial && !youtubeUrl) {
      res.status(400).json({ error: 'YouTube URL is required.' });
      return;
    }
    if (isBinomial && !isAllowedYouTubeUrl(youtubeUrl)) {
      res.status(400).json({ error: 'Invalid YouTube URL.' });
      return;
    }
    if (imageUrl && !isSafePublicHref(imageUrl)) {
      res.status(400).json({ error: 'Invalid image URL.' });
      return;
    }
    if (companyLogoUrl && !isSafePublicHref(companyLogoUrl)) {
      res.status(400).json({ error: 'Invalid company logo URL.' });
      return;
    }
    if (imageUrls.some((url) => !isSafePublicHref(url))) {
      res.status(400).json({ error: 'Invalid image URL list.' });
      return;
    }

    if (isClayPlay && imageUrls.length === 0 && !imageUrl) {
      res.status(400).json({ error: 'At least one image is required for Clay Play entries.' });
      return;
    }
    if (isBooksRead && !imageUrl) {
      res.status(400).json({ error: 'Cover image is required for Books Read entries.' });
      return;
    }
    if (isBooksRead && (!isValidBooksCategory(booksCategory) || !isValidBooksSubcategory(booksCategory, subcategory))) {
      res.status(400).json({ error: 'Invalid category/subcategory for Books Read.' });
      return;
    }

    await updateLinkItem({
      id,
      linkId: Number.isInteger(linkId) && linkId > 0 ? linkId : existing?.linkId,
      imageUrl,
      imageUrls,
      companyLogoUrl,
      youtubeUrl,
      markdownText,
      bigDescription,
      projectTags,
      kavithaiFrom,
      subtitle,
      dateText,
      imageAlign,
      category: isBooksRead ? booksCategory : category,
      subcategory,
    });
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
