import {
  addProjectComment,
  deleteProjectComment,
  deleteOwnProjectPendingComment,
  listProjectComments,
  listProjectCommentsForAdmin,
  updateProjectCommentForAdmin,
  updateOwnProjectPendingComment,
} from '../../../lib/adminData';
import { isAdminRequest } from '../../../lib/adminAuth';
import { notifyAdminCommentApproval } from '../../../lib/formspree';
import { isTruthyQuery, toCleanText, toPositiveInt } from '../../../lib/requestUtils';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const projectEntryId = toPositiveInt(req.query.projectEntryId);
      if (!projectEntryId) {
        res.status(400).json({ error: 'projectEntryId is required.' });
        return;
      }
      const includePending = isTruthyQuery(req.query.includePending);
      const commenterToken = toCleanText(req.query.commenterToken, 120);
      const comments = includePending && isAdminRequest(req)
        ? await listProjectCommentsForAdmin(projectEntryId, { includePending: true, commenterToken })
        : includePending
          ? await listProjectCommentsForAdmin(projectEntryId, { includePending: false, commenterToken })
          : await listProjectComments(projectEntryId);
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
        const commenterToken = toCleanText(req.body?.commenterToken, 120);
        if (!projectEntryId) {
          res.status(400).json({ error: 'Valid projectEntryId is required.' });
          return;
        }
        if (!comment) {
          res.status(400).json({ error: 'Comment is required.' });
          return;
        }
        await addProjectComment({ projectEntryId, name, comment, parentCommentId, commenterToken });
        await notifyAdminCommentApproval({
          source: 'project',
          sectionKey: 'projects',
          entryId: projectEntryId,
          name,
          comment,
        }).catch(() => null);
        res.status(201).json({ ok: true, queued: true, message: 'Comment submitted for approval.' });
        return;
      }

      res.status(400).json({ error: 'Unsupported action.' });
      return;
    }

    if (req.method === 'PATCH') {
      if (!enforceSameOriginWrite(req, res)) return;
      const commentId = toPositiveInt(req.body?.commentId);
      const projectEntryId = toPositiveInt(req.body?.projectEntryId);
      const comment = typeof req.body?.comment === 'string' ? toCleanText(req.body.comment, 800) : null;
      const status = toCleanText(req.body?.status, 20).toLowerCase();
      const commenterToken = toCleanText(req.body?.commenterToken, 120);
      if (!commentId || !projectEntryId) {
        res.status(400).json({ error: 'Valid commentId and projectEntryId are required.' });
        return;
      }
      const updated = isAdminRequest(req)
        ? await updateProjectCommentForAdmin({ commentId, projectEntryId, comment, status })
        : await updateOwnProjectPendingComment({ commentId, projectEntryId, comment, commenterToken });
      if (!updated) {
        res.status(403).json({ error: 'Not allowed to edit this comment.' });
        return;
      }
      res.status(200).json({ ok: true, comment: updated });
      return;
    }

    if (req.method === 'DELETE') {
      if (!enforceSameOriginWrite(req, res)) return;
      const commentId = toPositiveInt(req.body?.commentId);
      const projectEntryId = toPositiveInt(req.body?.projectEntryId);
      const commenterToken = toCleanText(req.body?.commenterToken, 120);
      if (!commentId || !projectEntryId) {
        res.status(400).json({ error: 'Valid commentId and projectEntryId are required.' });
        return;
      }
      if (isAdminRequest(req)) {
        await deleteProjectComment({ commentId, projectEntryId });
      } else {
        await deleteOwnProjectPendingComment({ commentId, projectEntryId, commenterToken });
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
