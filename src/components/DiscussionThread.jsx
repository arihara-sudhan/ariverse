import { useMemo, useState } from 'react';

function formatRelativeTime(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  const diffMs = Date.now() - dt.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}M AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}H AGO`;
  const days = Math.floor(hrs / 24);
  return `${days}D AGO`;
}

function getDiceBearAvatarUrl(name) {
  const seed = encodeURIComponent(String(name || 'anonymous').trim().toLowerCase() || 'anonymous');
  return `https://api.dicebear.com/10.x/initials/svg?seed=${seed}&backgroundType=solid,gradientLinear`;
}

export default function DiscussionThread({
  title = 'Comments',
  endpoint,
  itemId,
  itemIdField = 'projectEntryId',
  queryParams = {},
  extraPayload = {},
  initialComments = [],
}) {
  const [name, setName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [replyByCommentId, setReplyByCommentId] = useState({});
  const [replyOpenByCommentId, setReplyOpenByCommentId] = useState({});
  const [comments, setComments] = useState(Array.isArray(initialComments) ? initialComments : []);

  const commentTree = useMemo(() => {
    const roots = comments.filter((item) => !item.parentCommentId);
    const byParent = new Map();
    for (const item of comments) {
      if (!item.parentCommentId) continue;
      const current = byParent.get(item.parentCommentId) || [];
      current.push(item);
      byParent.set(item.parentCommentId, current);
    }
    return { roots, byParent };
  }, [comments]);

  async function submitComment(parentCommentId = null) {
    const source = parentCommentId ? replyByCommentId[parentCommentId] : commentText;
    const trimmed = String(source || '').trim();
    if (!trimmed) {
      setError('Please write a comment.');
      return;
    }

    setSending(true);
    setError('');
    const payload = {
      action: 'comment',
      [itemIdField]: itemId,
      parentCommentId,
      name,
      comment: trimmed,
      ...extraPayload,
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSending(false);
      setError(data.error || 'Could not post comment.');
      return;
    }

    if (data.comment) {
      setComments((prev) => [data.comment, ...prev]);
      if (parentCommentId) {
        setReplyByCommentId((prev) => ({ ...prev, [parentCommentId]: '' }));
        setReplyOpenByCommentId((prev) => ({ ...prev, [parentCommentId]: false }));
      } else {
        setCommentText('');
      }
    }
    setSending(false);
  }

  return (
    <div className="project-comments">
      <h3>{title}</h3>
      <div className="project-comment-form">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="name (optional)"
        />
        <textarea
          rows="3"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Share your thoughts"
        />
        <button type="button" onClick={() => submitComment(null)} disabled={sending}>
          {sending ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
      {error ? <p className="project-comments-error">{error}</p> : null}

      <div className="project-comment-list">
        {commentTree.roots.map((item) => (
          <div key={item.id} className="project-comment-item">
            <div className="project-comment-head">
              <img
                className="project-comment-avatar"
                src={getDiceBearAvatarUrl(item.name)}
                alt={`${item.name || 'anonymous'} avatar`}
                loading="lazy"
                decoding="async"
              />
              <p className="project-comment-meta">
                <strong>{item.name || 'anonymous'}</strong>
                {formatRelativeTime(item.createdAt) ? <span> | {formatRelativeTime(item.createdAt)}</span> : null}
              </p>
            </div>
            <p>{item.comment}</p>
            <button
              type="button"
              className="project-comment-like"
              onClick={() =>
                setReplyOpenByCommentId((prev) => ({
                  ...prev,
                  [item.id]: !prev[item.id],
                }))
              }
            >
              Reply
            </button>

            {replyOpenByCommentId[item.id] ? (
              <div className="project-comment-reply-box">
                <textarea
                  rows="2"
                  value={replyByCommentId[item.id] || ''}
                  onChange={(event) =>
                    setReplyByCommentId((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                  placeholder="Write a reply"
                />
                <button type="button" onClick={() => submitComment(item.id)} disabled={sending}>
                  {sending ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            ) : null}

            {(commentTree.byParent.get(item.id) || []).map((reply) => (
              <div key={reply.id} className="project-comment-reply-item">
                <div className="project-comment-head">
                  <img
                    className="project-comment-avatar"
                    src={getDiceBearAvatarUrl(reply.name)}
                    alt={`${reply.name || 'anonymous'} avatar`}
                    loading="lazy"
                    decoding="async"
                  />
                  <p className="project-comment-meta">
                    <strong>{reply.name || 'anonymous'}</strong>
                    {formatRelativeTime(reply.createdAt) ? <span> | {formatRelativeTime(reply.createdAt)}</span> : null}
                  </p>
                </div>
                <p>{reply.comment}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
