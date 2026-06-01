import {
  deleteContentComment,
  deleteProjectComment,
  listAllCommentApprovals,
  updateContentCommentForAdmin,
  updateProjectCommentForAdmin,
} from '../../../lib/adminData';
import { isAdminRequest } from '../../../lib/adminAuth';
import { enforceSameOriginWrite } from '../../../lib/security';

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
    if (!isAdminRequest(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.method === 'GET') {
      const comments = await listAllCommentApprovals();
      res.status(200).json({ comments });
      return;
    }

    if (req.method === 'PATCH') {
      if (!enforceSameOriginWrite(req, res)) return;
      const source = toCleanText(req.body?.source, 20).toLowerCase();
      const commentId = toPositiveInt(req.body?.commentId);
      const entryId = toPositiveInt(req.body?.entryId);
      const sectionKey = toCleanText(req.body?.sectionKey, 80).toLowerCase();
      const comment = typeof req.body?.comment === 'string' ? toCleanText(req.body.comment, 800) : null;
      const status = toCleanText(req.body?.status, 20).toLowerCase();

      if (!commentId || !entryId || (source !== 'project' && source !== 'content')) {
        res.status(400).json({ error: 'Invalid approval update payload.' });
        return;
      }

      const updated = source === 'project'
        ? await updateProjectCommentForAdmin({ commentId, projectEntryId: entryId, comment, status })
        : await updateContentCommentForAdmin({ sectionKey, entryId, commentId, comment, status });
      res.status(200).json({ ok: true, comment: updated });
      return;
    }

    if (req.method === 'DELETE') {
      if (!enforceSameOriginWrite(req, res)) return;
      const source = toCleanText(req.body?.source, 20).toLowerCase();
      const commentId = toPositiveInt(req.body?.commentId);
      const entryId = toPositiveInt(req.body?.entryId);
      const sectionKey = toCleanText(req.body?.sectionKey, 80).toLowerCase();

      if (!commentId || !entryId || (source !== 'project' && source !== 'content')) {
        res.status(400).json({ error: 'Invalid delete payload.' });
        return;
      }

      if (source === 'project') {
        await deleteProjectComment({ commentId, projectEntryId: entryId });
      } else {
        await deleteContentComment({ sectionKey, entryId, commentId });
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
