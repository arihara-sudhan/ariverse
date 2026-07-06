import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../src/components/Header';
import MDCreatorComponent from '../../src/components/MDCreatorComponent';
import { isAdminRequest } from '../../lib/adminAuth';
import {
  buildArichuvadiDraft,
  buildArichuvadiPathsFromDraft,
  createArichuvadiPost,
  deleteArichuvadiPost,
  listArichuvadiAdminPosts,
  updateArichuvadiPost,
} from '../../lib/arichuvadiAdmin';
import {
  createArichuvadiCategory,
  deleteArichuvadiCategory,
  getArichuvadiCategoryById,
  listArichuvadiCategories,
  updateArichuvadiCategory,
} from '../../lib/arichuvadiAdmin';

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
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildDraft() {
  return buildArichuvadiDraft();
}

function normalizeDraft(post = {}) {
  const defaults = buildDraft();
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

export default function ArichuvadiAdminPage({ isAuthed, initialPosts }) {
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
        setError(loadError?.message || 'Could not load அரிச்சுவடி posts.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authed]);

  async function loadPosts() {
    const res = await fetch('/api/admin/arichuvadi');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not load அரிச்சுவடி posts.');
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
      setInfo('Arichuvadi posts loaded.');
    } catch (loadError) {
      setError(loadError?.message || 'Could not load அரிச்சுவடி posts.');
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

    const resolvedTitle = String(draft.title || '').trim() || ensureArichuvadiDraftTitle();
    if (!resolvedTitle) {
      setSaving(false);
      setError('Please enter a post name before saving.');
      return;
    }
    const resolvedSlug = slugifyText(String(draft.slug || '').trim() || resolvedTitle);
    if (!resolvedSlug) {
      setSaving(false);
      setError('Please enter an English folder name for this post.');
      return;
    }

    const paths = buildArichuvadiPathsFromDraft(draft);
    const payload = {
      ...draft,
      ...paths,
      title: resolvedTitle,
      slug: resolvedSlug,
      storageFolder: `arichuvadi/posts/${resolvedSlug}`,
      contentPath: `arichuvadi/posts/${resolvedSlug}/content.md`,
      coverImagePath: draft.coverImagePath || `arichuvadi/posts/${resolvedSlug}/images/cover.webp`,
      isPublished: Boolean(draft.isPublished),
    };

    const hasExisting = Boolean(selectedId);
    const res = await fetch(hasExisting ? `/api/admin/arichuvadi/${selectedId}` : '/api/admin/arichuvadi', {
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
    if (!window.confirm('Delete this அரிச்சுவடி post?')) return;
    setSaving(true);
    setError('');
    setInfo('');

    const res = await fetch(`/api/admin/arichuvadi/${selectedId}`, {
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
        const nextSlug = selectedId ? prev.slug : prev.slug;
        return {
          ...prev,
          title: value,
          slug: nextSlug,
          coverImagePath: nextSlug ? (prev.coverImagePath || `arichuvadi/posts/${nextSlug}/images/cover.webp`) : prev.coverImagePath,
        };
      }
      if (name === 'slug') {
        const nextSlug = String(value || '').trim();
        return {
          ...prev,
          slug: nextSlug,
          coverImagePath: nextSlug ? (prev.coverImagePath || `arichuvadi/posts/${nextSlug}/images/cover.webp`) : prev.coverImagePath,
        };
      }
      return { ...prev, [name]: value };
    });
  }

  function promptForArichuvadiTitle(currentTitle = '') {
    const fallbackTitle = String(currentTitle || '').trim();
    return String(
      window.prompt('Enter the Arichuvadi post name before uploading the cover image.', fallbackTitle) || '',
    ).trim();
  }

  function ensureArichuvadiDraftTitle() {
    const existingTitle = String(draft.title || '').trim();
    if (existingTitle) return existingTitle;

    const promptedTitle = promptForArichuvadiTitle(existingTitle);
    if (!promptedTitle) return '';

    const nextSlug = slugifyText(promptedTitle) || 'untitled';
    setDraft((prev) => ({
      ...prev,
      title: promptedTitle,
      slug: nextSlug,
      coverImagePath: prev.coverImagePath || `arichuvadi/posts/${nextSlug}/images/cover.webp`,
    }));
    return promptedTitle;
  }

  async function uploadArichuvadiAsset(file, title, targetPath) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('section', 'Arichuvadi');
    formData.append('sectionHref', '/arichuvadi');
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
    const resolvedTitle = ensureArichuvadiDraftTitle();
    if (!resolvedTitle) {
      throw new Error('Please enter a post name before uploading the cover image.');
    }

    const nextSlug = slugifyText(draft.slug || resolvedTitle);
    if (!nextSlug) {
      throw new Error('Please enter an English folder name for this post.');
    }
    return uploadArichuvadiAsset(file, resolvedTitle, `arichuvadi/posts/${nextSlug}/images/cover.webp`);
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="arichuvadi-admin-title">
          <p className="eyebrow">Admin</p>
          <h2 id="arichuvadi-admin-title">அரிச்சுவடி பதிவுகள்</h2>
          <p className="contact-note">
            Manage Arichuvadi metadata here. The markdown and images live in Supabase under `arichuvadi/...`.
          </p>

          {!authed ? (
            <form className="contact-card" onSubmit={login}>
              <label htmlFor="arichuvadi-admin-password">Password</label>
              <input
                id="arichuvadi-admin-password"
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
                <label htmlFor="arichuvadi-title">Post name</label>
                <input
                  id="arichuvadi-title"
                  type="text"
                  value={draft.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="Post name"
                  required
                />
                <p className="contact-note">This is the name you will keep for the post. It is used to build the folder and URL slug.</p>

                <label htmlFor="arichuvadi-slug">Folder / URL name</label>
                <input
                  id="arichuvadi-slug"
                  type="text"
                  value={draft.slug}
                  onChange={(event) => updateField('slug', event.target.value)}
                  placeholder="oyvu-naal"
                  required
                />
                <p className="contact-note">Use an English name here. It becomes the URL and folder name.</p>

                <label htmlFor="arichuvadi-cover">Cover image</label>
                <input
                  ref={coverInputRef}
                  id="arichuvadi-cover"
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
                    const resolvedTitle = String(draft.title || '').trim() || ensureArichuvadiDraftTitle();
                    if (!resolvedTitle) {
                      throw new Error('Please enter a post name before uploading inline images.');
                    }
                    const nextSlug = slugifyText(draft.slug || resolvedTitle);
                    if (!nextSlug) {
                      throw new Error('Please enter an English folder name for this post.');
                    }
                    const safeName = String(file?.name || 'image')
                      .replace(/\.[^.]+$/, '')
                      .normalize('NFKD')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '') || 'image';
                    return uploadArichuvadiAsset(file, resolvedTitle, `arichuvadi/posts/${nextSlug}/images/${safeName}.webp`);
                  }}
                />

                <label htmlFor="arichuvadi-published-at">Published date</label>
                <input
                  id="arichuvadi-published-at"
                  type="date"
                  value={String(draft.publishedAt || '').slice(0, 10)}
                  onChange={(event) => updateField('publishedAt', event.target.value)}
                />

                <label htmlFor="arichuvadi-is-published">Status</label>
                <select
                  id="arichuvadi-is-published"
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
                    <Link className="ai-channel-subscribe" href={`/arichuvadi/${selectedPost.slug}`}>
                      Open Post
                    </Link>
                  ) : null}
                </div>
              </form>

              <div className="playlist-grid" style={{ marginTop: '1.25rem' }}>
                <article className="playlist-card">
                  <h3>Posts</h3>
                  {loading ? <p className="contact-note">Loading Arichuvadi posts...</p> : null}
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
                    <p className="contact-note">No Arichuvadi posts yet.</p>
                  )}
                </article>
              </div>

              <div className="contact-card">
                <p className="contact-note">
                  Suggested folder layout:
                  <br />
                  <code>{draft.slug ? `arichuvadi/posts/${draft.slug}` : 'arichuvadi/posts/post-slug'}</code>
                  <br />
                  <code>{draft.slug ? `arichuvadi/posts/${draft.slug}/content.md` : 'arichuvadi/posts/post-slug/content.md'}</code>
                  <br />
                  <code>{draft.slug ? `arichuvadi/posts/${draft.slug}/images/cover.webp` : 'arichuvadi/posts/post-slug/images/cover.webp'}</code>
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
