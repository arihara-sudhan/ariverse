import Link from 'next/link';
import { useState } from 'react';
import Header from '../../src/components/Header';
import { isAdminRequest } from '../../lib/adminAuth';
import { listFeatureImages } from '../../lib/adminData';

export async function getServerSideProps({ req }) {
  const isAuthed = isAdminRequest(req);
  const initialImages = isAuthed ? await listFeatureImages() : [];

  return {
    props: {
      isAuthed,
      initialImages,
    },
  };
}

export default function FeatureImagesAdminPage({ isAuthed, initialImages }) {
  const [authed, setAuthed] = useState(isAuthed);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [images, setImages] = useState(initialImages);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadImages() {
    const res = await fetch('/api/admin/feature-images');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not load feature images.');
    setImages(Array.isArray(data.images) ? data.images : []);
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
      }
      setError(message);
      return;
    }

    setAuthed(true);
    setIsLoading(true);
    try {
      await loadImages();
    } catch (loadError) {
      setError(loadError?.message || 'Could not load feature images.');
    } finally {
      setIsLoading(false);
    }
  }

  async function uploadFiles(event) {
    event.preventDefault();
    const fileInput = event.currentTarget.elements.namedItem('featureFiles');
    const files = Array.from(fileInput?.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const uploaded = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('section', 'Homepage');
        formData.append('sectionHref', '/');
        formData.append('title', 'Feature Images');

        const uploadRes = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Upload failed.');
        }

        const saveRes = await fetch('/api/admin/feature-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: uploadData.imageUrl }),
        });
        const saveData = await saveRes.json().catch(() => ({}));
        if (!saveRes.ok) {
          throw new Error(saveData.error || 'Could not save feature image.');
        }
        if (saveData.image) uploaded.push(saveData.image);
      }

      setImages((prev) => [...uploaded, ...prev]);
      event.currentTarget.reset();
    } catch (uploadError) {
      setError(uploadError?.message || 'Could not upload feature images.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="feature-images-title">
          <p className="eyebrow">Admin</p>
          <h2 id="feature-images-title">Feature Images</h2>
          <p className="contact-note">Upload images to feature. The homepage picks one at random on load.</p>

          {!authed ? (
            <form className="contact-card" onSubmit={login}>
              <label htmlFor="feature-images-password">Password</label>
              <input
                id="feature-images-password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="submit">Continue</button>
            </form>
          ) : (
            <>
              <form className="contact-card" onSubmit={uploadFiles}>
                <label htmlFor="feature-files">Upload images to feature</label>
                <input id="feature-files" name="featureFiles" type="file" accept="image/*" multiple required />
                <button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload Feature Images'}</button>
              </form>

              {isLoading ? <p className="contact-note">Loading feature images...</p> : null}

              <h3 style={{ margin: '1.25rem 0 0.65rem' }}>Existing Images</h3>
              <div className="playlist-grid">
                {images.length > 0 ? (
                  images.map((image) => (
                    <article key={image.id} className="playlist-card">
                      <img
                        src={image.imageUrl}
                        alt="Feature"
                        style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
                      />
                      <p style={{ wordBreak: 'break-all', marginTop: 0 }}>{image.imageUrl}</p>
                    </article>
                  ))
                ) : (
                  <p className="contact-note">No feature images have been uploaded yet.</p>
                )}
              </div>

              <p className="contact-note">
                These images are used by the homepage image shuffle in the same random logic as before.
              </p>

              <p className="contact-note">
                <Link href="/admin">Back to Admin</Link>
              </p>
            </>
          )}

          {error ? <p className="contact-note">{error}</p> : null}
        </section>
      </main>
    </div>
  );
}
