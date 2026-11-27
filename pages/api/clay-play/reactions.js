import {
  addClayPlayEntryLike,
  addClayPlayEntryComment,
  listClayPlayEntryReactions,
} from '../../../lib/adminData';
import { toCleanText, toPositiveInt } from '../../../lib/requestUtils';
import { getMutationErrorResponse, MAX_LIKE_BATCH_COUNT, normalizeLikeBatchCount } from '../../../lib/publicMutationPolicy';
import { enforceRateLimit, enforceSameOriginWrite } from '../../../lib/security';

const MAX_BATCH_EVENTS = 25;

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

      const reactions = await listClayPlayEntryReactions(entryIds);
      res.status(200).json({ reactions });
      return;
    }

    if (req.method === 'POST') {
      if (!enforceSameOriginWrite(req, res)) {
        return;
      }
      if (!(await enforceRateLimit(req, res, 'clay-reactions', 60, 60 * 1000))) return;
      const action = toCleanText(req.body?.action, 20).toLowerCase();
      const entryId = toPositiveInt(req.body?.entryId);
      const name = toCleanText(req.body?.name, 80);
      const comment = toCleanText(req.body?.comment, 800);
      const count = normalizeLikeBatchCount(req.body?.count, 1);
      const idempotencyKey = toCleanText(req.body?.idempotencyKey, 120);

      if (action === 'batch') {
        const events = Array.isArray(req.body?.events) ? req.body.events : [];
        if (events.length > MAX_BATCH_EVENTS) {
          res.status(400).json({ error: `Batch size exceeds ${MAX_BATCH_EVENTS}.` });
          return;
        }
        for (const event of events) {
          const eventAction = toCleanText(event?.action, 20).toLowerCase();
          const eventEntryId = toPositiveInt(event?.entryId);
          const eventName = toCleanText(event?.name, 80);
          const eventComment = toCleanText(event?.comment, 800);
          const eventIdempotencyKey = toCleanText(event?.idempotencyKey, 120);
          if (!eventEntryId) continue;

          if (eventAction === 'like') {
            await addClayPlayEntryLike({ entryId: eventEntryId, name: eventName, count: 1, idempotencyKey: eventIdempotencyKey });
            continue;
          }
          if (eventAction === 'comment' && eventComment) {
            await addClayPlayEntryComment({
              entryId: eventEntryId,
              name: eventName,
              comment: eventComment,
            });
          }
        }
        res.status(200).json({ ok: true, processed: events.length });
        return;
      }

      if (!entryId || !count) {
        res.status(400).json({ error: `Valid entryId and count (1-${MAX_LIKE_BATCH_COUNT}) are required.` });
        return;
      }
      if (action === 'like') {
        const result = await addClayPlayEntryLike({ entryId, name, count, idempotencyKey });
        res.status(200).json({ ok: true, likesCount: result.likesCount || 0 });
        return;
      }

      if (action === 'comment') {
        if (!comment) {
          res.status(400).json({ error: 'Comment is required.' });
          return;
        }
        const created = await addClayPlayEntryComment({ entryId, name, comment });
        res.status(201).json({ ok: true, comment: created });
        return;
      }

      res.status(400).json({ error: 'Unsupported action.' });
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
