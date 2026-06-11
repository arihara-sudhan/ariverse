import Link from 'next/link';
import { useState } from 'react';
import Header from '../src/components/Header';
import { isAdminRequest } from '../lib/adminAuth';
import { listAllCommentApprovals, listProfileLinks, listTestimonialsForAdmin } from '../lib/adminData';

export async function getServerSideProps({ req }) {
  const isAuthed = isAdminRequest(req);
  const [initialLinks, initialPendingApprovals] = isAuthed
    ? await Promise.all([
        listProfileLinks(),
        Promise.all([listAllCommentApprovals(), listTestimonialsForAdmin({ includePending: true })]),
      ])
    : [[], [[], []]];

  const [initialApprovals, initialTestimonials] = initialPendingApprovals;
  const awaitingApprovalsCount = [
    ...(Array.isArray(initialApprovals) ? initialApprovals : []),
    ...(Array.isArray(initialTestimonials) ? initialTestimonials : []),
  ].filter((item) => String(item?.status || '').toLowerCase() === 'pending').length;

  return {
    props: {
      isAuthed,
      initialLinks,
      awaitingApprovalsCount,
    },
  };
}

export default function AdminPage({ isAuthed, initialLinks, awaitingApprovalsCount }) {
  const [authed, setAuthed] = useState(isAuthed);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  const [links, setLinks] = useState(initialLinks);
  const [label, setLabel] = useState('');
  const [href, setHref] = useState('');
  const [category, setCategory] = useState('PROFESSIONAL');
  const [saving, setSaving] = useState(false);

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

    Promise.all([fetch('/api/admin/links')])
      .then(async ([linksRes]) => {
        if (!linksRes.ok) throw new Error('Could not load admin links.');
        const linksData = await linksRes.json();
        setLinks(linksData.links || []);
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

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setLinks([]);
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

              <div className="playlist-grid">
                {isLoadingLinks && <p className="contact-note">Loading section links...</p>}
                {links.map((link) => {
                  const hidden = Number(link.isHidden) === 1;
                  const isLockedSection =
                    link.label === 'AI with ARI (YouTube)' && link.href === '/ai-with-ari';
                  const isFeatureImagesSlot = link.label === 'Arichuvadu';

                  if (isFeatureImagesSlot) {
                    return (
                      <article key={link.id} className="playlist-card">
                        <Link href="/admin/feature-images">
                          <h3>Feature Images</h3>
                        </Link>
                        <p>Upload images to feature</p>
                        <p>Shown on the homepage.</p>
                        <Link className="ai-channel-subscribe" href="/admin/feature-images">
                          Open Feature Images
                        </Link>
                      </article>
                    );
                  }

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

              <div className="contact-card">
                <Link className="ai-channel-subscribe" href="/admin/approvals">
                  {awaitingApprovalsCount > 0
                    ? `View Awaiting Approvals (${awaitingApprovalsCount})`
                    : 'View Awaiting Approvals'}
                </Link>
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
