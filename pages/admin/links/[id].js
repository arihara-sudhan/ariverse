import Link from 'next/link';
import { useState } from 'react';
import Header from '../../../src/components/Header';
import SectionHero from '../../../src/components/SectionHero';
import { isAdminRequest } from '../../../lib/adminAuth';
import { getProfileLinkById, getSectionHero, listLinkItems } from '../../../lib/adminData';

const DEFAULT_CLAY_QUOTE = 'Clay can be dirt in the wrong hands, but clay can be art in the right hands.';

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
      initialHero: await getSectionHero(linkId, link.label),
      initialItems: await listLinkItems(linkId),
    },
  };
}

export default function LinkAdminPage({ link, initialItems, initialHero }) {
  const isBinomialSection = link.label === 'Binomial Names';
  const isClayPlaySection = link.label === 'Clay Play';
  const isGuestLecturesSection = link.label === 'Guest Lectures';
  const isGallerySection = isClayPlaySection || isGuestLecturesSection;
  const isBooksReadSection = link.label === 'Books Read';
  const isKavithaiSection = link.label === 'Ariyin Kavithaigal';
  const isItemManagedSection = isBinomialSection || isGallerySection || isBooksReadSection || isKavithaiSection;
  const defaultHeroQuote = isClayPlaySection ? DEFAULT_CLAY_QUOTE : '';
  const [items, setItems] = useState(
    (initialItems || []).map((item) => ({
      ...item,
      markdownText:
        typeof item.markdownText === 'string' && item.markdownText.trim()
          ? item.markdownText
          : item.description || '',
    })),
  );
  const [error, setError] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [kavithaiFrom, setKavithaiFrom] = useState('');
  const [bookCategory, setBookCategory] = useState('ENGLISH');
  const [bookSubcategory, setBookSubcategory] = useState('FICTION');
  const [markdownText, setMarkdownText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [heroHeading, setHeroHeading] = useState(initialHero?.heading || link.label || '');
  const [heroDescription, setHeroDescription] = useState(initialHero?.description || '');
  const [heroQuote, setHeroQuote] = useState(initialHero?.quote || defaultHeroQuote);
  const [heroImageUrl, setHeroImageUrl] = useState(initialHero?.imageUrl || '');
  const [heroDraftHeading, setHeroDraftHeading] = useState(initialHero?.heading || link.label || '');
  const [heroDraftDescription, setHeroDraftDescription] = useState(initialHero?.description || '');
  const [heroDraftQuote, setHeroDraftQuote] = useState(initialHero?.quote || defaultHeroQuote);
  const [heroDraftImageUrl, setHeroDraftImageUrl] = useState(initialHero?.imageUrl || '');
  const [editingHero, setEditingHero] = useState(false);
  const [savingHero, setSavingHero] = useState(false);

  const [dragState, setDragState] = useState({ scope: '', itemId: null, fromIndex: -1 });

  function reorderList(list, fromIndex, toIndex) {
    if (!Array.isArray(list)) return [];
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;
    if (fromIndex >= list.length || toIndex >= list.length) return list;
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }

  async function uploadImage(file, title, meta = {}) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('section', link.label || '');
    formData.append('title', title || '');
    if (isBooksReadSection) {
      formData.append('category', meta.category || bookCategory || 'ENGLISH');
      formData.append('subcategory', meta.subcategory || bookSubcategory || 'FICTION');
    }

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

  async function saveHero(event) {
    event.preventDefault();
    setSavingHero(true);
    setError('');
    const res = await fetch('/api/admin/link-hero', {
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
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setSavingHero(false);
      setError(data.error || 'Could not save hero.');
      return;
    }

    const nextHeading = data.hero?.heading || heroDraftHeading;
    const nextDescription = data.hero?.description || heroDraftDescription;
    const nextQuote = data.hero?.quote || heroDraftQuote;
    const nextImageUrl = data.hero?.imageUrl || heroDraftImageUrl;
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

  function startHeroEdit() {
    setHeroDraftHeading(heroHeading || link.label || '');
    setHeroDraftDescription(heroDescription || '');
    setHeroDraftQuote(heroQuote || defaultHeroQuote);
    setHeroDraftImageUrl(heroImageUrl || '');
    setEditingHero(true);
  }

  function cancelHeroEdit() {
    setHeroDraftHeading(heroHeading || link.label || '');
    setHeroDraftDescription(heroDescription || '');
    setHeroDraftQuote(heroQuote || defaultHeroQuote);
    setHeroDraftImageUrl(heroImageUrl || '');
    setEditingHero(false);
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
        imageUrls: isGallerySection ? imageUrls : undefined,
        youtubeUrl: isBinomialSection ? youtubeUrl : '',
        markdownText,
        kavithaiFrom,
        category: isBooksReadSection ? bookCategory : undefined,
        subcategory: isBooksReadSection ? bookSubcategory : undefined,
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
    setBookCategory('ENGLISH');
    setBookSubcategory('FICTION');
    setMarkdownText('');
    setSaving(false);
  }

  function handleCreateBookCategoryChange(nextCategory) {
    const normalized = nextCategory === 'TAMIL' ? 'TAMIL' : 'ENGLISH';
    setBookCategory(normalized);
    setBookSubcategory(normalized === 'TAMIL' ? 'புனைவு' : 'FICTION');
  }

  function handleEditBookCategoryChange(item, nextCategory) {
    const normalized = nextCategory === 'TAMIL' ? 'TAMIL' : 'ENGLISH';
    updateLocalItem(item.id, {
      category: normalized,
      subcategory: normalized === 'TAMIL' ? 'புனைவு' : 'FICTION',
    });
  }

  async function saveItem(item) {
    const payload = {
      ...item,
      linkId: item.linkId || link.id,
    };

    if (isGallerySection) {
      const currentUrls = Array.isArray(item.imageUrls) ? item.imageUrls : [];
      payload.imageUrls = currentUrls.length > 0 ? currentUrls : item.imageUrl ? [item.imageUrl] : [];
      payload.imageUrl = item.imageUrl || payload.imageUrls[0] || '';
    }

    const res = await fetch('/api/admin/link-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Could not save item.');
      return false;
    }

    setError('');
    return true;
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

          <section className="contact-card">
            <p className="contact-note">Hero section (used in this page).</p>
            <SectionHero
              heading={editingHero ? heroDraftHeading : heroHeading}
              description={editingHero ? heroDraftDescription : heroDescription}
              imageUrl={editingHero ? heroDraftImageUrl : heroImageUrl}
              fallbackHeading={link.label}
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
                  placeholder="Write hero description..."
                />
                <label htmlFor="hero-quote">Hero Quote</label>
                <input
                  id="hero-quote"
                  type="text"
                  value={heroDraftQuote}
                  onChange={(event) => setHeroDraftQuote(event.target.value)}
                  placeholder="Optional quote shown below description"
                />
                <label htmlFor="hero-image-upload">Hero Image Upload</label>
                <input
                  id="hero-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length === 0) return;
                    setUploading(true);
                    setError('');
                    try {
                      const uploadedUrl = await uploadImage(files[0], 'hero');
                      setHeroDraftImageUrl(uploadedUrl);
                    } catch (uploadError) {
                      setError(uploadError.message || 'Upload failed.');
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
                {heroDraftImageUrl ? <p className="contact-note">Hero image: {heroDraftImageUrl}</p> : null}
                <div className="admin-item-actions">
                  <button type="submit" disabled={savingHero || uploading}>
                    {savingHero ? 'Saving Hero...' : uploading ? 'Uploading...' : 'Save Hero'}
                  </button>
                  <button type="button" onClick={cancelHeroEdit}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          {isItemManagedSection ? (
          <form className="contact-card" onSubmit={addItem}>
            <label htmlFor="item-kavithai-from">
              {isBinomialSection ? 'Entry Name' : isGallerySection || isBooksReadSection || isKavithaiSection ? 'Title' : 'Kavithai Name'}
            </label>
            <input
              id="item-kavithai-from"
              value={kavithaiFrom}
              onChange={(event) => setKavithaiFrom(event.target.value)}
              required
            />
            {isBooksReadSection ? (
              <>
                <label htmlFor="item-book-category">Category</label>
                <select
                  id="item-book-category"
                  value={bookCategory}
                  onChange={(event) => handleCreateBookCategoryChange(event.target.value)}
                  required
                >
                  <option value="ENGLISH">English</option>
                  <option value="TAMIL">Tamil</option>
                </select>
                <label htmlFor="item-book-subcategory">Subcategory</label>
                <select
                  id="item-book-subcategory"
                  value={bookSubcategory}
                  onChange={(event) => setBookSubcategory(event.target.value)}
                  required
                >
                  {bookCategory === 'ENGLISH' ? (
                    <>
                      <option value="FICTION">Fiction</option>
                      <option value="NON_FICTION">Non Fiction</option>
                    </>
                  ) : (
                    <>
                      <option value="புனைவு">புனைவு</option>
                      <option value="புனைவிலி">புனைவிலி</option>
                    </>
                  )}
                </select>
              </>
            ) : null}

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
                  {isGallerySection ? 'Upload images' : 'Upload image'}
                </label>
                <input
                  id="item-image-upload"
                  type="file"
                  accept="image/*"
                  multiple={isGallerySection}
                  onChange={async (event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length === 0) return;
                    setUploading(true);
                    setError('');
                    try {
                      if (isGallerySection) {
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
                {isGallerySection ? (
                  imageUrls.length > 0 ? (
                    <div className="admin-upload-list">
                      {imageUrls.map((url, index) => (
                        <div
                          key={url}
                          className="admin-upload-item"
                          draggable
                          onDragStart={() => setDragState({ scope: 'new', itemId: null, fromIndex: index })}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (dragState.scope !== 'new') return;
                            setImageUrls((prev) => reorderList(prev, dragState.fromIndex, index));
                            setDragState({ scope: '', itemId: null, fromIndex: -1 });
                          }}
                          onDragEnd={() => setDragState({ scope: '', itemId: null, fromIndex: -1 })}
                        >
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
              {isBinomialSection || isBooksReadSection ? 'Caption' : isGallerySection ? 'Write-up' : 'Markdown (.md) content'}
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
          ) : null}

          {isItemManagedSection ? (
          <div className={isBinomialSection ? 'admin-compact-list' : 'playlist-grid'}>
            {items.map((item) => (
              <article key={item.id} className={isBinomialSection ? 'admin-compact-item' : 'playlist-card'}>
                {!isBinomialSection && item.imageUrl ? (
                  <img className="playlist-thumb" src={item.imageUrl} alt={item.kavithaiFrom || 'Kavithai image'} />
                ) : null}
                <p className="admin-item-title">{item.kavithaiFrom || 'Untitled'}</p>
                {isBooksReadSection ? (
                  <p className="contact-note" style={{ margin: '0.25rem 0 0' }}>
                    {(item.category || 'ENGLISH') === 'TAMIL'
                      ? `Tamil - ${item.subcategory || 'புனைவு'}`
                      : `English - ${(item.subcategory || 'FICTION').replace('_', ' ')}`}
                  </p>
                ) : null}
                {isBinomialSection && item.youtubeUrl ? (
                  <p className="contact-note" style={{ margin: '0.25rem 0 0', wordBreak: 'break-all' }}>
                    {item.youtubeUrl}
                  </p>
                ) : null}

                {editingItemId === item.id ? (
                  <div className="admin-item-editor">
                    <label htmlFor={`edit-name-${item.id}`}>
                      {isBinomialSection ? 'Entry Name' : isGallerySection || isBooksReadSection ? 'Title' : 'Kavithai Name'}
                    </label>
                    <input
                      id={`edit-name-${item.id}`}
                      value={item.kavithaiFrom || ''}
                      placeholder={isBinomialSection ? 'Entry Name' : isGallerySection || isBooksReadSection ? 'Title' : 'Kavithai Name'}
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
                    ) : isBooksReadSection ? (
                      <>
                        <label htmlFor={`edit-book-category-${item.id}`}>Category</label>
                        <select
                          id={`edit-book-category-${item.id}`}
                          value={item.category || 'ENGLISH'}
                          onChange={(event) => handleEditBookCategoryChange(item, event.target.value)}
                        >
                          <option value="ENGLISH">English</option>
                          <option value="TAMIL">Tamil</option>
                        </select>
                        <label htmlFor={`edit-book-subcategory-${item.id}`}>Subcategory</label>
                        <select
                          id={`edit-book-subcategory-${item.id}`}
                          value={item.subcategory || ((item.category || 'ENGLISH') === 'TAMIL' ? 'புனைவு' : 'FICTION')}
                          onChange={(event) => updateLocalItem(item.id, { subcategory: event.target.value })}
                        >
                          {(item.category || 'ENGLISH') === 'TAMIL' ? (
                            <>
                              <option value="புனைவு">புனைவு</option>
                              <option value="புனைவிலி">புனைவிலி</option>
                            </>
                          ) : (
                            <>
                              <option value="FICTION">Fiction</option>
                              <option value="NON_FICTION">Non Fiction</option>
                            </>
                          )}
                        </select>
                        <label htmlFor={`edit-image-${item.id}`}>Replace Cover</label>
                        <input
                          id={`edit-image-${item.id}`}
                          type="file"
                          accept="image/*"
                          onChange={async (event) => {
                            const files = Array.from(event.target.files || []);
                            if (files.length === 0) return;
                            setError('');
                            try {
                              const uploadedUrl = await uploadImage(files[0], item.kavithaiFrom, {
                                category: item.category || 'ENGLISH',
                                subcategory: item.subcategory || ((item.category || 'ENGLISH') === 'TAMIL' ? 'புனைவு' : 'FICTION'),
                              });
                              updateLocalItem(item.id, { imageUrl: uploadedUrl });
                            } catch (uploadError) {
                              setError(uploadError.message || 'Upload failed.');
                            }
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <label htmlFor={`edit-image-${item.id}`}>Replace Image</label>
                        <input
                          id={`edit-image-${item.id}`}
                          type="file"
                          accept="image/*"
                          multiple={isGallerySection}
                          onChange={async (event) => {
                            const files = Array.from(event.target.files || []);
                            if (files.length === 0) return;
                            setError('');
                            try {
                              if (isGallerySection) {
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
                        {isGallerySection && Array.isArray(item.imageUrls) && item.imageUrls.length > 0 ? (
                          <div className="admin-upload-list">
                            {item.imageUrls.map((url, index) => (
                              <div
                                key={`${item.id}-${url}-${index}`}
                                className="admin-upload-item"
                                draggable
                                onDragStart={() =>
                                  setDragState({
                                    scope: 'edit',
                                    itemId: item.id,
                                    fromIndex: index,
                                  })
                                }
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  if (dragState.scope !== 'edit' || dragState.itemId !== item.id) return;
                                  const nextUrls = reorderList(item.imageUrls, dragState.fromIndex, index);
                                  updateLocalItem(item.id, {
                                    imageUrl: nextUrls[0] || '',
                                    imageUrls: nextUrls,
                                  });
                                  setDragState({ scope: '', itemId: null, fromIndex: -1 });
                                }}
                                onDragEnd={() => setDragState({ scope: '', itemId: null, fromIndex: -1 })}
                              >
                                <img className="admin-upload-thumb" src={url} alt="Gallery preview" />
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
                      {isBinomialSection || isBooksReadSection ? 'Caption' : isGallerySection ? 'Write-up' : 'Poem'}
                    </label>
                    <textarea
                      id={`edit-markdown-${item.id}`}
                      rows="8"
                      value={item.markdownText || item.description || ''}
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
                          const didSave = await saveItem(item);
                          if (didSave) {
                            setEditingItemId(null);
                          }
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
          ) : null}

          {error && <p className="contact-note">{error}</p>}
        </section>
      </main>
    </div>
  );
}
