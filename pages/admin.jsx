import Link from 'next/link';
import { useMemo, useState } from 'react';
import Header from '../src/components/Header';
import { isAdminRequest } from '../lib/adminAuth';
import { listAllCommentApprovals, listProfileLinks } from '../lib/adminData';

function buildCommentLocation(comment) {
  if (comment.source === 'project') {
    return '/projects';
  }
  const sectionMap = {
    xperiments: '/aris-xperiments',
    kavithaigal: '/ariyin-kavithaigal',
    'guest-lectures': '/guest-lectures',
    'book-reviews': '/book-reviews',
    'clay-play': '/clay-play',
    testimonials: '/#testimonials',
  };
  return sectionMap[comment.sectionKey] || '#';
}

export async function getServerSideProps({ req }) {
  const isAuthed = isAdminRequest(req);

  return {
    props: {
      isAuthed,
      initialLinks: isAuthed ? await listProfileLinks() : [],
      initialApprovals: isAuthed ? await listAllCommentApprovals() : [],
    },
  };
}

export default function AdminPage({ isAuthed, initialLinks, initialApprovals }) {
  const [authed, setAuthed] = useState(isAuthed);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  const [links, setLinks] = useState(initialLinks);
  const [approvals, setApprovals] = useState(initialApprovals || []);
  const [label, setLabel] = useState('');
  const [href, setHref] = useState('');
  const [category, setCategory] = useState('PROFESSIONAL');
  const [saving, setSaving] = useState(false);

  const pendingApprovals = useMemo(
    () => approvals.filter((item) => item.status === 'pending'),
    [approvals],
  );
  const greenApprovals = useMemo(
    () => approvals.filter((item) => item.status === 'green'),
    [approvals],
  );

  async function loadApprovals() {
    const res = await fetch('/api/admin/comment-approvals');
    if (!res.ok) throw new Error('Could not load approvals.');
    const data = await res.json();
    setApprovals(Array.isArray(data.comments) ? data.comments : []);
  }

  async function login(event) {
    event.preventDefault();
    setError('');

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      let message = 'Access denied. Invalid password.';
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch (_error) {
        // ignore parse errors and keep fallback message
      }
      setError(message);
      return;
    }

    setAuthed(true);
    setIsLoadingLinks(true);

    Promise.all([fetch('/api/admin/links'), fetch('/api/admin/comment-approvals')])
      .then(async ([linksRes, approvalsRes]) => {
        if (!linksRes.ok) throw new Error('Could not load admin links.');
        const linksData = await linksRes.json();
        setLinks(linksData.links || []);

        if (!approvalsRes.ok) throw new Error('Could not load approvals.');
        const approvalsData = await approvalsRes.json();
        setApprovals(Array.isArray(approvalsData.comments) ? approvalsData.comments : []);
      })
      .catch((loadError) => {
        setError(loadError?.message || 'Could not load admin data.');
      })
      .finally(() => {
        setIsLoadingLinks(false);
      });
  }

  async function addLink(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/admin/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, href, category }),
    });

    const data = await res.json();

    if (!res.ok) {
      setSaving(false);
      setError(data.error || 'Could not add link.');
      return;
    }

    setLinks((prev) => [...prev, data.link]);
    setLabel('');
    setHref('');
    setCategory('PROFESSIONAL');
    setSaving(false);
  }

  async function toggleHidden(id, hidden) {
    const res = await fetch('/api/admin/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, hidden: !hidden }),
    });

    if (!res.ok) {
      setError('Could not update visibility.');
      return;
    }

    setLinks((prev) => prev.map((link) => (link.id === id ? { ...link, isHidden: hidden ? 0 : 1 } : link)));
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

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setLinks([]);
    setApprovals([]);
    setPassword('');
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="admin-title">
          <p className="eyebrow">Admin</p>
          <h2 id="admin-title">Ariverse Content Admin</h2>

          {!authed && (
            <form className="contact-card" onSubmit={login}>
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="submit">Continue</button>
            </form>
          )}

          {authed && (
            <>
              <form className="contact-card" onSubmit={addLink}>
                <p className="contact-note">Add a new section link. Click any section to manage its items.</p>
                <label htmlFor="new-label">Label</label>
                <input id="new-label" type="text" placeholder="Example: New Project" value={label} onChange={(event) => setLabel(event.target.value)} required />
                <label htmlFor="new-href">URL</label>
                <input id="new-href" type="text" placeholder="/my-page or https://..." value={href} onChange={(event) => setHref(event.target.value)} required />
                <label htmlFor="new-category">Category</label>
                <select id="new-category" value={category} onChange={(event) => setCategory(event.target.value)} required>
                  <option value="PROFESSIONAL">PROFESSIONAL</option>
                  <option value="PASSIONAL">PASSIONAL</option>
                  <option value="HOBBYAL">HOBBYAL</option>
                </select>
                <button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Link'}</button>
              </form>

              <div className="contact-card">
                <h3>Approvals ({pendingApprovals.length})</h3>
                {pendingApprovals.length === 0 ? <p className="contact-note">No pending comments.</p> : null}
                {pendingApprovals.map((comment) => (
                  <div key={`pending-${comment.source}-${comment.id}`} className="admin-upload-item" style={{ marginBottom: '0.6rem' }}>
                    <span><strong>{comment.name || 'anonymous'}:</strong> {comment.comment}</span>
                    <p className="contact-note" style={{ margin: '0.25rem 0' }}>
                      {comment.source === 'project' ? `Project #${comment.entryId}` : `${comment.sectionKey} #${comment.entryId}`}
                      {' | '}
                      <Link href={buildCommentLocation(comment)}>Open location</Link>
                    </p>
                    <div className="admin-item-actions">
                      <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => updateApprovalComment(comment, { status: 'green' })}>Green</button>
                      <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => {
                        const next = window.prompt('Edit comment', comment.comment || '');
                        if (typeof next === 'string') updateApprovalComment(comment, { comment: next });
                      }}>Edit</button>
                      <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => deleteApprovalComment(comment)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="contact-card">
                <h3>Green List ({greenApprovals.length})</h3>
                {greenApprovals.length === 0 ? <p className="contact-note">No green comments yet.</p> : null}
                {greenApprovals.map((comment) => (
                  <div key={`green-${comment.source}-${comment.id}`} className="admin-upload-item" style={{ marginBottom: '0.6rem' }}>
                    <span><strong>{comment.name || 'anonymous'}:</strong> {comment.comment}</span>
                    <p className="contact-note" style={{ margin: '0.25rem 0' }}>
                      {comment.source === 'project' ? `Project #${comment.entryId}` : `${comment.sectionKey} #${comment.entryId}`}
                      {' | '}
                      <Link href={buildCommentLocation(comment)}>Open location</Link>
                    </p>
                    <div className="admin-item-actions">
                      <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => updateApprovalComment(comment, { status: 'pending' })}>Move to Approvals</button>
                      <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => {
                        const next = window.prompt('Edit comment', comment.comment || '');
                        if (typeof next === 'string') updateApprovalComment(comment, { comment: next });
                      }}>Edit</button>
                      <button type="button" className="playlist-watch-btn admin-item-action-btn" onClick={() => deleteApprovalComment(comment)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="playlist-grid">
                {isLoadingLinks && <p className="contact-note">Loading section links...</p>}
                {links.map((link) => {
                  const hidden = Number(link.isHidden) === 1;
                  const isLockedSection =
                    link.label === 'AI with ARI (YouTube)' && link.href === '/ai-with-ari';

                  return (
                    <article key={link.id} className="playlist-card">
                      {isLockedSection ? (
                        <h3>{link.label}</h3>
                      ) : (
                        <Link href={`/admin/links/${link.id}`}>
                          <h3>{link.label}</h3>
                        </Link>
                      )}
                      <p>{link.href}</p>
                      <p>{link.category || 'PASSIONAL'}</p>
                      <p>{hidden ? 'Hidden on homepage' : 'Visible on homepage'}</p>
                      <button type="button" className="playlist-watch-btn" onClick={() => toggleHidden(link.id, hidden)}>
                        {hidden ? 'Unhide' : 'Hide'}
                      </button>
                    </article>
                  );
                })}
              </div>

              <button type="button" className="ai-channel-subscribe" onClick={logout}>
                Logout
              </button>
            </>
          )}

          {error && <p className="contact-note">{error}</p>}
        </section>
      </main>
    </div>
  );
}
