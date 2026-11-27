import { addContentEntryLike, listContentEntryReactions } from '../../../lib/adminData';
import { toCleanText, toPositiveInt } from '../../../lib/requestUtils';
import { getMutationErrorResponse, MAX_LIKE_BATCH_COUNT, normalizeLikeBatchCount } from '../../../lib/publicMutationPolicy';
import { enforceRateLimit, enforceSameOriginWrite } from '../../../lib/security';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const section = toCleanText(req.query.section, 80).toLowerCase();
      const entryIdsRaw = String(req.query.entryIds || '').split(',').map((value) => toPositiveInt(value)).filter(Boolean);
      if (!section || entryIdsRaw.length === 0) {
        res.status(400).json({ error: 'section and entryIds are required.' });
        return;
      }
      const reactions = await listContentEntryReactions({ sectionKey: section, entryIds: entryIdsRaw });
      res.status(200).json({ reactions });
      return;
    }

    if (req.method === 'POST') {
      if (!enforceSameOriginWrite(req, res)) return;
      if (!(await enforceRateLimit(req, res, 'content-entry-reactions', 60, 60 * 1000))) return;

      const action = toCleanText(req.body?.action, 20).toLowerCase();
      if (action !== 'like') {
        res.status(400).json({ error: 'Unsupported action.' });
        return;
      }

      const section = toCleanText(req.body?.section, 80).toLowerCase();
      const entryId = toPositiveInt(req.body?.entryId);
      const count = normalizeLikeBatchCount(req.body?.count);
      const name = toCleanText(req.body?.name, 80);
      const idempotencyKey = toCleanText(req.body?.idempotencyKey, 120);

      if (!section || !entryId || !count) {
        res.status(400).json({ error: `Valid section, entryId, and count (1-${MAX_LIKE_BATCH_COUNT}) are required.` });
        return;
      }

      const result = await addContentEntryLike({ sectionKey: section, entryId, name, count, idempotencyKey });
      res.status(200).json({
        ok: true,
        likesCount: result.likesCount || 0,
      });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const response = getMutationErrorResponse(error);
    if (response) {
      res.status(response.status).json({ error: response.message });
      return;
    }
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
