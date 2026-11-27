import Link from 'next/link';
import { useState } from 'react';
import Header from '../../src/components/Header';
import { isAdminRequest } from '../../lib/adminAuth';
import { listFeatureImages } from '../../lib/adminData';
import { validateSupabaseImage } from '../../lib/uploadPolicy';
import { UPLOAD_METADATA_FAILURE_MESSAGE } from '../../lib/uploadRecovery';

export async function getServerSideProps({ req }) {
  const isAuthed = isAdminRequest(req);
  let initialImages = [];
  let initialError = '';

  if (isAuthed) {
    try {
      initialImages = await listFeatureImages();
    } catch (_error) {
      initialError = 'Feature images are temporarily unavailable because the database could not be reached.';
    }
  }

  return {
    props: {
      isAuthed,
      initialImages,
      initialError,
    },
  };
}

export default function FeatureImagesAdminPage({ isAuthed, initialImages, initialError }) {
  const [authed, setAuthed] = useState(isAuthed);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError || '');
  const [images, setImages] = useState(initialImages);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImageUrls, setPendingImageUrls] = useState([]);

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
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('featureFiles');
    const files = Array.from(fileInput?.files || []);
    if (files.length === 0 && pendingImageUrls.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const uploaded = [];
      const pending = [...pendingImageUrls];
      const work = [
        ...pending.map((imageUrl) => ({ imageUrl })),
        ...files.map((file) => ({ file })),
      ];
      for (let index = 0; index < work.length; index += 1) {
        const task = work[index];
        let imageUrl = task.imageUrl || '';
        if (!imageUrl) {
          const validationError = validateSupabaseImage(task.file);
          if (validationError) throw new Error(validationError.message);
          const formData = new FormData();
          formData.append('image', task.file);
          formData.append('section', 'Homepage');
          formData.append('sectionHref', '/');
          formData.append('title', 'Feature Images');
          const uploadRes = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
          const uploadData = await uploadRes.json().catch(() => ({}));
          if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed.');
          imageUrl = String(uploadData.imageUrl || '').trim();
          if (!imageUrl) throw new Error('Image upload did not return a URL.');
        }
        let saveData;
        try {
          const saveRes = await fetch('/api/admin/feature-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl }),
          });
          saveData = await saveRes.json().catch(() => ({}));
          if (!saveRes.ok) throw new Error(saveData.error || 'Could not save feature image.');
        } catch (_saveError) {
          setPendingImageUrls([imageUrl]);
          form.reset();
          throw new Error(UPLOAD_METADATA_FAILURE_MESSAGE);
        }
        if (saveData.image) uploaded.push(saveData.image);
      }

      setPendingImageUrls([]);
      setImages((prev) => [...uploaded, ...prev]);
      form.reset();
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
          <p className="contact-note">Upload images to feature. JPEG, PNG, WebP, or GIF up to 4 MiB each. The homepage picks one at random on load.</p>

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
                <input id="feature-files" name="featureFiles" type="file" accept="image/*" multiple required={pendingImageUrls.length === 0} />
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
