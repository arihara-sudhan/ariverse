import Link from 'next/link';
import { useRef, useState } from 'react';
import Header from '../../../src/components/Header';
import SectionHero from '../../../src/components/SectionHero';
import { isAdminRequest } from '../../../lib/adminAuth';
import { getProfileLinkById, getSectionHero, listLinkItems } from '../../../lib/adminData';

const DEFAULT_CLAY_QUOTE = 'Clay can be dirt in the wrong hands, but clay can be art in the right hands.';
const DEFAULT_PROJECT_CATEGORIES = ['Deep Learning', 'Product Engineering', 'AI Engineering', 'Robotic Process Automation'];

function slugifyImageName(input) {
  const cleaned = String(input || '')
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  return cleaned || 'Inline Image';
}

function insertAnchoredImageToken(text, imageName, imageUrl, caretStart = null, caretEnd = null) {
  const source = String(text || '');
  const name = slugifyImageName(imageName);
  const markerLine = `[ARIVERSE_IMAGE] ${name}`;
  const mapLine = `[ARIVERSE_IMAGE_URL] ${name} :: ${String(imageUrl || '').trim()}`;
  const hasMapLine = source.includes(mapLine);
  const start = Number.isInteger(caretStart) ? Math.max(0, Math.min(caretStart, source.length)) : source.length;
  const end = Number.isInteger(caretEnd) ? Math.max(start, Math.min(caretEnd, source.length)) : start;
  const prefix = source.slice(0, start);
  const suffix = source.slice(end);
  const before = `${prefix}${prefix && !prefix.endsWith('\n') ? '\n' : ''}`;
  const after = `${suffix && !suffix.startsWith('\n') ? '\n' : ''}${suffix}`;
  const withMarker = `${before}${markerLine}${after}`.replace(/\n{3,}/g, '\n\n');
  if (hasMapLine) return withMarker;
  return `${withMarker}${withMarker.endsWith('\n') ? '' : '\n'}\n${mapLine}\n`;
}

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

  const initialItemsRaw = await listLinkItems(linkId);
  const initialItems = (initialItemsRaw || []).map((item) => ({
    ...item,
    createdAt: item?.createdAt instanceof Date ? item.createdAt.toISOString() : item?.createdAt || '',
  }));

  return {
    props: {
      link,
      initialHero: await getSectionHero(linkId, link.label),
      initialItems,
    },
  };
}

