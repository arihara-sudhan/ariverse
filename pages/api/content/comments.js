import { addContentComment, deleteContentComment, listContentComments } from '../../../lib/adminData';
import { isAdminRequest } from '../../../lib/adminAuth';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';

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
      const section = toCleanText(req.query.section, 80).toLowerCase();
      const entryId = toPositiveInt(req.query.entryId);
      if (!section || !entryId) {
        res.status(400).json({ error: 'section and entryId are required.' });
        return;
      }
      const comments = await listContentComments({ sectionKey: section, entryId });
      res.status(200).json({ comments });
      return;
    }

    if (req.method === 'POST') {
      if (!enforceSameOriginWrite(req, res)) return;
      const limit = checkRateLimit(req, 'content-comments', 60, 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }
      const action = toCleanText(req.body?.action, 20).toLowerCase();
      if (action !== 'comment') {
        res.status(400).json({ error: 'Unsupported action.' });
        return;
      }
      const section = toCleanText(req.body?.section, 80).toLowerCase();
      const entryId = toPositiveInt(req.body?.entryId);
      const name = toCleanText(req.body?.name, 80);
      const comment = toCleanText(req.body?.comment, 800);
      const parentCommentId = toPositiveInt(req.body?.parentCommentId);
      if (!section || !entryId || !comment) {
        res.status(400).json({ error: 'Valid section, entryId, and comment are required.' });
        return;
      }
      const created = await addContentComment({
        sectionKey: section,
        entryId,
        name,
        comment,
        parentCommentId,
      });
      res.status(201).json({ ok: true, comment: created });
      return;
    }

    if (req.method === 'DELETE') {
      if (!isAdminRequest(req)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (!enforceSameOriginWrite(req, res)) return;
      const section = toCleanText(req.body?.section, 80).toLowerCase();
      const entryId = toPositiveInt(req.body?.entryId);
      const commentId = toPositiveInt(req.body?.commentId);
      if (!section || !entryId || !commentId) {
        res.status(400).json({ error: 'Valid section, entryId, and commentId are required.' });
        return;
      }
      await deleteContentComment({ sectionKey: section, entryId, commentId });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
