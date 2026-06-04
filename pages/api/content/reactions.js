import { addContentEntryLike, listContentEntryReactions } from '../../../lib/adminData';
import { toCleanText, toPositiveInt } from '../../../lib/requestUtils';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';

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
      const limit = checkRateLimit(req, 'content-entry-reactions', 60, 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }

      const action = toCleanText(req.body?.action, 20).toLowerCase();
      if (action !== 'like') {
        res.status(400).json({ error: 'Unsupported action.' });
        return;
      }

      const section = toCleanText(req.body?.section, 80).toLowerCase();
      const entryId = toPositiveInt(req.body?.entryId);
      const count = toPositiveInt(req.body?.count);
      const name = toCleanText(req.body?.name, 80);

      if (!section || !entryId || !count) {
        res.status(400).json({ error: 'Valid section, entryId, and count are required.' });
        return;
      }

      const result = await addContentEntryLike({ sectionKey: section, entryId, name, count });
      res.status(200).json({ ok: true, likesCount: result.likesCount || 0 });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
