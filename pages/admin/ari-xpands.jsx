import Link from 'next/link';
import { useState } from 'react';
import Header from '../../src/components/Header';
import SectionHero from '../../src/components/SectionHero';
import { isAdminRequest } from '../../lib/adminAuth';
import { listXpands } from '../../lib/ariXpands';
import { addProfileLink, getProfileLinkByHref, getSectionHero } from '../../lib/adminData';

const FALLBACK_HERO = {
  heading: "#Ari'sXpands",
  description: 'A living record of things Ari is learning, building, questioning, and exploring.',
  quote: '',
  imageUrl: '',
};

async function getOrCreateXpandsLink() {
  const existing = await getProfileLinkByHref('/ari-xpands');
  if (existing) return existing;
  return addProfileLink({
    label: 'ARI XPands',
    href: '/ari-xpands',
    category: 'PASSIONAL',
  });
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

  const link = await getOrCreateXpandsLink();
  const [xpands, hero] = await Promise.all([
    listXpands({ includePrivate: true }),
    getSectionHero(link.id, FALLBACK_HERO.heading),
  ]);

  return {
    props: {
      initialXpands: xpands,
      link,
      initialHero: hero || FALLBACK_HERO,
    },
  };
}

function formatShortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function AriXpandsAdminIndexPage({ initialXpands, link, initialHero }) {
  const xpands = Array.isArray(initialXpands) ? initialXpands : [];
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [saving, setSaving] = useState(false);
  const [savingHero, setSavingHero] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [editingHero, setEditingHero] = useState(false);
  const [error, setError] = useState('');
  const [heroHeading, setHeroHeading] = useState(initialHero?.heading || FALLBACK_HERO.heading);
  const [heroDescription, setHeroDescription] = useState(initialHero?.description || FALLBACK_HERO.description);
  const [heroQuote, setHeroQuote] = useState(initialHero?.quote || '');
  const [heroImageUrl, setHeroImageUrl] = useState(initialHero?.imageUrl || '');
  const [heroDraftHeading, setHeroDraftHeading] = useState(initialHero?.heading || FALLBACK_HERO.heading);
  const [heroDraftDescription, setHeroDraftDescription] = useState(initialHero?.description || FALLBACK_HERO.description);
  const [heroDraftQuote, setHeroDraftQuote] = useState(initialHero?.quote || '');
  const [heroDraftImageUrl, setHeroDraftImageUrl] = useState(initialHero?.imageUrl || '');

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
    window.location.href = `/admin/ari-xpands/${payload.xpand.id}`;
  }

  async function saveHero(event) {
    event.preventDefault();
    setSavingHero(true);
    setError('');
    const response = await fetch('/api/admin/link-hero', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkId: link.id,
        heading: heroDraftHeading,
        description: heroDraftDescription,
        quote: heroDraftQuote,
        imageUrl: heroDraftImageUrl,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSavingHero(false);
      setError(payload.error || 'Could not save hero.');
      return;
    }

    const nextHero = payload.hero || {};
    const nextHeading = nextHero.heading || heroDraftHeading;
    const nextDescription = nextHero.description || heroDraftDescription;
    const nextQuote = nextHero.quote || heroDraftQuote;
    const nextImageUrl = nextHero.imageUrl || heroDraftImageUrl;
    setHeroHeading(nextHeading);
    setHeroDescription(nextDescription);
    setHeroQuote(nextQuote);
    setHeroImageUrl(nextImageUrl);
    setHeroDraftHeading(nextHeading);
    setHeroDraftDescription(nextDescription);
    setHeroDraftQuote(nextQuote);
    setHeroDraftImageUrl(nextImageUrl);
    setEditingHero(false);
    setSavingHero(false);
  }

  async function uploadHeroImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('section', link.label || 'ARI XPands');
    formData.append('sectionHref', link.href || '/ari-xpands');
    formData.append('title', 'hero');
    if (heroDraftImageUrl || heroImageUrl) {
      formData.append('currentUrl', heroDraftImageUrl || heroImageUrl);
    }

    const response = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Upload failed.');
    }
    return payload.imageUrl;
  }

  function startHeroEdit() {
    setEditingHero(true);
    setHeroDraftHeading(heroHeading || FALLBACK_HERO.heading);
    setHeroDraftDescription(heroDescription || FALLBACK_HERO.description);
    setHeroDraftQuote(heroQuote || '');
    setHeroDraftImageUrl(heroImageUrl || '');
  }

  function cancelHeroEdit() {
    setEditingHero(false);
    setHeroDraftHeading(heroHeading || FALLBACK_HERO.heading);
    setHeroDraftDescription(heroDescription || FALLBACK_HERO.description);
    setHeroDraftQuote(heroQuote || '');
    setHeroDraftImageUrl(heroImageUrl || '');
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="ari-xpands-admin-title">
          <p className="eyebrow">Admin</p>
          <h2 id="ari-xpands-admin-title">ARI XPands</h2>
          <p className="contact-note">Keep the page hero clean, then add the journeys you want to publish.</p>

          <section className="contact-card">
            <p className="contact-note">Public hero preview.</p>
            <SectionHero
              heading={editingHero ? heroDraftHeading : heroHeading}
              description={editingHero ? heroDraftDescription : heroDescription}
              imageUrl={editingHero ? heroDraftImageUrl : heroImageUrl}
              fallbackHeading={FALLBACK_HERO.heading}
            >
              {(editingHero ? heroDraftQuote : heroQuote) ? (
                <p className="clay-play-quote">"{editingHero ? heroDraftQuote : heroQuote}"</p>
              ) : null}
            </SectionHero>

            {!editingHero ? (
              <button type="button" onClick={startHeroEdit}>
                Edit Hero
              </button>
            ) : (
              <form className="admin-hero-inline-form" onSubmit={saveHero}>
                <label htmlFor="hero-heading">Hero Title</label>
                <input
                  id="hero-heading"
                  type="text"
                  value={heroDraftHeading}
                  onChange={(event) => setHeroDraftHeading(event.target.value)}
                  required
                />
                <label htmlFor="hero-description">Hero Description</label>
                <textarea
                  id="hero-description"
                  rows="4"
                  value={heroDraftDescription}
                  onChange={(event) => setHeroDraftDescription(event.target.value)}
                />
                <label htmlFor="hero-quote">Hero Quote</label>
                <input
                  id="hero-quote"
                  type="text"
                  value={heroDraftQuote}
                  onChange={(event) => setHeroDraftQuote(event.target.value)}
                  placeholder="Optional quote shown below description"
                />
                <label htmlFor="hero-image-url">Hero Image URL</label>
                <input
                  id="hero-image-url"
                  type="url"
                  value={heroDraftImageUrl}
                  onChange={(event) => setHeroDraftImageUrl(event.target.value)}
                  placeholder="https://..."
                />
                <label htmlFor="hero-image-upload">Hero Image Upload</label>
                <input
                  id="hero-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length === 0) return;
                    setUploadingHero(true);
                    setError('');
                    try {
                      const uploadedUrl = await uploadHeroImage(files[0]);
                      setHeroDraftImageUrl(uploadedUrl);
                    } catch (uploadError) {
                      setError(uploadError.message || 'Upload failed.');
                    } finally {
                      setUploadingHero(false);
                    }
                  }}
                />
                <div className="admin-item-actions">
                  <button type="submit" disabled={savingHero || uploadingHero}>
                    {savingHero ? 'Saving Hero...' : uploadingHero ? 'Uploading...' : 'Save Hero'}
                  </button>
                  <button type="button" onClick={cancelHeroEdit}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          <form className="contact-card" onSubmit={createNewXpand}>
            <label htmlFor="ari-xpands-title">What are you expanding into?</label>
            <input
              id="ari-xpands-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Bowser"
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

          <section className="ari-xpands-admin-group">
            <div className="ari-xpands-admin-group__head">
              <h3>All XPands</h3>
              <span>{xpands.length}</span>
            </div>
            {xpands.length > 0 ? (
              <div className="ari-xpands-admin-catalog">
                {xpands.map((xpand) => (
                  <article key={xpand.id} className="ari-xpands-admin-item">
                    <div>
                      <strong>{xpand.title}</strong>
                      <p>{xpand.subtitle || xpand.slug}</p>
                    </div>
                    <div className="ari-xpands-admin-item__meta">
                      <span>{xpand.status}</span>
                      <span>{xpand.visibility}</span>
                      <span>{xpand.lastTouched ? `Updated ${formatShortDate(xpand.lastTouched)}` : 'No activity yet'}</span>
                    </div>
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
              <p className="contact-note">No XPands yet.</p>
            )}
          </section>

          {error ? <p className="contact-note">{error}</p> : null}
        </section>
      </main>
    </div>
  );
}
