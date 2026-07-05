import Link from 'next/link';
import { useMemo, useState } from 'react';
import Header from '../../src/components/Header';
import { isAdminRequest } from '../../lib/adminAuth';
import { listAllCommentApprovals, listTestimonialsForAdmin } from '../../lib/adminData';

function buildCommentLocation(comment) {
  if (comment.source === 'project') {
    return '/projects';
  }
  const sectionMap = {
    arizone: '/arizone',
    xperiments: '/aris-xperiments',
    kavithaigal: '/arichuvadi',
    'guest-lectures': '/guest-lectures',
    'book-reviews': '/book-reviews',
    'clay-play': '/clay-play',
    testimonials: '/#testimonials',
  };
  return sectionMap[comment.sectionKey] || '#';
}

function buildTestimonialLocation() {
  return '/#testimonials';
}

function getModerationLabel(item) {
  return item.kind === 'testimonial' ? 'Testimonial' : 'Comment';
}

function formatTestimonialRole(role) {
  const cleanRole = String(role || '').trim();
  if (!cleanRole) return '';
  return cleanRole.startsWith("Ari's ") ? cleanRole : `Ari's ${cleanRole}`;
}

export async function getServerSideProps({ req }) {
  if (!isAdminRequest(req)) {
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      initialApprovals: await listAllCommentApprovals(),
      initialTestimonials: await listTestimonialsForAdmin({ includePending: true }),
    },
  };
}

