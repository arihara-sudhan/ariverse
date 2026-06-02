import {
  addContentComment,
  deleteContentComment,
  deleteOwnContentPendingComment,
  listContentComments,
  listContentCommentsForAdmin,
  updateContentCommentForAdmin,
  updateOwnContentPendingComment,
} from '../../../lib/adminData';
import { isAdminRequest } from '../../../lib/adminAuth';
import { notifyAdminCommentApproval } from '../../../lib/formspree';
import { isTruthyQuery, toCleanText, toPositiveInt } from '../../../lib/requestUtils';
import { checkRateLimit, enforceSameOriginWrite } from '../../../lib/security';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const section = toCleanText(req.query.section, 80).toLowerCase();
      const entryId = toPositiveInt(req.query.entryId);
      if (!section || !entryId) {
        res.status(400).json({ error: 'section and entryId are required.' });
        return;
      }
      const includePending = isTruthyQuery(req.query.includePending);
      const commenterToken = toCleanText(req.query.commenterToken, 120);
      const comments = includePending && isAdminRequest(req)
        ? await listContentCommentsForAdmin({ sectionKey: section, entryId, includePending: true, commenterToken })
        : includePending
          ? await listContentCommentsForAdmin({ sectionKey: section, entryId, includePending: false, commenterToken })
          : await listContentComments({ sectionKey: section, entryId });
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
      const commenterToken = toCleanText(req.body?.commenterToken, 120);
      if (!section || !entryId || !comment) {
        res.status(400).json({ error: 'Valid section, entryId, and comment are required.' });
        return;
      }
      await addContentComment({
        sectionKey: section,
        entryId,
        name,
        comment,
        parentCommentId,
        commenterToken,
      });
      await notifyAdminCommentApproval({
        source: 'content',
        sectionKey: section,
        entryId,
        name,
        comment,
      }).catch(() => null);
      res.status(201).json({ ok: true, queued: true, message: 'Comment submitted for approval.' });
      return;
    }

    if (req.method === 'PATCH') {
      if (!enforceSameOriginWrite(req, res)) return;
      const section = toCleanText(req.body?.section, 80).toLowerCase();
      const entryId = toPositiveInt(req.body?.entryId);
      const commentId = toPositiveInt(req.body?.commentId);
      const comment = typeof req.body?.comment === 'string' ? toCleanText(req.body.comment, 800) : null;
      const status = toCleanText(req.body?.status, 20).toLowerCase();
      const commenterToken = toCleanText(req.body?.commenterToken, 120);
      if (!section || !entryId || !commentId) {
        res.status(400).json({ error: 'Valid section, entryId, and commentId are required.' });
        return;
      }
      const updated = isAdminRequest(req)
        ? await updateContentCommentForAdmin({
            sectionKey: section,
            entryId,
            commentId,
            comment,
            status,
          })
        : await updateOwnContentPendingComment({
            sectionKey: section,
            entryId,
            commentId,
            comment,
            commenterToken,
          });
      if (!updated) {
        res.status(403).json({ error: 'Not allowed to edit this comment.' });
        return;
      }
      res.status(200).json({ ok: true, comment: updated });
      return;
    }

    if (req.method === 'DELETE') {
      if (!enforceSameOriginWrite(req, res)) return;
      const section = toCleanText(req.body?.section, 80).toLowerCase();
      const entryId = toPositiveInt(req.body?.entryId);
      const commentId = toPositiveInt(req.body?.commentId);
      const commenterToken = toCleanText(req.body?.commenterToken, 120);
      if (!section || !entryId || !commentId) {
        res.status(400).json({ error: 'Valid section, entryId, and commentId are required.' });
        return;
      }
      if (isAdminRequest(req)) {
        await deleteContentComment({ sectionKey: section, entryId, commentId });
      } else {
        await deleteOwnContentPendingComment({ sectionKey: section, entryId, commentId, commenterToken });
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
