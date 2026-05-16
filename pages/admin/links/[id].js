import Link from 'next/link';
import { useState } from 'react';
import Header from '../../../src/components/Header';
import { isAdminRequest } from '../../../lib/adminAuth';
import { getProfileLinkById, listLinkItems } from '../../../lib/adminData';

export async function getServerSideProps({ req, params }) {
  if (!isAdminRequest(req)) {
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }

  const linkId = Number(params?.id);
  if (!Number.isInteger(linkId) || linkId <= 0) {
    return { notFound: true };
  }

  const link = await getProfileLinkById(linkId);
  if (!link) {
    return { notFound: true };
  }

  return {
    props: {
      link,
      initialItems: await listLinkItems(linkId),
    },
  };
}

export default function LinkAdminPage({ link, initialItems }) {
  const isBinomialSection = link.label === 'Binomial Names';
  const isClayPlaySection = link.label === 'Clay Play';
  const [items, setItems] = useState(initialItems || []);
  const [error, setError] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [kavithaiFrom, setKavithaiFrom] = useState('');
  const [markdownText, setMarkdownText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file, title) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('section', link.label || '');
    formData.append('title', title || '');

    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Upload failed.');
    }

    return data.imageUrl;
  }

  async function uploadMultipleImages(files, title) {
    const uploaded = [];
    for (const file of files) {
      const url = await uploadImage(file, title);
      uploaded.push(url);
    }
    return uploaded;
  }

  async function addItem(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/admin/link-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkId: link.id,
        imageUrl: isBinomialSection ? '' : imageUrl,
        imageUrls: isClayPlaySection ? imageUrls : undefined,
        youtubeUrl: isBinomialSection ? youtubeUrl : '',
        markdownText,
        kavithaiFrom,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSaving(false);
      setError(data.error || 'Could not add item.');
      return;
    }

    setItems((prev) => [...prev, data.item]);
    setImageUrl('');
    setImageUrls([]);
    setYoutubeUrl('');
    setKavithaiFrom('');
    setMarkdownText('');
    setSaving(false);
  }

  async function saveItem(item) {
    const res = await fetch('/api/admin/link-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });

    if (!res.ok) {
      setError('Could not save item.');
    }
  }

  async function deleteItem(id) {
    const res = await fetch('/api/admin/link-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, linkId: link.id }),
    });

    if (!res.ok) {
      setError('Could not delete item.');
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateLocalItem(id, patch) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="link-admin-title">
          <p className="eyebrow">Section Admin</p>
          <h2 id="link-admin-title">{link.label}</h2>
          <p className="contact-note"><Link href="/admin">Back to Admin</Link></p>

          <form className="contact-card" onSubmit={addItem}>
            <label htmlFor="item-kavithai-from">
              {isBinomialSection ? 'Entry Name' : isClayPlaySection ? 'Title' : 'Kavithai Name'}
            </label>
            <input
              id="item-kavithai-from"
              value={kavithaiFrom}
              onChange={(event) => setKavithaiFrom(event.target.value)}
              required
            />

            {isBinomialSection ? (
              <>
                <label htmlFor="item-youtube-url">YouTube video URL</label>
                <input
                  id="item-youtube-url"
                  type="url"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="https://youtu.be/..."
                  required
                />
              </>
            ) : (
              <>
                <label htmlFor="item-image-upload">
                  {isClayPlaySection ? 'Upload images' : 'Upload image'}
                </label>
                <input
                  id="item-image-upload"
                  type="file"
                  accept="image/*"
                  multiple={isClayPlaySection}
                  onChange={async (event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length === 0) return;
                    setUploading(true);
                    setError('');
                    try {
                      if (isClayPlaySection) {
                        const uploadedUrls = await uploadMultipleImages(files, kavithaiFrom);
                        setImageUrls((prev) => [...prev, ...uploadedUrls]);
                        setImageUrl((prev) => prev || uploadedUrls[0] || '');
                      } else {
                        const uploadedUrl = await uploadImage(files[0], kavithaiFrom);
                        setImageUrl(uploadedUrl);
                      }
                    } catch (uploadError) {
                      setError(uploadError.message || 'Upload failed.');
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
                {isClayPlaySection ? (
                  imageUrls.length > 0 ? (
                    <div className="admin-upload-list">
                      {imageUrls.map((url) => (
                        <div key={url} className="admin-upload-item">
                          <span>{url}</span>
                          <button
                            type="button"
                            onClick={() => setImageUrls((prev) => prev.filter((item) => item !== url))}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null
                ) : (
                  imageUrl && <p className="contact-note">Uploaded: {imageUrl}</p>
                )}
              </>
            )}

            <label htmlFor="item-markdown">
              {isBinomialSection ? 'Caption' : isClayPlaySection ? 'Write-up' : 'Markdown (.md) content'}
            </label>
            <textarea
              id="item-markdown"
              rows="7"
              value={markdownText}
              onChange={(event) => setMarkdownText(event.target.value)}
              required
            />

            <button type="submit" disabled={saving || uploading}>
              {saving ? 'Adding...' : uploading ? 'Uploading...' : 'Add Item'}
            </button>
          </form>

          <div className={isBinomialSection ? 'admin-compact-list' : 'playlist-grid'}>
            {items.map((item) => (
              <article key={item.id} className={isBinomialSection ? 'admin-compact-item' : 'playlist-card'}>
                {!isBinomialSection && item.imageUrl ? (
                  <img className="playlist-thumb" src={item.imageUrl} alt={item.kavithaiFrom || 'Kavithai image'} />
                ) : null}
                <p className="admin-item-title">{item.kavithaiFrom || 'Untitled'}</p>
                {isBinomialSection && item.youtubeUrl ? (
                  <p className="contact-note" style={{ margin: '0.25rem 0 0', wordBreak: 'break-all' }}>
                    {item.youtubeUrl}
                  </p>
                ) : null}

                {editingItemId === item.id ? (
                  <div className="admin-item-editor">
                    <label htmlFor={`edit-name-${item.id}`}>
                      {isBinomialSection ? 'Entry Name' : isClayPlaySection ? 'Title' : 'Kavithai Name'}
                    </label>
                    <input
                      id={`edit-name-${item.id}`}
                      value={item.kavithaiFrom || ''}
                      placeholder={isBinomialSection ? 'Entry Name' : isClayPlaySection ? 'Title' : 'Kavithai Name'}
                      onChange={(event) => updateLocalItem(item.id, { kavithaiFrom: event.target.value })}
                    />

                    {isBinomialSection ? (
                      <>
                        <label htmlFor={`edit-youtube-${item.id}`}>YouTube video URL</label>
                        <input
                          id={`edit-youtube-${item.id}`}
                          type="url"
                          value={item.youtubeUrl || ''}
                          placeholder="https://youtu.be/..."
                          onChange={(event) => updateLocalItem(item.id, { youtubeUrl: event.target.value })}
                        />
                      </>
                    ) : (
                      <>
                        <label htmlFor={`edit-image-${item.id}`}>Replace Image</label>
                        <input
                          id={`edit-image-${item.id}`}
                          type="file"
                          accept="image/*"
                          multiple={isClayPlaySection}
                          onChange={async (event) => {
                            const files = Array.from(event.target.files || []);
                            if (files.length === 0) return;
                            setError('');
                            try {
                              if (isClayPlaySection) {
                                const uploadedUrls = await uploadMultipleImages(files, item.kavithaiFrom);
                                const currentUrls = Array.isArray(item.imageUrls) ? item.imageUrls : [];
                                const nextUrls = [...currentUrls, ...uploadedUrls];
                                updateLocalItem(item.id, {
                                  imageUrl: nextUrls[0] || '',
                                  imageUrls: nextUrls,
                                });
                              } else {
                                const uploadedUrl = await uploadImage(files[0], item.kavithaiFrom);
                                updateLocalItem(item.id, { imageUrl: uploadedUrl });
                              }
                            } catch (uploadError) {
                              setError(uploadError.message || 'Upload failed.');
                            }
                          }}
                        />
                        {isClayPlaySection && Array.isArray(item.imageUrls) && item.imageUrls.length > 0 ? (
                          <div className="admin-upload-list">
                            {item.imageUrls.map((url) => (
                              <div key={`${item.id}-${url}`} className="admin-upload-item">
                                <span>{url}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextUrls = item.imageUrls.filter((entryUrl) => entryUrl !== url);
                                    updateLocalItem(item.id, {
                                      imageUrl: nextUrls[0] || '',
                                      imageUrls: nextUrls,
                                    });
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}

                    <label htmlFor={`edit-markdown-${item.id}`}>
                      {isBinomialSection ? 'Caption' : isClayPlaySection ? 'Write-up' : 'Poem'}
                    </label>
                    <textarea
                      id={`edit-markdown-${item.id}`}
                      rows="8"
                      value={item.markdownText || ''}
                      onChange={(event) => updateLocalItem(item.id, { markdownText: event.target.value })}
                    />
                  </div>
                ) : null}

                <div className="admin-item-actions">
                  {editingItemId === item.id ? (
                    <>
                      <button
                        type="button"
                        className="playlist-watch-btn admin-item-action-btn"
                        onClick={async () => {
                          await saveItem(item);
                          setEditingItemId(null);
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="playlist-watch-btn admin-item-action-btn"
                        onClick={() => setEditingItemId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="playlist-watch-btn admin-item-action-btn"
                      onClick={() => setEditingItemId(item.id)}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="playlist-watch-btn admin-item-action-btn"
                    onClick={() => deleteItem(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          {error && <p className="contact-note">{error}</p>}
        </section>
      </main>
    </div>
  );
}