export default function AdminApprovalsPage({ initialApprovals, initialTestimonials }) {
  const [error, setError] = useState('');
  const [approvals, setApprovals] = useState(initialApprovals || []);
  const [testimonials, setTestimonials] = useState(initialTestimonials || []);
  const [replyDraftByKey, setReplyDraftByKey] = useState({});
  const [replyOpenByKey, setReplyOpenByKey] = useState({});

  const moderationItems = useMemo(() => {
    const commentItems = (approvals || []).map((item) => ({
      ...item,
      kind: 'comment',
      bodyText: item.comment || '',
      roleText: '',
      location: buildCommentLocation(item),
    }));
    const testimonialItems = (testimonials || []).map((item) => ({
      ...item,
      kind: 'testimonial',
      bodyText: item.testimonial || '',
      roleText: formatTestimonialRole(item.relation || ''),
      location: buildTestimonialLocation(),
    }));
    return [...commentItems, ...testimonialItems].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [approvals, testimonials]);

  const pendingModeration = useMemo(
    () => moderationItems.filter((item) => item.status === 'pending'),
    [moderationItems],
  );
  const greenModeration = useMemo(
    () => moderationItems.filter((item) => item.status === 'green'),
    [moderationItems],
  );

  async function loadApprovals() {
    const res = await fetch('/api/admin/comment-approvals');
    if (!res.ok) throw new Error('Could not load approvals.');
    const data = await res.json();
    setApprovals(Array.isArray(data.comments) ? data.comments : []);
  }

  async function loadTestimonials() {
    const res = await fetch('/api/admin/testimonials');
    if (!res.ok) throw new Error('Could not load testimonials.');
    const data = await res.json();
    setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : []);
  }

  async function updateApprovalComment(comment, patch) {
    const res = await fetch('/api/admin/comment-approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: comment.source,
        sectionKey: comment.sectionKey,
        entryId: comment.entryId,
        commentId: comment.id,
        ...patch,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not update comment.');
      return;
    }
    await loadApprovals();
  }

  async function deleteApprovalComment(comment) {
    const res = await fetch('/api/admin/comment-approvals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: comment.source,
        sectionKey: comment.sectionKey,
        entryId: comment.entryId,
        commentId: comment.id,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not delete comment.');
      return;
    }
    await loadApprovals();
  }

  async function updateTestimonial(testimonial, patch) {
    const res = await fetch('/api/admin/testimonials', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testimonial.id,
        ...patch,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not update testimonial.');
      return;
    }
    await loadTestimonials();
  }

  async function replyToComment(item) {
    const key = `${item.kind}-${item.source}-${item.id}`;
    const replyText = String(replyDraftByKey[key] || '').trim();
    if (!replyText) {
      setError('Reply text is required.');
      return;
    }

    const res = await fetch('/api/admin/comment-approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: item.source,
        sectionKey: item.sectionKey,
        entryId: item.entryId,
        commentId: item.id,
        comment: replyText,
        makeParentGreen: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not post reply.');
      return;
    }

    setReplyDraftByKey((prev) => ({ ...prev, [key]: '' }));
    setReplyOpenByKey((prev) => ({ ...prev, [key]: false }));
    await loadApprovals();
  }

  async function deleteTestimonial(testimonial) {
    const res = await fetch('/api/admin/testimonials', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testimonial.id,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not delete testimonial.');
      return;
    }
    await loadTestimonials();
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="approvals-page-title">
          <p className="eyebrow">Admin</p>
          <h2 id="approvals-page-title">Approvals</h2>
          <p className="contact-note">
            <Link href="/admin">Back to Admin</Link>
          </p>

          <section className="contact-card" aria-labelledby="approvals-title">
            <h3 id="approvals-title">Approvals ({pendingModeration.length})</h3>
            {pendingModeration.length === 0 ? <p className="contact-note">No pending items.</p> : null}
            {pendingModeration.map((item) => (
              <div key={`pending-${item.kind}-${item.id}`} className="admin-upload-item" style={{ marginBottom: '0.6rem' }}>
                <span>
                  <strong>{item.name || 'anonymous'}:</strong> {item.bodyText}
                </span>
                <p className="contact-note" style={{ margin: '0.25rem 0' }}>
                  {getModerationLabel(item)}
                  {item.kind === 'testimonial' ? ` | Role: ${item.roleText || "Ari's Let ARI infer"}` : ''}
                  {' | '}
                  <Link href={item.location}>Open location</Link>
                </p>
                <div className="admin-item-actions">
                  <button
                    type="button"
                    className="playlist-watch-btn admin-item-action-btn"
                    onClick={() => {
                      if (item.kind === 'comment') {
                        updateApprovalComment(item, { status: 'green' });
                      } else {
                        updateTestimonial(item, { status: 'green' });
                      }
                    }}
                  >
                    Green
                  </button>
                  <button
                    type="button"
                    className="playlist-watch-btn admin-item-action-btn"
                    onClick={() => {
                      if (item.kind === 'comment') {
                        const next = window.prompt('Edit comment', item.comment || '');
                        if (typeof next === 'string') updateApprovalComment(item, { comment: next });
                        return;
                      }
                      const nextName = window.prompt('Edit name', item.name || '');
                      if (nextName === null) return;
                      const nextRelation = window.prompt('Edit role', item.roleText || '');
                      if (nextRelation === null) return;
                      const nextTestimonial = window.prompt('Edit testimonial', item.bodyText || '');
                      if (nextTestimonial === null) return;
                      updateTestimonial(item, {
                        name: nextName,
                        relation: nextRelation,
                        testimonial: nextTestimonial,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="playlist-watch-btn admin-item-action-btn"
                    onClick={() => {
                      if (item.kind === 'comment') {
                        deleteApprovalComment(item);
                        return;
                      }
                      deleteTestimonial(item);
                    }}
                  >
                    Delete
                  </button>
                </div>
                {item.kind === 'comment' ? (
                  <div style={{ marginTop: '0.6rem' }}>
                    <button
                      type="button"
                      className="playlist-watch-btn admin-item-action-btn"
                      onClick={() =>
                        setReplyOpenByKey((prev) => ({
                          ...prev,
                          [`${item.kind}-${item.source}-${item.id}`]: !prev[`${item.kind}-${item.source}-${item.id}`],
                        }))
                      }
                    >
                      Reply as ARIVERSE
                    </button>
                    {replyOpenByKey[`${item.kind}-${item.source}-${item.id}`] ? (
                      <div className="project-comment-reply-box" style={{ marginTop: '0.45rem' }}>
                        <textarea
                          rows="2"
                          value={replyDraftByKey[`${item.kind}-${item.source}-${item.id}`] || ''}
                          onChange={(event) =>
                            setReplyDraftByKey((prev) => ({
                              ...prev,
                              [`${item.kind}-${item.source}-${item.id}`]: event.target.value,
                            }))
                          }
                          placeholder="Reply as ARIVERSE"
                        />
                        <button type="button" onClick={() => replyToComment(item)}>
                          Send Reply
                        </button>
                        <p className="contact-note" style={{ margin: '0.15rem 0 0' }}>
                          Replies use the homepage hero image and the name ARIVERSE.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </section>

          <section className="contact-card" style={{ marginTop: '1rem' }} aria-labelledby="green-title">
            <h3 id="green-title">Green List ({greenModeration.length})</h3>
            {greenModeration.length === 0 ? <p className="contact-note">No green items yet.</p> : null}
            {greenModeration.map((item) => (
              <div key={`green-${item.kind}-${item.id}`} className="admin-upload-item" style={{ marginBottom: '0.6rem' }}>
                <span>
                  <strong>{item.name || 'anonymous'}:</strong> {item.bodyText}
                </span>
                <p className="contact-note" style={{ margin: '0.25rem 0' }}>
                  {getModerationLabel(item)}
                  {item.kind === 'testimonial' ? ` | Role: ${item.roleText || "Ari's Let ARI infer"}` : ''}
                  {' | '}
                  <Link href={item.location}>Open location</Link>
                </p>
                <div className="admin-item-actions">
                  <button
                    type="button"
                    className="playlist-watch-btn admin-item-action-btn"
                    onClick={() => {
                      if (item.kind === 'comment') {
                        updateApprovalComment(item, { status: 'pending' });
                      } else {
                        updateTestimonial(item, { status: 'pending' });
                      }
                    }}
                  >
                    Move to Approvals
                  </button>
                  <button
                    type="button"
                    className="playlist-watch-btn admin-item-action-btn"
                    onClick={() => {
                      if (item.kind === 'comment') {
                        const next = window.prompt('Edit comment', item.comment || '');
                        if (typeof next === 'string') updateApprovalComment(item, { comment: next });
                        return;
                      }
                      const nextName = window.prompt('Edit name', item.name || '');
                      if (nextName === null) return;
                      const nextRelation = window.prompt('Edit role', item.roleText || '');
                      if (nextRelation === null) return;
                      const nextTestimonial = window.prompt('Edit testimonial', item.bodyText || '');
                      if (nextTestimonial === null) return;
                      updateTestimonial(item, {
                        name: nextName,
                        relation: nextRelation,
                        testimonial: nextTestimonial,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="playlist-watch-btn admin-item-action-btn"
                    onClick={() => {
                      if (item.kind === 'comment') {
                        deleteApprovalComment(item);
                        return;
                      }
                      deleteTestimonial(item);
                    }}
                  >
                    Delete
                  </button>
                </div>
                {item.kind === 'comment' ? (
                  <div style={{ marginTop: '0.6rem' }}>
                    <button
                      type="button"
                      className="playlist-watch-btn admin-item-action-btn"
                      onClick={() =>
                        setReplyOpenByKey((prev) => ({
                          ...prev,
                          [`${item.kind}-${item.source}-${item.id}`]: !prev[`${item.kind}-${item.source}-${item.id}`],
                        }))
                      }
                    >
                      Reply as ARIVERSE
                    </button>
                    {replyOpenByKey[`${item.kind}-${item.source}-${item.id}`] ? (
                      <div className="project-comment-reply-box" style={{ marginTop: '0.45rem' }}>
                        <textarea
                          rows="2"
                          value={replyDraftByKey[`${item.kind}-${item.source}-${item.id}`] || ''}
                          onChange={(event) =>
                            setReplyDraftByKey((prev) => ({
                              ...prev,
                              [`${item.kind}-${item.source}-${item.id}`]: event.target.value,
                            }))
                          }
                          placeholder="Reply as ARIVERSE"
                        />
                        <button type="button" onClick={() => replyToComment(item)}>
                          Send Reply
                        </button>
                        <p className="contact-note" style={{ margin: '0.15rem 0 0' }}>
                          Replies use the homepage hero image and the name ARIVERSE.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </section>

          {error && <p className="contact-note">{error}</p>}
        </section>
      </main>
    </div>
  );
}
