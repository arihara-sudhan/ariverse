import {
  addProjectComment,
  deleteProjectComment,
  listProjectComments,
} from '../../../lib/adminData';
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
      const projectEntryId = toPositiveInt(req.query.projectEntryId);
      if (!projectEntryId) {
        res.status(400).json({ error: 'projectEntryId is required.' });
        return;
      }
      const comments = await listProjectComments(projectEntryId);
      res.status(200).json({ comments });
      return;
    }

    if (req.method === 'POST') {
      if (!enforceSameOriginWrite(req, res)) return;
      const limit = checkRateLimit(req, 'project-comments', 60, 60 * 1000);
      if (!limit.ok) {
        res.status(429).json({ error: 'Too many requests. Please try later.' });
        return;
      }

      const action = toCleanText(req.body?.action, 20).toLowerCase();
      if (action === 'comment') {
        const projectEntryId = toPositiveInt(req.body?.projectEntryId);
        const name = toCleanText(req.body?.name, 80);
        const comment = toCleanText(req.body?.comment, 800);
        const parentCommentId = toPositiveInt(req.body?.parentCommentId);
        if (!projectEntryId) {
          res.status(400).json({ error: 'Valid projectEntryId is required.' });
          return;
        }
        if (!comment) {
          res.status(400).json({ error: 'Comment is required.' });
          return;
        }
        const created = await addProjectComment({ projectEntryId, name, comment, parentCommentId });
        res.status(201).json({ ok: true, comment: created });
        return;
      }

      res.status(400).json({ error: 'Unsupported action.' });
      return;
    }

    if (req.method === 'DELETE') {
      if (!isAdminRequest(req)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (!enforceSameOriginWrite(req, res)) return;
      const commentId = toPositiveInt(req.body?.commentId);
      const projectEntryId = toPositiveInt(req.body?.projectEntryId);
      if (!commentId || !projectEntryId) {
        res.status(400).json({ error: 'Valid commentId and projectEntryId are required.' });
        return;
      }
      await deleteProjectComment({ commentId, projectEntryId });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