export default function LinkAdminPage({ link, initialItems, initialHero }) {
  const sectionLabel = String(link?.label || '').trim();
  const isBinomialSection = sectionLabel === 'Binomial Names';
  const isClayPlaySection = sectionLabel === 'Clay Play';
  const isGuestLecturesSection = sectionLabel === 'Guest Lectures';
  const isGallerySection = isClayPlaySection || isGuestLecturesSection;
  const isBooksReadSection = sectionLabel === 'Books Read';
  const isExperimentsSection = sectionLabel === 'Experiments';
  const isMiniProjectsSection = sectionLabel === 'Mini-Projects';
  const isProjectsSection = sectionLabel === 'Projects';
  const isCareerSection = sectionLabel === 'Career' || sectionLabel === 'Works' || sectionLabel === 'Experience';
  const isKavithaiSection = sectionLabel === 'அரியின் கவிதைகள்' || sectionLabel === 'Ariyin Kavithaigal';
  const isItemManagedSection = isBinomialSection || isGallerySection || isBooksReadSection || isKavithaiSection || isMiniProjectsSection || isProjectsSection || isCareerSection || isExperimentsSection;
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
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [kavithaiFrom, setKavithaiFrom] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [dateText, setDateText] = useState('');
  const [miniProjectCategory, setMiniProjectCategory] = useState('');
  const [newMiniProjectCategory, setNewMiniProjectCategory] = useState('');
  const [projectCategory, setProjectCategory] = useState(DEFAULT_PROJECT_CATEGORIES[0]);
  const [newProjectCategory, setNewProjectCategory] = useState('');
  const [bookCategory, setBookCategory] = useState('ENGLISH');
  const [bookSubcategory, setBookSubcategory] = useState('FICTION');
  const [markdownText, setMarkdownText] = useState('');
  const [bigDescription, setBigDescription] = useState('');
  const [projectTags, setProjectTags] = useState([]);
  const [newProjectTag, setNewProjectTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [pendingSaveIds, setPendingSaveIds] = useState([]);
  const [commentsByProjectId, setCommentsByProjectId] = useState({});
  const [loadingCommentsFor, setLoadingCommentsFor] = useState([]);
  const commentsSectionKey = isProjectsSection
    ? 'projects'
    : isExperimentsSection
      ? 'xperiments'
      : isKavithaiSection
        ? 'kavithaigal'
        : isGuestLecturesSection
          ? 'guest-lectures'
          : isClayPlaySection
            ? 'clay-play'
          : '';
  const supportsComments = isProjectsSection || isExperimentsSection || isKavithaiSection || isGuestLecturesSection || isClayPlaySection;
  const projectCategoryOptions = Array.from(
    new Set([
      ...DEFAULT_PROJECT_CATEGORIES,
      String(projectCategory || '').trim(),
      ...(items || []).map((item) => String(item?.category || '').trim()).filter(Boolean),
    ]),
  );
  const miniProjectCategoryOptions = Array.from(
    new Set([
      String(miniProjectCategory || '').trim(),
      ...(items || []).map((item) => String(item?.category || '').trim()).filter(Boolean),
    ]),
  );
  const availableProjectTags = isProjectsSection
    ? Array.from(
        new Set(
          (items || [])
            .flatMap((item) => (Array.isArray(item.projectTags) ? item.projectTags : []))
            .map((tag) => String(tag || '').trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b))
    : [];

  function addProjectTagToSelection(rawTag, itemId = null) {
    const cleaned = String(rawTag || '').trim();
    if (!cleaned) return;
    if (itemId) {
      const target = items.find((entry) => entry.id === itemId);
      const current = Array.isArray(target?.projectTags) ? target.projectTags : [];
      if (current.includes(cleaned)) return;
      updateLocalItem(itemId, { projectTags: [...current, cleaned] });
      return;
    }
    setProjectTags((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
  }
  const existingCareerLogos = isCareerSection
    ? Array.from(new Set((items || []).map((item) => String(item?.companyLogoUrl || '').trim()).filter(Boolean)))
    : [];

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
  const inlineImageInputRef = useRef(null);
  const createBigDescriptionRef = useRef(null);
  const editBigDescriptionRefs = useRef({});
  const inlineImageTargetRef = useRef({ mode: 'create', itemId: null, selectionStart: null, selectionEnd: null });

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
    formData.append('sectionHref', link.href || '');
    formData.append('title', title || '');
    if (meta.currentUrl) formData.append('currentUrl', meta.currentUrl);
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
    const concurrency = 3;
    const queue = [...files];
    const uploaded = [];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) continue;
        const url = await uploadImage(file, title);
        uploaded.push(url);
      }
    });
    await Promise.all(workers);
    return uploaded;
  }

  function openInlineImagePicker(target) {
    if (!isExperimentsSection) return;
    inlineImageTargetRef.current = target;
    if (inlineImageInputRef.current) {
      inlineImageInputRef.current.value = '';
      inlineImageInputRef.current.click();
    }
  }

  function triggerInlineImageUpload(target, textarea = null) {
    if (!isExperimentsSection) return;
    openInlineImagePicker({
      ...target,
      selectionStart: textarea ? textarea.selectionStart : null,
      selectionEnd: textarea ? textarea.selectionEnd : null,
    });
  }

  async function handleInlineImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const file = files[0];
    const target = inlineImageTargetRef.current || { mode: 'create', itemId: null, selectionStart: null, selectionEnd: null };
    setUploadingInlineImage(true);
    setError('');
    try {
      const imageUrl = await uploadImage(file, `${kavithaiFrom || 'experiment'}-inline`);
      const imageName = slugifyImageName(file.name);
      if (target.mode === 'edit' && target.itemId) {
        const item = items.find((entry) => entry.id === target.itemId);
        if (!item) return;
        updateLocalItem(target.itemId, {
          bigDescription: insertAnchoredImageToken(
            item.bigDescription || '',
            imageName,
            imageUrl,
            target.selectionStart,
            target.selectionEnd,
          ),
        });
        return;
      }
      setBigDescription((prev) =>
        insertAnchoredImageToken(
          prev,
          imageName,
          imageUrl,
          target.selectionStart,
          target.selectionEnd,
        ),
      );
    } catch (uploadError) {
      setError(uploadError.message || 'Inline image upload failed.');
    } finally {
      setUploadingInlineImage(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = '';
    }
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
        companyLogoUrl: isCareerSection ? companyLogoUrl : '',
        imageUrls: isGallerySection ? imageUrls : undefined,
        youtubeUrl: isBinomialSection || isMiniProjectsSection || isExperimentsSection ? youtubeUrl : '',
        markdownText,
        bigDescription: isProjectsSection || isExperimentsSection ? bigDescription : '',
        projectTags: isProjectsSection ? projectTags : [],
        kavithaiFrom,
        subtitle: isCareerSection ? subtitle : '',
        dateText: isCareerSection ? dateText : '',
        category: isMiniProjectsSection ? miniProjectCategory : isProjectsSection ? projectCategory : isBooksReadSection ? bookCategory : undefined,
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
    setCompanyLogoUrl('');
    setImageUrls([]);
    setYoutubeUrl('');
    setKavithaiFrom('');
    setSubtitle('');
    setDateText('');
    setMiniProjectCategory('');
    setNewMiniProjectCategory('');
    setProjectCategory(DEFAULT_PROJECT_CATEGORIES[0]);
    setBookCategory('ENGLISH');
    setBookSubcategory('FICTION');
    setMarkdownText('');
    setBigDescription('');
    setProjectTags([]);
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
    setPendingSaveIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    try {
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
        setPendingSaveIds((prev) => prev.filter((id) => id !== item.id));
        return;
      }

      setError('');
      setPendingSaveIds((prev) => prev.filter((id) => id !== item.id));
    } catch (_error) {
      setError('Could not save item.');
      setPendingSaveIds((prev) => prev.filter((id) => id !== item.id));
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

  async function loadSectionComments(entryId) {
    if (!supportsComments) return;
    const key = entryId;
    const endpoint = isProjectsSection
      ? `/api/projects/comments?projectEntryId=${entryId}&includePending=true`
      : `/api/content/comments?section=${encodeURIComponent(commentsSectionKey)}&entryId=${entryId}&includePending=true`;
    setLoadingCommentsFor((prev) => (prev.includes(key) ? prev : [...prev, key]));
    try {
      const res = await fetch(endpoint);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not load comments.');
        setLoadingCommentsFor((prev) => prev.filter((id) => id !== key));
        return;
      }
      setCommentsByProjectId((prev) => ({ ...prev, [key]: Array.isArray(data.comments) ? data.comments : [] }));
      setLoadingCommentsFor((prev) => prev.filter((id) => id !== key));
    } catch (_error) {
      setError('Could not load comments.');
      setLoadingCommentsFor((prev) => prev.filter((id) => id !== key));
    }
  }

  async function deleteSectionCommentForAdmin(entryId, commentId) {
    if (!supportsComments) return;
    const endpoint = isProjectsSection ? '/api/projects/comments' : '/api/content/comments';
    const body = isProjectsSection
      ? { projectEntryId: entryId, commentId }
      : { section: commentsSectionKey, entryId, commentId };
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not delete comment.');
      return;
    }
    setCommentsByProjectId((prev) => ({
      ...prev,
      [entryId]: (prev[entryId] || []).filter((item) => item.id !== commentId),
    }));
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="link-admin-title">
          <input
            ref={inlineImageInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleInlineImageUpload}
          />
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
                      const uploadedUrl = await uploadImage(files[0], 'hero', {
                        currentUrl: heroDraftImageUrl || heroImageUrl || '',
                      });
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
              {isMiniProjectsSection || isProjectsSection || isExperimentsSection ? 'Project Title' : isBinomialSection ? 'Entry Name' : isGallerySection || isBooksReadSection || isKavithaiSection || isCareerSection ? 'Title' : 'Kavithai Name'}
            </label>
            <input
              id="item-kavithai-from"
              value={kavithaiFrom}
              onChange={(event) => setKavithaiFrom(event.target.value)}
              required
            />
            {isCareerSection ? (
              <>
                <label htmlFor="item-subtitle">Subtitle</label>
                <input
                  id="item-subtitle"
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  placeholder="e.g., Nov 2024 - Present"
                />
                <label htmlFor="item-date-text">Date Text</label>
                <input
                  id="item-date-text"
                  value={dateText}
                  onChange={(event) => setDateText(event.target.value)}
                  placeholder="e.g., Feb 2025 - Present"
                />
              </>
            ) : null}
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

            {isMiniProjectsSection ? (
              <>
                <label htmlFor="item-mini-project-category">Category</label>
                <select
                  id="item-mini-project-category"
                  value={miniProjectCategory}
                  onChange={(event) => setMiniProjectCategory(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {miniProjectCategoryOptions.map((categoryOption) => (
                    <option key={categoryOption} value={categoryOption}>
                      {categoryOption}
                    </option>
                  ))}
                </select>
                <label htmlFor="item-mini-project-category-new">Add New Category</label>
                <div className="admin-inline-row">
                  <input
                    id="item-mini-project-category-new"
                    value={newMiniProjectCategory}
                    onChange={(event) => setNewMiniProjectCategory(event.target.value)}
                    placeholder="Type a new category"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = String(newMiniProjectCategory || '').trim();
                      if (!cleaned) return;
                      setMiniProjectCategory(cleaned);
                      setNewMiniProjectCategory('');
                    }}
                  >
                    Add Category
                  </button>
                </div>
              </>
            ) : null}

            {isProjectsSection ? (
              <>
                <label htmlFor="item-project-category">Category</label>
                <select
                  id="item-project-category"
                  value={projectCategory}
                  onChange={(event) => setProjectCategory(event.target.value)}
                  required
                >
                  {projectCategoryOptions.map((categoryOption) => (
                    <option key={categoryOption} value={categoryOption}>
                      {categoryOption}
                    </option>
                  ))}
                </select>
                <label htmlFor="item-project-category-new">Add New Category</label>
                <div className="admin-inline-row">
                  <input
                    id="item-project-category-new"
                    value={newProjectCategory}
                    onChange={(event) => setNewProjectCategory(event.target.value)}
                    placeholder="Type a new category"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = String(newProjectCategory || '').trim();
                      if (!cleaned) return;
                      setProjectCategory(cleaned);
                      setNewProjectCategory('');
                    }}
                  >
                    Add Category
                  </button>
                </div>
              </>
            ) : null}

            {isMiniProjectsSection || isExperimentsSection ? (
              <>
                <label htmlFor="item-youtube-url">{isExperimentsSection ? 'Read More URL' : 'Project URL'}</label>
                <input
                  id="item-youtube-url"
                  type="url"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="https://..."
                  required
                />
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
                {isCareerSection ? (
                  <>
                    <label htmlFor="item-company-logo-upload">Upload company logo</label>
                    <input
                      id="item-company-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const files = Array.from(event.target.files || []);
                        if (files.length === 0) return;
                        setUploading(true);
                        setError('');
                        try {
                          const uploadedUrl = await uploadImage(files[0], `${kavithaiFrom || 'career'}-company-logo`);
                          setCompanyLogoUrl(uploadedUrl);
                        } catch (uploadError) {
                          setError(uploadError.message || 'Upload failed.');
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                    {companyLogoUrl ? <p className="contact-note">Company logo: {companyLogoUrl}</p> : null}
                    {existingCareerLogos.length > 0 ? (
                      <>
                        <label htmlFor="item-company-logo-existing">Reuse existing company logo</label>
                        <select
                          id="item-company-logo-existing"
                          value=""
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            if (nextValue) setCompanyLogoUrl(nextValue);
                            event.target.value = '';
                          }}
                        >
                          <option value="">Select existing logo...</option>
                          {existingCareerLogos.map((logoUrl) => (
                            <option key={logoUrl} value={logoUrl}>
                              {logoUrl}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            )}

            <label htmlFor="item-markdown">
              {isMiniProjectsSection ? 'Project Description' : isProjectsSection || isExperimentsSection ? 'Small Description (List Page)' : isBinomialSection || isBooksReadSection ? 'Caption' : isCareerSection ? 'Description' : isGallerySection ? 'Write-up' : 'Markdown (.md) content'}
            </label>
            <textarea
              id="item-markdown"
              rows="7"
              value={markdownText}
              onChange={(event) => setMarkdownText(event.target.value)}
              required
            />
            {isProjectsSection || isExperimentsSection ? (
              <>
                <label htmlFor="item-big-description">README / Full Description (Detail Page)</label>
                <textarea
                  id="item-big-description"
                  rows="10"
                  ref={createBigDescriptionRef}
                  value={bigDescription}
                  onChange={(event) => setBigDescription(event.target.value)}
                  placeholder="Write full README-like content for detail page..."
                />
                {isExperimentsSection ? (
                  <>
                    <div className="admin-item-actions" style={{ marginTop: '0.45rem' }}>
                      <button
                        type="button"
                        className="playlist-watch-btn admin-item-action-btn"
                        onClick={() => triggerInlineImageUpload({ mode: 'create', itemId: null }, createBigDescriptionRef.current)}
                        disabled={uploadingInlineImage}
                      >
                        {uploadingInlineImage ? 'Uploading Inline Image...' : 'Upload Inline Image'}
                      </button>
                    </div>
                    <p className="contact-note" style={{ margin: '0.35rem 0 0' }}>
                      Places an `[ARIVERSE_IMAGE]` anchor at your cursor and maps it to the uploaded image URL.
                    </p>
                  </>
                ) : null}
                {isProjectsSection ? (
                  <>
                    <label htmlFor="item-project-tag-new">Create / Add Skill Tag</label>
                    <div className="admin-inline-row">
                      <input
                        id="item-project-tag-new"
                        value={newProjectTag}
                        onChange={(event) => setNewProjectTag(event.target.value)}
                        placeholder="e.g., FastAPI, LangChain, MongoDB"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          addProjectTagToSelection(newProjectTag);
                          setNewProjectTag('');
                        }}
                      >
                        Add Tag
                      </button>
                    </div>
                    {availableProjectTags.length > 0 ? (
                      <>
                        <label htmlFor="item-project-tag-existing">Reuse Existing Tag</label>
                        <select
                          id="item-project-tag-existing"
                          value=""
                          onChange={(event) => {
                            addProjectTagToSelection(event.target.value);
                            event.target.value = '';
                          }}
                        >
                          <option value="">Select tag...</option>
                          {availableProjectTags.map((tag) => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                      </>
                    ) : null}
                    {projectTags.length > 0 ? (
                      <div className="admin-tag-list">
                        {projectTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="admin-tag-chip"
                            onClick={() => setProjectTags((prev) => prev.filter((entry) => entry !== tag))}
                            title="Click to remove"
                          >
                            {tag} ×
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}

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
                {isCareerSection && item.companyLogoUrl ? (
                  <img
                    className="playlist-thumb"
                    src={item.companyLogoUrl}
                    alt={`${item.kavithaiFrom || 'Career'} company logo`}
                    style={{ width: '56px', height: '56px', objectFit: 'contain', marginTop: '0.45rem' }}
                  />
                ) : null}
                <p className="admin-item-title">{item.kavithaiFrom || 'Untitled'}</p>
                {isCareerSection && item.subtitle ? (
                  <p className="contact-note" style={{ margin: '0.25rem 0 0' }}>
                    {item.subtitle}
                  </p>
                ) : null}
                {isCareerSection && item.dateText ? (
                  <p className="contact-note" style={{ margin: '0.25rem 0 0' }}>
                    {item.dateText}
                  </p>
                ) : null}
                {isBooksReadSection ? (
                  <p className="contact-note" style={{ margin: '0.25rem 0 0' }}>
                    {(item.category || 'ENGLISH') === 'TAMIL'
                      ? `Tamil - ${item.subcategory || 'புனைவு'}`
                      : `English - ${(item.subcategory || 'FICTION').replace('_', ' ')}`}
                  </p>
                ) : null}
                {(isBinomialSection || isMiniProjectsSection || isExperimentsSection) && item.youtubeUrl ? (
                  <p className="contact-note" style={{ margin: '0.25rem 0 0', wordBreak: 'break-all' }}>
                    {item.youtubeUrl}
                  </p>
                ) : null}
                {(isMiniProjectsSection || isProjectsSection) && item.category ? (
                  <p className="contact-note" style={{ margin: '0.25rem 0 0' }}>
                    {item.category}
                  </p>
                ) : null}

                {editingItemId === item.id ? (
                  <div className="admin-item-editor">
                    <label htmlFor={`edit-name-${item.id}`}>
                      {isMiniProjectsSection || isProjectsSection || isExperimentsSection ? 'Project Title' : isBinomialSection ? 'Entry Name' : isGallerySection || isBooksReadSection || isCareerSection ? 'Title' : 'Kavithai Name'}
                    </label>
                    <input
                      id={`edit-name-${item.id}`}
                      value={item.kavithaiFrom || ''}
                      placeholder={isMiniProjectsSection || isProjectsSection || isExperimentsSection ? 'Project Title' : isBinomialSection ? 'Entry Name' : isGallerySection || isBooksReadSection || isCareerSection ? 'Title' : 'Kavithai Name'}
                      onChange={(event) => updateLocalItem(item.id, { kavithaiFrom: event.target.value })}
                    />
                    {isCareerSection ? (
                      <>
                        <label htmlFor={`edit-subtitle-${item.id}`}>Subtitle</label>
                        <input
                          id={`edit-subtitle-${item.id}`}
                          value={item.subtitle || ''}
                          placeholder="e.g., Nov 2024 - Present"
                          onChange={(event) => updateLocalItem(item.id, { subtitle: event.target.value })}
                        />
                        <label htmlFor={`edit-date-text-${item.id}`}>Date Text</label>
                        <input
                          id={`edit-date-text-${item.id}`}
                          value={item.dateText || ''}
                          placeholder="e.g., Feb 2025 - Present"
                          onChange={(event) => updateLocalItem(item.id, { dateText: event.target.value })}
                        />
                      </>
                    ) : null}

                    {isMiniProjectsSection ? (
                      <>
                        <label htmlFor={`edit-category-${item.id}`}>Category</label>
                        <select
                          id={`edit-category-${item.id}`}
                          value={item.category || ''}
                          onChange={(event) => updateLocalItem(item.id, { category: event.target.value })}
                        >
                          <option value="" disabled>
                            Select category
                          </option>
                          {miniProjectCategoryOptions.map((categoryOption) => (
                            <option key={categoryOption} value={categoryOption}>
                              {categoryOption}
                            </option>
                          ))}
                        </select>
                        <label htmlFor={`edit-youtube-${item.id}`}>Project URL</label>
                        <input
                          id={`edit-youtube-${item.id}`}
                          type="url"
                          value={item.youtubeUrl || ''}
                          placeholder="https://..."
                          onChange={(event) => updateLocalItem(item.id, { youtubeUrl: event.target.value })}
                        />
                      </>
                    ) : null}
                    {isExperimentsSection ? (
                      <>
                        <label htmlFor={`edit-youtube-${item.id}`}>Read More URL</label>
                        <input
                          id={`edit-youtube-${item.id}`}
                          type="url"
                          value={item.youtubeUrl || ''}
                          placeholder="https://... or /aris-xperiments?id=1"
                          onChange={(event) => updateLocalItem(item.id, { youtubeUrl: event.target.value })}
                        />
                      </>
                    ) : null}
                    {isProjectsSection ? (
                      <>
                        <label htmlFor={`edit-category-${item.id}`}>Category</label>
                        <select
                          id={`edit-category-${item.id}`}
                          value={item.category || ''}
                          onChange={(event) => updateLocalItem(item.id, { category: event.target.value })}
                        >
                          {projectCategoryOptions.map((categoryOption) => (
                            <option key={categoryOption} value={categoryOption}>
                              {categoryOption}
                            </option>
                          ))}
                        </select>
                        <label htmlFor={`edit-project-tag-new-${item.id}`}>Create / Add Skill Tag</label>
                        <div className="admin-inline-row">
                          <input
                            id={`edit-project-tag-new-${item.id}`}
                            value={newProjectTag}
                            onChange={(event) => setNewProjectTag(event.target.value)}
                            placeholder="e.g., FastAPI, LangChain, MongoDB"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              addProjectTagToSelection(newProjectTag, item.id);
                              setNewProjectTag('');
                            }}
                          >
                            Add Tag
                          </button>
                        </div>
                        {availableProjectTags.length > 0 ? (
                          <>
                            <label htmlFor={`edit-project-tag-existing-${item.id}`}>Reuse Existing Tag</label>
                            <select
                              id={`edit-project-tag-existing-${item.id}`}
                              value=""
                              onChange={(event) => {
                                addProjectTagToSelection(event.target.value, item.id);
                                event.target.value = '';
                              }}
                            >
                              <option value="">Select tag...</option>
                              {availableProjectTags.map((tag) => (
                                <option key={`${item.id}-${tag}`} value={tag}>{tag}</option>
                              ))}
                            </select>
                          </>
                        ) : null}
                        {Array.isArray(item.projectTags) && item.projectTags.length > 0 ? (
                          <div className="admin-tag-list">
                            {item.projectTags.map((tag) => (
                              <button
                                key={`${item.id}-${tag}`}
                                type="button"
                                className="admin-tag-chip"
                                onClick={() =>
                                  updateLocalItem(item.id, {
                                    projectTags: item.projectTags.filter((entry) => entry !== tag),
                                  })
                                }
                                title="Click to remove"
                              >
                                {tag} ×
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : null}

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
                                currentUrl: item.imageUrl || '',
                                category: item.category || 'ENGLISH',
                                subcategory: item.subcategory || ((item.category || 'ENGLISH') === 'TAMIL' ? 'புனைவு' : 'FICTION'),
                              });
                              const nextItem = { ...item, imageUrl: uploadedUrl };
                              updateLocalItem(item.id, { imageUrl: uploadedUrl });
                              await saveItem(nextItem);
                            } catch (uploadError) {
                              setError(uploadError.message || 'Upload failed.');
                            }
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <label htmlFor={`edit-image-${item.id}`}>{isMiniProjectsSection ? 'Replace Project Image' : 'Replace Image'}</label>
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
                                const uploadedUrl = await uploadImage(files[0], item.kavithaiFrom, {
                                  currentUrl: item.imageUrl || '',
                                });
                                const nextItem = { ...item, imageUrl: uploadedUrl };
                                updateLocalItem(item.id, { imageUrl: uploadedUrl });
                                await saveItem(nextItem);
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
                        {isCareerSection ? (
                          <>
                            <label htmlFor={`edit-company-logo-${item.id}`}>Replace Company Logo</label>
                            <input
                              id={`edit-company-logo-${item.id}`}
                              type="file"
                              accept="image/*"
                              onChange={async (event) => {
                                const files = Array.from(event.target.files || []);
                                if (files.length === 0) return;
                                setError('');
                                try {
                                  const uploadedUrl = await uploadImage(files[0], `${item.kavithaiFrom || 'career'}-company-logo`, {
                                    currentUrl: item.companyLogoUrl || '',
                                  });
                                  const nextItem = { ...item, companyLogoUrl: uploadedUrl };
                                  updateLocalItem(item.id, { companyLogoUrl: uploadedUrl });
                                  await saveItem(nextItem);
                                } catch (uploadError) {
                                  setError(uploadError.message || 'Upload failed.');
                                }
                              }}
                            />
                            {item.companyLogoUrl ? (
                              <p className="contact-note" style={{ margin: '0.35rem 0 0', wordBreak: 'break-all' }}>
                                Company logo: {item.companyLogoUrl}
                              </p>
                            ) : null}
                            {existingCareerLogos.length > 0 ? (
                              <>
                                <label htmlFor={`edit-company-logo-existing-${item.id}`}>Reuse Existing Company Logo</label>
                                <select
                                  id={`edit-company-logo-existing-${item.id}`}
                                  value=""
                                  onChange={(event) => {
                                    const nextValue = event.target.value;
                                    if (nextValue) updateLocalItem(item.id, { companyLogoUrl: nextValue });
                                    event.target.value = '';
                                  }}
                                >
                                  <option value="">Select existing logo...</option>
                                  {existingCareerLogos.map((logoUrl) => (
                                    <option key={`${item.id}-${logoUrl}`} value={logoUrl}>
                                      {logoUrl}
                                    </option>
                                  ))}
                                </select>
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </>
                    )}

                    <label htmlFor={`edit-markdown-${item.id}`}>
                      {isMiniProjectsSection ? 'Project Description' : isProjectsSection || isExperimentsSection ? 'Small Description (List Page)' : isBinomialSection || isBooksReadSection ? 'Caption' : isCareerSection ? 'Description' : isGallerySection ? 'Write-up' : 'Poem'}
                    </label>
                    <textarea
                      id={`edit-markdown-${item.id}`}
                      rows="8"
                      value={item.markdownText || item.description || ''}
                      onChange={(event) => updateLocalItem(item.id, { markdownText: event.target.value })}
                    />
                    {isProjectsSection || isExperimentsSection ? (
                      <>
                        <label htmlFor={`edit-big-description-${item.id}`}>README / Full Description (Detail Page)</label>
                        <textarea
                          id={`edit-big-description-${item.id}`}
                          rows="10"
                          ref={(node) => {
                            editBigDescriptionRefs.current[item.id] = node;
                          }}
                          value={item.bigDescription || ''}
                          onChange={(event) => updateLocalItem(item.id, { bigDescription: event.target.value })}
                        />
                        {isExperimentsSection ? (
                          <div className="admin-item-actions" style={{ marginTop: '0.45rem' }}>
                            <button
                              type="button"
                              className="playlist-watch-btn admin-item-action-btn"
                              onClick={() => triggerInlineImageUpload({ mode: 'edit', itemId: item.id }, editBigDescriptionRefs.current[item.id])}
                              disabled={uploadingInlineImage}
                            >
                              {uploadingInlineImage ? 'Uploading Inline Image...' : 'Upload Inline Image'}
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}

                <div className="admin-item-actions">
                  {editingItemId === item.id ? (
                    <>
                      <button
                        type="button"
                        className="playlist-watch-btn admin-item-action-btn"
                        onClick={() => {
                          setEditingItemId(null);
                          saveItem(item);
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
                {pendingSaveIds.includes(item.id) ? (
                  <p className="contact-note" style={{ margin: '0.35rem 0 0' }}>Syncing changes...</p>
                ) : null}
                {supportsComments ? (
                  <div style={{ marginTop: '0.7rem' }}>
                    <button
                      type="button"
                      className="playlist-watch-btn admin-item-action-btn"
                      onClick={() => loadSectionComments(item.id)}
                    >
                      {loadingCommentsFor.includes(item.id) ? 'Loading Comments...' : 'Manage Comments'}
                    </button>
                    {(commentsByProjectId[item.id] || []).length > 0 ? (
                      <div className="admin-upload-list" style={{ marginTop: '0.5rem' }}>
                        {(commentsByProjectId[item.id] || []).map((comment) => (
                          <div key={`${item.id}-${comment.id}`} className="admin-upload-item">
                            <span>
                              <strong>{comment.name || 'anonymous'}:</strong> {comment.comment} ({comment.status || 'pending'})
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteSectionCommentForAdmin(item.id, comment.id)}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
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
