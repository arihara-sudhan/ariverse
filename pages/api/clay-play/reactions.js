import {
  addClayPlayEntryLike,
  addClayPlayEntryComment,
  listClayPlayEntryReactions,
} from '../../../lib/adminData';

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toCleanText(value, maxLen = 800) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

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
      const action = toCleanText(req.body?.action, 20).toLowerCase();
      const entryId = toPositiveInt(req.body?.entryId);
      const name = toCleanText(req.body?.name, 80);
      const comment = toCleanText(req.body?.comment, 800);

      if (action === 'batch') {
        const events = Array.isArray(req.body?.events) ? req.body.events : [];
        for (const event of events) {
          const eventAction = toCleanText(event?.action, 20).toLowerCase();
          const eventEntryId = toPositiveInt(event?.entryId);
          const eventName = toCleanText(event?.name, 80);
          const eventComment = toCleanText(event?.comment, 800);
          if (!eventEntryId) continue;

          if (eventAction === 'like') {
            await addClayPlayEntryLike({ entryId: eventEntryId, name: eventName });
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

      if (!entryId) {
        res.status(400).json({ error: 'Valid entryId is required.' });
        return;
      }
      if (action === 'like') {
        const result = await addClayPlayEntryLike({ entryId, name });
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
    res.status(500).json({ error: error?.message || 'Unexpected server error.' });
  }
}
