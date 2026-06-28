import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../src/components/Header';
import MDCreatorComponent from '../../src/components/MDCreatorComponent';
import { isAdminRequest } from '../../lib/adminAuth';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function slugifyText(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildArizoneDraft() {
  return {
    title: '',
    slug: '',
    coverImagePath: '',
    contentMarkdown: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    isPublished: true,
  };
}

function normalizeDraft(post = {}) {
  const defaults = buildArizoneDraft();
  return {
    ...defaults,
    ...post,
    publishedAt: String(post?.publishedAt || post?.published_at || defaults.publishedAt).slice(0, 10),
    contentMarkdown: String(post?.contentMarkdown || post?.content_markdown || defaults.contentMarkdown || ''),
  };
}

export async function getServerSideProps({ req }) {
  const isAuthed = isAdminRequest(req);
  const initialPosts = [];

  return {
    props: {
      isAuthed,
      initialPosts,
    },
  };
}

export default function AriZoneAdminPage({ isAuthed, initialPosts }) {
  const [authed, setAuthed] = useState(isAuthed);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posts, setPosts] = useState(initialPosts);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(normalizeDraft());
  const coverInputRef = useRef(null);

  const selectedPost = useMemo(
    () => posts.find((post) => Number(post.id) === Number(selectedId)) || null,
    [posts, selectedId],
  );

  useEffect(() => {
    if (selectedPost) {
      setDraft(normalizeDraft(selectedPost));
    }
  }, [selectedPost]);

  useEffect(() => {
    if (!authed || posts.length > 0) return;
    setLoading(true);
    loadPosts()
      .catch((loadError) => {
        setError(loadError?.message || 'Could not load AriZone posts.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authed]);

  async function loadPosts() {
    const res = await fetch('/api/admin/arizone');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not load AriZone posts.');
    setPosts(Array.isArray(data.posts) ? data.posts : []);
  }

  async function login(event) {
    event.preventDefault();
    setError('');
    setInfo('');

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
    setLoading(true);
    try {
      await loadPosts();
      setInfo('AriZone posts loaded.');
    } catch (loadError) {
      setError(loadError?.message || 'Could not load AriZone posts.');
    } finally {
      setLoading(false);
    }
  }

  function selectPost(post) {
    setSelectedId(post.id);
    setDraft(normalizeDraft({
      ...post,
    }));
    setInfo('');
    setError('');
  }

  async function savePost(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setInfo('');

    const payload = {
      ...draft,
      slug: draft.slug || slugifyText(draft.title),
      storageFolder: `arizone/posts/${draft.slug || slugifyText(draft.title)}`,
      contentPath: `arizone/posts/${draft.slug || slugifyText(draft.title)}/content.md`,
      coverImagePath: draft.coverImagePath || `arizone/posts/${draft.slug || slugifyText(draft.title)}/images/cover.webp`,
      isPublished: Boolean(draft.isPublished),
    };

    const hasExisting = Boolean(selectedId);
    const res = await fetch(hasExisting ? `/api/admin/arizone/${selectedId}` : '/api/admin/arizone', {
      method: hasExisting ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setSaving(false);
      setError(data.error || 'Could not save post.');
      return;
    }

    const nextPost = data.post;
    await loadPosts();
    if (nextPost?.id) {
      setSelectedId(nextPost.id);
      setDraft(normalizeDraft(nextPost));
    }
    setInfo(hasExisting ? 'Post updated.' : 'Post created.');
    setSaving(false);
  }

  async function deletePost() {
    if (!selectedId) return;
    if (!window.confirm('Delete this AriZone post?')) return;
    setSaving(true);
    setError('');
    setInfo('');

    const res = await fetch(`/api/admin/arizone/${selectedId}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setSaving(false);
      setError(data.error || 'Could not delete post.');
      return;
    }

    const nextPosts = posts.filter((post) => Number(post.id) !== Number(selectedId));
    setPosts(nextPosts);
    setSelectedId(null);
    setDraft(normalizeDraft());
    setInfo('Post deleted.');
    setSaving(false);
  }

  function updateField(name, value) {
    setDraft((prev) => {
      if (name === 'title') {
        const nextSlug = selectedId ? prev.slug : (slugifyText(value) || 'untitled');
        return {
          ...prev,
          title: value,
          slug: nextSlug,
          coverImagePath: prev.coverImagePath || `arizone/posts/${nextSlug}/images/cover.webp`,
        };
      }
      if (name === 'slug') {
        const nextSlug = slugifyText(value) || value || 'untitled';
        return {
          ...prev,
          slug: nextSlug,
          coverImagePath: prev.coverImagePath || `arizone/posts/${nextSlug}/images/cover.webp`,
        };
      }
      return { ...prev, [name]: value };
    });
  }

  async function uploadArizoneAsset(file, title, targetPath) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('section', 'AriZone');
    formData.append('sectionHref', '/arizone');
    formData.append('title', title || '');
    if (targetPath) formData.append('targetPath', targetPath);

    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Upload failed.');
    }
    return data.imageUrl;
  }

  async function uploadCover(file) {
    const nextSlug = draft.slug || slugifyText(draft.title) || 'untitled';
    return uploadArizoneAsset(file, 'cover', `arizone/posts/${nextSlug}/images/cover.webp`);
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="arizone-admin-title">
          <p className="eyebrow">Admin</p>
          <h2 id="arizone-admin-title">AriZone Posts</h2>
          <p className="contact-note">
            Manage AriZone metadata here. The markdown and images live in Supabase under `arizone/...`.
          </p>
          <p className="contact-note">
            <Link href="/admin/arizone">Start a fresh draft</Link>
          </p>

          {!authed ? (
            <form className="contact-card" onSubmit={login}>
              <label htmlFor="arizone-admin-password">Password</label>
              <input
                id="arizone-admin-password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="submit">Continue</button>
            </form>
          ) : (
            <>
              <form className="contact-card" onSubmit={savePost}>
                <label htmlFor="arizone-title">Title</label>
                <input
                  id="arizone-title"
                  type="text"
                  value={draft.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="Post title"
                  required
                />

                <label htmlFor="arizone-slug">Slug</label>
                <input
                  id="arizone-slug"
                  type="text"
                  value={draft.slug}
                  onChange={(event) => updateField('slug', event.target.value)}
                  placeholder="post-folder-name"
                  required
                />

                <label htmlFor="arizone-cover">Cover image</label>
                <input
                  ref={coverInputRef}
                  id="arizone-cover"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (event) => {
                    const file = event.target.files?.[0] || null;
                    if (!file) return;
                    try {
                      const uploadedUrl = await uploadCover(file);
                      setDraft((prev) => ({ ...prev, coverImagePath: uploadedUrl }));
                    } catch (uploadError) {
                      setError(uploadError?.message || 'Could not upload cover image.');
                    } finally {
                      if (coverInputRef.current) coverInputRef.current.value = '';
                    }
                  }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => coverInputRef.current?.click()}>
                    Upload Cover
                  </button>
                </div>
                {draft.coverImagePath ? (
                  <p className="contact-note" style={{ wordBreak: 'break-all' }}>{draft.coverImagePath}</p>
                ) : null}

                <MDCreatorComponent
                  label="Article"
                  value={draft.contentMarkdown}
                  onChange={(value) => updateField('contentMarkdown', value)}
                  onUploadImage={async (file) => {
                    const nextSlug = draft.slug || slugifyText(draft.title) || 'untitled';
                    const safeName = String(file?.name || 'image')
                      .replace(/\.[^.]+$/, '')
                      .normalize('NFKD')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '') || 'image';
                    return uploadArizoneAsset(file, safeName, `arizone/posts/${nextSlug}/images/${safeName}.webp`);
                  }}
                />

                <label htmlFor="arizone-published-at">Published date</label>
                <input
                  id="arizone-published-at"
                  type="date"
                  value={String(draft.publishedAt || '').slice(0, 10)}
                  onChange={(event) => updateField('publishedAt', event.target.value)}
                />

                <label htmlFor="arizone-is-published">Status</label>
                <select
                  id="arizone-is-published"
                  value={draft.isPublished ? 'published' : 'draft'}
                  onChange={(event) => updateField('isPublished', event.target.value === 'published')}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : selectedId ? 'Update Post' : 'Create Post'}
                  </button>
                  {selectedId ? (
                    <button type="button" className="playlist-watch-btn" onClick={deletePost} disabled={saving}>
                      Delete Post
                    </button>
                  ) : null}
                  {selectedPost?.slug ? (
                    <Link className="ai-channel-subscribe" href={`/arizone/${selectedPost.slug}`}>
                      Open Post
                    </Link>
                  ) : null}
                </div>
              </form>

              <div className="playlist-grid" style={{ marginTop: '1.25rem' }}>
                <article className="playlist-card">
                  <h3>Posts</h3>
                  {loading ? <p className="contact-note">Loading AriZone posts...</p> : null}
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        className="playlist-watch-btn"
                        style={{
                          display: 'block',
                          width: '100%',
                          marginBottom: '0.75rem',
                          textAlign: 'left',
                        }}
                        onClick={() => selectPost(post)}
                      >
                        <strong>{post.title || post.slug}</strong>
                        <br />
                        <span style={{ fontSize: '0.9em', opacity: 0.8 }}>
                          {formatDate(post.publishedAt)}
                          {' '}
                          | {post.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="contact-note">No AriZone posts yet.</p>
                  )}
                </article>
              </div>

              <div className="contact-card">
                <p className="contact-note">
                  Suggested folder layout:
                  <br />
                  <code>{draft.slug ? `arizone/posts/${draft.slug}` : 'arizone/posts/post-slug'}</code>
                  <br />
                  <code>{draft.slug ? `arizone/posts/${draft.slug}/content.md` : 'arizone/posts/post-slug/content.md'}</code>
                  <br />
                  <code>{draft.slug ? `arizone/posts/${draft.slug}/images/cover.webp` : 'arizone/posts/post-slug/images/cover.webp'}</code>
                </p>
              </div>
            </>
          )}

          {info ? <p className="contact-note">{info}</p> : null}
          {error ? <p className="contact-note">{error}</p> : null}
        </section>
      </main>
    </div>
  );
}
