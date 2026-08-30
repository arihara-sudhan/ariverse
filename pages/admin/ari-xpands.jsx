import Link from 'next/link';
import { useState } from 'react';
import Header from '../../src/components/Header';
import { isAdminRequest } from '../../lib/adminAuth';
import { listXpands } from '../../lib/ariXpands';

const STATUS_ORDER = ['active', 'planned', 'paused', 'completed', 'abandoned', 'archived'];

export async function getServerSideProps({ req }) {
  if (!isAdminRequest(req)) {
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }

  const xpands = await listXpands({ includePrivate: true });
  return {
    props: {
      initialXpands: xpands,
    },
  };
}

export default function AriXpandsAdminIndexPage({ initialXpands }) {
  const [xpands, setXpands] = useState(initialXpands || []);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: xpands.filter((xpand) => xpand.status === status),
  }));

  async function createNewXpand(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/ari-xpands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, visibility }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(payload.error || 'Could not create Xpand.');
      return;
    }
    const nextXpand = payload.xpand;
    window.location.href = `/admin/ari-xpands/${nextXpand.id}`;
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="ari-xpands-admin-title">
          <p className="eyebrow">Admin</p>
          <h2 id="ari-xpands-admin-title">ARI XPands</h2>
          <p className="contact-note">Name it. Create it. Start logging.</p>

          <form className="contact-card" onSubmit={createNewXpand}>
            <label htmlFor="ari-xpands-title">What are you expanding into?</label>
            <input
              id="ari-xpands-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="CUDA"
              required
            />
            <label htmlFor="ari-xpands-visibility">Visibility</label>
            <select
              id="ari-xpands-visibility"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
            >
              <option value="public">Public</option>
              <option value="draft">Draft</option>
              <option value="private">Private</option>
            </select>
            <button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Xpand'}
            </button>
          </form>

          <p className="contact-note">
            <Link href="/ari-xpands">Open public ARI XPands</Link>
          </p>

          {grouped.map((group) => (
            <section key={group.status} className="ari-xpands-admin-group">
              <div className="ari-xpands-admin-group__head">
                <h3>{group.status.toUpperCase()}</h3>
                <span>{group.items.length}</span>
              </div>
              {group.items.length > 0 ? (
                <div className="playlist-grid">
                  {group.items.map((xpand) => (
                    <article key={xpand.id} className="playlist-card">
                      <h3>{xpand.title}</h3>
                      <p>{xpand.subtitle || xpand.slug}</p>
                      <p>{xpand.visibility}</p>
                      <p>{xpand.lastTouched ? `Last updated ${new Date(xpand.lastTouched).toLocaleDateString('en-US')}` : 'No activity yet'}</p>
                      <div className="admin-item-actions">
                        <Link className="ai-channel-subscribe" href={`/admin/ari-xpands/${xpand.id}`}>
                          Open
                        </Link>
                        <Link className="ai-channel-subscribe" href={`/admin/ari-xpands/${xpand.id}#quick-log`}>
                          Quick Log
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="contact-note">No {group.status} XPands.</p>
              )}
            </section>
          ))}

          {error ? <p className="contact-note">{error}</p> : null}
        </section>
      </main>
    </div>
  );
}
