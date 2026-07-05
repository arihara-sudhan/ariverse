import { useEffect, useMemo, useState } from 'react';

const COMMENTER_TOKEN_STORAGE_KEY = 'ariverse_commenter_token_v1';

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

function getCommentAvatarUrl(item) {
  const avatarUrl = String(item?.avatarUrl || '').trim();
  return avatarUrl || getDiceBearAvatarUrl(item?.name);
}

function getOrCreateCommenterToken() {
  if (typeof window === 'undefined') return '';
  let token = window.localStorage.getItem(COMMENTER_TOKEN_STORAGE_KEY);
  if (!token) {
    token = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(COMMENTER_TOKEN_STORAGE_KEY, token);
  }
  return token;
}

function buildCommentsUrl({ endpoint, itemIdField, itemId, queryParams, commenterToken, extraPayload }) {
  const params = new URLSearchParams({ includePending: 'true', commenterToken });
  for (const [key, value] of Object.entries({ [itemIdField]: itemId, ...(queryParams || {}), ...(extraPayload || {}) })) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  return `${endpoint}?${params.toString()}`;
}

export default function DiscussionThread({
  title = 'Comments',
  endpoint,
  itemId,
  itemIdField = 'projectEntryId',
  queryParams = {},
  extraPayload = {},
  initialComments = [],
  namePlaceholder = 'உங்கள் பெயர் (கட்டாயமில்லை)',
  commentPlaceholder = 'Share your thoughts',
  submitLabel = 'Post Comment',
}) {
  const [name, setName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [replyByCommentId, setReplyByCommentId] = useState({});
  const [replyOpenByCommentId, setReplyOpenByCommentId] = useState({});
  const [comments, setComments] = useState(Array.isArray(initialComments) ? initialComments : []);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commenterToken, setCommenterToken] = useState('');
  const queryParamsKey = useMemo(() => JSON.stringify(queryParams || {}), [queryParams]);

  useEffect(() => {
    setCommenterToken(getOrCreateCommenterToken());
  }, []);

  useEffect(() => {
    if (!commenterToken || !endpoint) return;
    fetch(buildCommentsUrl({ endpoint, itemIdField, itemId, queryParams, commenterToken, extraPayload }))
      .then((res) => res.json())
      .then((data) => {
        setComments(Array.isArray(data.comments) ? data.comments : []);
      })
      .catch(() => null);
  }, [commenterToken, endpoint, itemIdField, itemId, queryParamsKey, extraPayload]);

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
    setNotice('');
    const payload = {
      action: 'comment',
      [itemIdField]: itemId,
      parentCommentId,
      name,
      comment: trimmed,
      commenterToken,
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

    if (data.queued) {
      if (parentCommentId) {
        setReplyByCommentId((prev) => ({ ...prev, [parentCommentId]: '' }));
        setReplyOpenByCommentId((prev) => ({ ...prev, [parentCommentId]: false }));
      } else {
        setCommentText('');
      }
      setNotice(data.message || 'Comment submitted for approval.');
      const refresh = await fetch(buildCommentsUrl({ endpoint, itemIdField, itemId, queryParams, commenterToken, extraPayload }));
      const refreshData = await refresh.json().catch(() => ({}));
      if (refresh.ok && Array.isArray(refreshData.comments)) setComments(refreshData.comments);
    }
    setSending(false);
  }

  async function saveOwnComment(commentId) {
    const trimmed = String(editingCommentText || '').trim();
    if (!trimmed) return;
    const payload = {
      commentId,
      comment: trimmed,
      commenterToken,
      [itemIdField]: itemId,
      ...extraPayload,
    };
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not edit comment.');
      return;
    }
    setComments((prev) => prev.map((item) => (item.id === commentId ? { ...item, comment: trimmed } : item)));
    setEditingCommentId(null);
    setEditingCommentText('');
  }

  async function deleteOwnComment(commentId) {
    const payload = {
      commentId,
      commenterToken,
      [itemIdField]: itemId,
      ...extraPayload,
    };
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    setComments((prev) => prev.filter((item) => item.id !== commentId && item.parentCommentId !== commentId));
  }

  return (
    <div className="project-comments">
      <h3>{title}</h3>
      <div className="project-comment-form">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={namePlaceholder}
        />
        <textarea
          rows="3"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder={commentPlaceholder}
        />
        <button type="button" onClick={() => submitComment(null)} disabled={sending}>
          {sending ? 'Posting...' : submitLabel}
        </button>
      </div>
      {error ? <p className="project-comments-error">{error}</p> : null}
      {notice ? <p className="contact-note">{notice}</p> : null}

      <div className="project-comment-list">
        {commentTree.roots.map((item) => (
          <div key={item.id} className="project-comment-item">
            <div className="project-comment-head">
              <img
                className="project-comment-avatar"
                src={getCommentAvatarUrl(item)}
                alt={`${item.name || 'anonymous'} avatar`}
                loading="lazy"
                decoding="async"
              />
              <strong className="project-comment-name">{item.name || 'anonymous'}</strong>
              {formatRelativeTime(item.createdAt) ? (
                <span className="project-comment-time">{formatRelativeTime(item.createdAt)}</span>
              ) : null}
            </div>
            {editingCommentId === item.id ? (
              <div className="project-comment-reply-box">
                <textarea rows="2" value={editingCommentText} onChange={(event) => setEditingCommentText(event.target.value)} />
                <button type="button" onClick={() => saveOwnComment(item.id)}>Save</button>
              </div>
            ) : (
              <p>{item.comment}</p>
            )}
            {item.status === 'pending' ? (
              <p className="contact-note">Under Review - Visible only to you</p>
            ) : null}
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
            {item.status === 'pending' ? (
              <>
                <button
                  type="button"
                  className="project-comment-like"
                  onClick={() => {
                    setEditingCommentId(item.id);
                    setEditingCommentText(item.comment || '');
                  }}
                >
                  Edit
                </button>
                <button type="button" className="project-comment-like" onClick={() => deleteOwnComment(item.id)}>
                  Delete
                </button>
              </>
            ) : null}

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
                    src={getCommentAvatarUrl(reply)}
                    alt={`${reply.name || 'anonymous'} avatar`}
                    loading="lazy"
                    decoding="async"
                  />
                  <strong className="project-comment-name">{reply.name || 'anonymous'}</strong>
                  {formatRelativeTime(reply.createdAt) ? (
                    <span className="project-comment-time">{formatRelativeTime(reply.createdAt)}</span>
                  ) : null}
                </div>
                {editingCommentId === reply.id ? (
                  <div className="project-comment-reply-box">
                    <textarea rows="2" value={editingCommentText} onChange={(event) => setEditingCommentText(event.target.value)} />
                    <button type="button" onClick={() => saveOwnComment(reply.id)}>Save</button>
                  </div>
                ) : (
                  <p>{reply.comment}</p>
                )}
                {reply.status === 'pending' ? (
                  <>
                    <p className="contact-note">Under Review - Visible only to you</p>
                    <button
                      type="button"
                      className="project-comment-like"
                      onClick={() => {
                        setEditingCommentId(reply.id);
                        setEditingCommentText(reply.comment || '');
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="project-comment-like" onClick={() => deleteOwnComment(reply.id)}>
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
