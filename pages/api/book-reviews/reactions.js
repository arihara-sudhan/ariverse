import { addBookReviewEntryLike, listBookReviewEntryReactions } from '../../../lib/adminData';
import { toCleanText, toPositiveInt } from '../../../lib/requestUtils';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const singleEntryId = toPositiveInt(req.query.entryId);
      const many = typeof req.query.entryIds === 'string' ? req.query.entryIds : '';
      const manyIds = many
        .split(',')
        .map((part) => toPositiveInt(part))
        .filter(Boolean);

      const entryIds = singleEntryId ? [singleEntryId] : manyIds;
      if (entryIds.length === 0) {
        res.status(400).json({ error: 'entryId or entryIds is required.' });
        return;
      }

      const reactions = await listBookReviewEntryReactions(entryIds);
      res.status(200).json({ reactions });
      return;
    }

    if (req.method === 'POST') {
      if (!enforceSameOriginWrite(req, res)) {
        return;
      }
      const limit = checkRateLimit(req, 'book-review-reactions', 60, 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }

      const action = toCleanText(req.body?.action, 20).toLowerCase();
      const entryId = toPositiveInt(req.body?.entryId);
      const name = toCleanText(req.body?.name, 80);
      const count = Math.max(1, toPositiveInt(req.body?.count) || 1);

      if (!entryId) {
        res.status(400).json({ error: 'Valid entryId is required.' });
        return;
      }

      if (action === 'like') {
        const result = await addBookReviewEntryLike({ entryId, name, count });
        res.status(200).json({ ok: true, likesCount: result.likesCount || 0 });
        return;
      }

      res.status(400).json({ error: 'Unsupported action.' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
