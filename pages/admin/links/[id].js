import Link from 'next/link';
import { useRef, useState } from 'react';
import Header from '../../../src/components/Header';
import MDCreatorComponent from '../../../src/components/MDCreatorComponent';
import SectionHero from '../../../src/components/SectionHero';
import { isAdminRequest } from '../../../lib/adminAuth';
import { getProfileLinkById, getResumeAssets, getSectionHero, listLinkItems } from '../../../lib/adminData';
import { listArizoneAdminPosts, listArizoneCategories } from '../../../lib/arizoneAdmin';
import { getArizoneCategoryLogoPath } from '../../../lib/arizoneAssets';
import { isInstagramUrl } from '../../../lib/security';

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

function renderAdminLinkIcon(url) {
  if (isInstagramUrl(url)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ width: '1em', height: '1em', flex: '0 0 auto' }}>
        <path
          d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8zm5.35-2.15a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ width: '1em', height: '1em', flex: '0 0 auto' }}>
      <path
        d="M21.6 7.4c-.2-.8-.8-1.4-1.6-1.6C18.6 5.5 12 5.5 12 5.5s-6.6 0-8 .3c-.8.2-1.4.8-1.6 1.6C2 8.8 2 12 2 12s0 3.2.4 4.6c.2.8.8 1.4 1.6 1.6 1.4.3 8 .3 8 .3s6.6 0 8-.3c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.6.4-4.6s0-3.2-.4-4.6Z"
        fill="currentColor"
      />
      <path d="M10 15.3V8.7L15.8 12 10 15.3Z" fill="#fff" />
    </svg>
  );
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
  const initialResumeAssets = link.label === 'Resume' ? await getResumeAssets(linkId) : null;
  const initialArizonePosts = link.label === 'AriZone (Blog)' ? await listArizoneAdminPosts() : [];
  const initialArizoneCategories = link.label === 'AriZone (Blog)' ? await listArizoneCategories() : [];

  return {
    props: {
      link,
      initialHero: await getSectionHero(linkId, link.label),
      initialItems,
      initialResumeAssets,
      initialArizonePosts,
      initialArizoneCategories,
    },
  };
}

function slugifyArizoneTitle(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeArizoneDraft(post = {}) {
  const slug = String(post?.slug || '').trim();
  const title = String(post?.title || '').trim();
  const safeSlug = slug || slugifyArizoneTitle(title);
  return {
    id: post?.id ?? null,
    title,
    slug: safeSlug,
    categoryLabel: String(post?.categoryLabel || post?.category_label || 'Deep Learning').trim() || 'Deep Learning',
    categorySlug: String(post?.categorySlug || post?.category_slug || 'deep-learning').trim() || 'deep-learning',
    coverImagePath: String(post?.coverImagePath || post?.cover_image_path || `arizone-posts/${safeSlug}/images/cover.img`).trim(),
    contentMarkdown: String(post?.contentMarkdown || post?.content_markdown || ''),
    publishedAt: String(post?.publishedAt || post?.published_at || new Date().toISOString().slice(0, 10)).slice(0, 10),
    isPublished: Boolean(post?.isPublished ?? post?.is_published ?? true),
    storageFolder: String(post?.storageFolder || post?.storage_folder || `arizone-posts/${safeSlug}`).trim(),
  };
}

function normalizeArizoneCategoryDraft(category = {}) {
  const label = String(category?.label || category?.categoryLabel || '').trim();
  const slug = String(category?.slug || category?.categorySlug || '').trim() || slugifyArizoneTitle(label) || 'untitled';
  return {
    id: category?.id ?? null,
    label,
    slug,
    logoPath: String(category?.logoPath || category?.logo_path || getArizoneCategoryLogoPath(slug)).trim(),
  };
}

export default function LinkAdminPage({ link, initialItems, initialHero, initialResumeAssets, initialArizonePosts, initialArizoneCategories }) {
  const sectionLabel = String(link?.label || '').trim();
  const isArizoneSection = sectionLabel === 'AriZone (Blog)' || sectionLabel === 'AriZone';
  const isBinomialSection = sectionLabel === 'Binomial Names';
  const isClayPlaySection = sectionLabel === 'Clay Play';
  const isGuestLecturesSection = sectionLabel === 'Guest Lectures';
  const isBookReviewsSection = sectionLabel === 'Book Reviews';
  const isResumeSection = sectionLabel === 'Resume';
  const isGallerySection = isClayPlaySection || isGuestLecturesSection || isBookReviewsSection;
  const isBooksReadSection = sectionLabel === 'Books Read';
  const isShelfSection = sectionLabel === 'Shelf';
  const isExperimentsSection = sectionLabel === 'Experiments';
  const isMiniProjectsSection = sectionLabel === 'Mini-Projects';
  const isProjectsSection = sectionLabel === 'Projects';
  const isCareerSection = sectionLabel === 'Career' || sectionLabel === 'Works' || sectionLabel === 'Experience';
  const isKavithaiSection = sectionLabel === 'அரியின் கவிதைகள்' || sectionLabel === 'Ariyin Kavithaigal';
  const isItemManagedSection = isBinomialSection || isGallerySection || isBooksReadSection || isShelfSection || isKavithaiSection || isMiniProjectsSection || isProjectsSection || isCareerSection || isExperimentsSection;
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
  const [bookCategory, setBookCategory] = useState(isBookReviewsSection ? 'TAMIL' : 'ENGLISH');
  const [bookSubcategory, setBookSubcategory] = useState('FICTION');
  const [resumePdfUrl, setResumePdfUrl] = useState(initialResumeAssets?.pdfUrl || '');
  const [resumePageImageUrls, setResumePageImageUrls] = useState(initialResumeAssets?.pageImageUrls || []);
  const [resumePdfFile, setResumePdfFile] = useState(null);
  const [resumePageFiles, setResumePageFiles] = useState([]);
  const [markdownText, setMarkdownText] = useState('');
  const [bigDescription, setBigDescription] = useState('');
  const [projectTags, setProjectTags] = useState([]);
  const [newProjectTag, setNewProjectTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingResumePdf, setSavingResumePdf] = useState(false);
  const [savingResumePages, setSavingResumePages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [existingShelfImagePickerOpen, setExistingShelfImagePickerOpen] = useState(false);
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
          : isBookReviewsSection
            ? 'book-reviews'
            : isClayPlaySection
              ? 'clay-play'
              : '';
  const supportsComments = isProjectsSection || isExperimentsSection || isKavithaiSection || isGuestLecturesSection || isBookReviewsSection || isClayPlaySection;
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
  const existingShelfImages = isShelfSection
    ? Array.from(
        new Map(
          (items || [])
            .map((item) => ({
              url: String(item?.imageUrl || '').trim(),
              name: String(item?.kavithaiFrom || item?.name || 'Untitled').trim() || 'Untitled',
              subname: String(item?.markdownText || item?.subname || '').trim(),
            }))
            .filter((item) => item.url)
            .map((item) => [item.url, item]),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name))
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
  const [arizonePosts, setArizonePosts] = useState((initialArizonePosts || []).map((post) => normalizeArizoneDraft(post)));
  const [arizoneCategories, setArizoneCategories] = useState((initialArizoneCategories || []).map((category) => normalizeArizoneCategoryDraft(category)));
  const [arizoneDraft, setArizoneDraft] = useState(normalizeArizoneDraft());
  const [arizoneCategoryDraft, setArizoneCategoryDraft] = useState(normalizeArizoneCategoryDraft());
  const [arizoneSelectedId, setArizoneSelectedId] = useState(null);
  const [arizoneSelectedCategoryId, setArizoneSelectedCategoryId] = useState(null);
  const [arizoneCategoryCreateOpen, setArizoneCategoryCreateOpen] = useState((initialArizoneCategories || []).length === 0);
  const [arizoneSaving, setArizoneSaving] = useState(false);
  const [arizoneCategorySaving, setArizoneCategorySaving] = useState(false);
  const [arizoneError, setArizoneError] = useState('');
  const [arizoneCategoryError, setArizoneCategoryError] = useState('');

  const [dragState, setDragState] = useState({ scope: '', itemId: null, fromIndex: -1 });
  const inlineImageInputRef = useRef(null);
  const arizoneCoverInputRef = useRef(null);
  const arizoneCategoryLogoInputRef = useRef(null);
  const createBigDescriptionRef = useRef(null);
  const editBigDescriptionRefs = useRef({});
  const inlineImageTargetRef = useRef({ mode: 'create', itemId: null, selectionStart: null, selectionEnd: null });

  function syncArizoneDraft(post = null) {
    setArizoneSelectedId(post?.id ?? null);
    setArizoneDraft(normalizeArizoneDraft(post || {}));
    setArizoneError('');
  }

  function syncArizoneCategoryDraft(category = null) {
    setArizoneSelectedCategoryId(category?.id ?? null);
    setArizoneCategoryDraft(normalizeArizoneCategoryDraft(category || {}));
    setArizoneCategoryCreateOpen(!category);
    setArizoneCategoryError('');
  }

  async function saveArizonePost(event) {
    event.preventDefault();
    setArizoneSaving(true);
    setArizoneError('');

    const slug = arizoneDraft.slug || slugifyArizoneTitle(arizoneDraft.title);
    const payload = {
      title: arizoneDraft.title,
      slug,
      categoryLabel: arizoneDraft.categoryLabel || 'Deep Learning',
      categorySlug: arizoneDraft.categorySlug || 'deep-learning',
      storageFolder: `arizone-posts/${slug}`,
      contentPath: `arizone-posts/${slug}/content.md`,
      coverImagePath: arizoneDraft.coverImagePath || `arizone-posts/${slug}/images/cover.img`,
      contentMarkdown: arizoneDraft.contentMarkdown,
      publishedAt: arizoneDraft.publishedAt,
      isPublished: Boolean(arizoneDraft.isPublished),
    };

    const method = arizoneSelectedId ? 'PATCH' : 'POST';
    const endpoint = arizoneSelectedId ? `/api/admin/arizone/${arizoneSelectedId}` : '/api/admin/arizone';
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setArizoneSaving(false);
      setArizoneError(data.error || 'Could not save AriZone post.');
      return;
    }

    const nextPost = normalizeArizoneDraft(data.post || payload);
    setArizonePosts((prev) => {
      const withoutCurrent = prev.filter((post) => Number(post.id) !== Number(nextPost.id));
      return [nextPost, ...withoutCurrent].sort((a, b) => String(a.publishedAt || '').localeCompare(String(b.publishedAt || '')) * -1);
    });
    syncArizoneDraft(nextPost);
    setArizoneSaving(false);
  }

  async function deleteArizonePost() {
    if (!arizoneSelectedId) return;
    if (!window.confirm('Delete this AriZone post?')) return;
    setArizoneSaving(true);
    setArizoneError('');
    const res = await fetch(`/api/admin/arizone/${arizoneSelectedId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setArizoneSaving(false);
      setArizoneError(data.error || 'Could not delete AriZone post.');
      return;
    }
    setArizonePosts((prev) => prev.filter((post) => Number(post.id) !== Number(arizoneSelectedId)));
    syncArizoneDraft();
    setArizoneSaving(false);
  }

  async function saveArizoneCategory(event) {
    event.preventDefault();
    setArizoneCategorySaving(true);
    setArizoneCategoryError('');

    const payload = {
      ...arizoneCategoryDraft,
      slug: String(arizoneCategoryDraft.slug || slugifyArizoneTitle(arizoneCategoryDraft.label) || 'untitled').trim(),
      logoPath: arizoneCategoryDraft.logoPath || getArizoneCategoryLogoPath(arizoneCategoryDraft.slug || slugifyArizoneTitle(arizoneCategoryDraft.label) || 'untitled'),
    };

    const hasExisting = Boolean(arizoneSelectedCategoryId);
    const res = await fetch(hasExisting ? `/api/admin/arizone-categories/${arizoneSelectedCategoryId}` : '/api/admin/arizone-categories', {
      method: hasExisting ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setArizoneCategorySaving(false);
      setArizoneCategoryError(data.error || 'Could not save category.');
      return;
    }

    const nextCategory = data.category;
    const refreshedRes = await fetch('/api/admin/arizone-categories');
    const refreshedData = await refreshedRes.json().catch(() => ({}));
    setArizoneCategories(Array.isArray(refreshedData.categories) ? refreshedData.categories.map((category) => normalizeArizoneCategoryDraft(category)) : []);
    if (nextCategory?.id) {
      syncArizoneCategoryDraft(nextCategory);
      setArizoneDraft((prev) => ({
        ...prev,
        categoryLabel: nextCategory.label || prev.categoryLabel,
        categorySlug: nextCategory.slug || prev.categorySlug,
      }));
    }
    setArizoneCategorySaving(false);
  }

  async function deleteArizoneCategory() {
    if (!arizoneSelectedCategoryId) return;
    if (!window.confirm('Delete this category?')) return;
    setArizoneCategorySaving(true);
    setArizoneCategoryError('');
    const res = await fetch(`/api/admin/arizone-categories/${arizoneSelectedCategoryId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setArizoneCategorySaving(false);
      setArizoneCategoryError(data.error || 'Could not delete category.');
      return;
    }
    setArizoneCategories((prev) => prev.filter((category) => Number(category.id) !== Number(arizoneSelectedCategoryId)));
    syncArizoneCategoryDraft();
    setArizoneCategorySaving(false);
  }

  async function uploadArizoneCategoryLogo(file) {
    const nextSlug = arizoneCategoryDraft.slug || slugifyArizoneTitle(arizoneCategoryDraft.label) || 'untitled';
    return uploadArizoneAsset(file, 'category-logo', {
      targetPath: getArizoneCategoryLogoPath(nextSlug),
    });
  }

  async function uploadArizoneAsset(file, title, meta = {}) {
    return uploadImage(file, title, meta);
  }

  async function uploadArizoneCover(file) {
    const nextSlug = arizoneDraft.slug || slugifyArizoneTitle(arizoneDraft.title) || 'untitled';
    return uploadArizoneAsset(file, 'cover', {
      targetPath: `arizone-posts/${nextSlug}/images/cover.img`,
    });
  }

  if (isArizoneSection) {
    return (
      <div className="site">
        <Header subPage />
        <main className="content">
          <section className="for-ai" aria-labelledby="link-admin-title">
            <p className="eyebrow">Section Admin</p>
            <h2 id="link-admin-title">{link.label}</h2>
            <p className="contact-note"><Link href="/admin">Back to Admin</Link></p>

            <form className="contact-card" onSubmit={saveArizonePost}>
              <p className="contact-note" style={{ marginTop: 0 }}>
                Add or edit a post. Keep the fields simple: name, cover image, and the markdown article.
              </p>
              <label htmlFor="arizone-title">Name</label>
              <input
                id="arizone-title"
                type="text"
                value={arizoneDraft.title}
                onChange={(event) => setArizoneDraft((prev) => {
                  const nextTitle = event.target.value;
                  const nextSlug = prev.id ? prev.slug : (slugifyArizoneTitle(nextTitle) || 'untitled');
                  return {
                    ...prev,
                    title: nextTitle,
                    slug: nextSlug,
                    storageFolder: `arizone-posts/${nextSlug}`,
                    coverImagePath: prev.coverImagePath || `arizone-posts/${nextSlug}/images/cover.img`,
                  };
                })}
                placeholder="Post title"
                required
              />

              <label htmlFor="arizone-category-select">Category</label>
              <select
                id="arizone-category-select"
                value={arizoneDraft.categorySlug || '__new__'}
                onChange={(event) => {
                  const nextSlug = String(event.target.value || '').trim();
                  if (nextSlug === '__new__') {
                    setArizoneCategoryCreateOpen(true);
                    setArizoneCategoryDraft(normalizeArizoneCategoryDraft());
                    setArizoneSelectedCategoryId(null);
                    setArizoneDraft((prev) => ({ ...prev, categorySlug: '', categoryLabel: '' }));
                    return;
                  }
                  const selectedCategory = arizoneCategories.find((category) => category.slug === nextSlug) || null;
                  if (selectedCategory) {
                    syncArizoneCategoryDraft(selectedCategory);
                  }
                  setArizoneDraft((prev) => ({
                    ...prev,
                    categorySlug: nextSlug,
                    categoryLabel: selectedCategory?.label || nextSlug || prev.categoryLabel || 'AriZone',
                  }));
                }}
              >
                <option value="__new__">Add category</option>
                {(arizoneCategories || []).map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.label || category.slug}
                  </option>
                ))}
              </select>

              {arizoneCategoryCreateOpen || (arizoneCategories || []).length === 0 ? (
                <div className="arizone-inline-category-panel">
                  <p className="arizone-inline-category-title">New category</p>
                  <label htmlFor="arizone-category-label">Category name</label>
                  <input
                    id="arizone-category-label"
                    type="text"
                    value={arizoneCategoryDraft.label}
                    onChange={(event) => setArizoneCategoryDraft((prev) => {
                      const nextLabel = event.target.value;
                      const nextSlug = prev.id ? prev.slug : (slugifyArizoneTitle(nextLabel) || 'untitled');
                      return {
                        ...prev,
                        label: nextLabel,
                        slug: nextSlug,
                        logoPath: prev.logoPath || `arizone-categories/${nextSlug}/logo.img`,
                      };
                    })}
                    placeholder="Deep Learning"
                    required
                  />

                  <label htmlFor="arizone-category-slug">Slug</label>
                  <input
                    id="arizone-category-slug"
                    type="text"
                    value={arizoneCategoryDraft.slug}
                    onChange={(event) => setArizoneCategoryDraft((prev) => ({
                      ...prev,
                      slug: slugifyArizoneTitle(event.target.value) || 'untitled',
                    }))}
                    placeholder="deep-learning"
                    required
                  />

                  <label htmlFor="arizone-category-logo">Category logo</label>
                  <input
                    id="arizone-category-logo"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    ref={arizoneCategoryLogoInputRef}
                    onChange={async (event) => {
                      const file = event.target.files?.[0] || null;
                      if (!file) return;
                      try {
                        const uploadedUrl = await uploadArizoneCategoryLogo(file);
                        setArizoneCategoryDraft((prev) => ({ ...prev, logoPath: uploadedUrl }));
                      } catch (uploadError) {
                        setArizoneCategoryError(uploadError.message || 'Could not upload category logo.');
                      } finally {
                        if (arizoneCategoryLogoInputRef.current) arizoneCategoryLogoInputRef.current.value = '';
                      }
                    }}
                  />
                  <div className="admin-item-actions arizone-inline-actions">
                    <button type="button" onClick={() => arizoneCategoryLogoInputRef.current?.click()}>
                      Upload Logo
                    </button>
                  </div>
                  {arizoneCategoryDraft.logoPath ? (
                    <p className="contact-note" style={{ marginTop: 0, wordBreak: 'break-all' }}>
                      {arizoneCategoryDraft.logoPath}
                    </p>
                  ) : null}

                  <div className="admin-item-actions arizone-inline-actions">
                    <button type="button" onClick={saveArizoneCategory} disabled={arizoneCategorySaving}>
                      {arizoneCategorySaving ? 'Saving...' : arizoneSelectedCategoryId ? 'Update Category' : 'Create Category'}
                    </button>
                    {arizoneSelectedCategoryId ? (
                      <button type="button" onClick={deleteArizoneCategory} disabled={arizoneCategorySaving}>
                        Delete Category
                      </button>
                    ) : null}
                  </div>
                  {arizoneCategoryError ? <p className="contact-note">{arizoneCategoryError}</p> : null}
                </div>
              ) : null}

              <label htmlFor="arizone-cover">Cover image</label>
              <input
                ref={arizoneCoverInputRef}
                id="arizone-cover"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (event) => {
                  const file = event.target.files?.[0] || null;
                  if (!file) return;
                  try {
                    const uploadedUrl = await uploadArizoneCover(file);
                    setArizoneDraft((prev) => ({ ...prev, coverImagePath: uploadedUrl }));
                  } catch (uploadError) {
                    setArizoneError(uploadError.message || 'Could not upload cover image.');
                  } finally {
                    if (arizoneCoverInputRef.current) arizoneCoverInputRef.current.value = '';
                  }
                }}
              />
              <div className="admin-item-actions" style={{ marginBottom: '0.75rem' }}>
                <button type="button" onClick={() => arizoneCoverInputRef.current?.click()}>
                  Upload Cover
                </button>
              </div>
              {arizoneDraft.coverImagePath ? (
                <p className="contact-note" style={{ marginTop: 0, wordBreak: 'break-all' }}>
                  {arizoneDraft.coverImagePath}
                </p>
              ) : null}

              <MDCreatorComponent
                label="Article section"
                value={arizoneDraft.contentMarkdown}
                onChange={(nextValue) => setArizoneDraft((prev) => ({ ...prev, contentMarkdown: nextValue }))}
                onUploadImage={async (file) => {
                  const nextSlug = arizoneDraft.slug || slugifyArizoneTitle(arizoneDraft.title) || 'untitled';
                  const safeName = String(file?.name || 'image')
                    .replace(/\.[^.]+$/, '')
                    .normalize('NFKD')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '') || 'image';
                  return uploadArizoneAsset(file, arizoneDraft.title || 'article-image', {
                    targetPath: `arizone-posts/${nextSlug}/images/${safeName}.img`,
                  });
                }}
              />

              <div className="admin-item-actions">
                <button type="submit" disabled={arizoneSaving}>
                  {arizoneSaving ? 'Saving...' : arizoneSelectedId ? 'Update Post' : 'Create Post'}
                </button>
                {arizoneSelectedId ? (
                  <button type="button" onClick={deleteArizonePost} disabled={arizoneSaving}>
                    Delete Post
                  </button>
                ) : null}
              </div>
            </form>

            <section className="contact-card">
              <p className="contact-note" style={{ marginTop: 0 }}>
                Existing posts
              </p>
              <div className="playlist-grid">
                {(arizonePosts || []).length > 0 ? (
                  arizonePosts.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      className="playlist-card"
                      onClick={() => syncArizoneDraft(post)}
                      style={{ textAlign: 'left', width: '100%' }}
                    >
                      <h3 style={{ marginTop: 0 }}>{post.title || post.slug}</h3>
                      <p>{post.isPublished ? 'Published' : 'Draft'}</p>
                    </button>
                  ))
                ) : (
                  <p className="contact-note">No AriZone posts yet.</p>
                )}
              </div>
            </section>

            {arizoneError ? <p className="contact-note">{arizoneError}</p> : null}
          </section>
        </main>
      </div>
    );
  }

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
    if (meta.targetPath) formData.append('targetPath', meta.targetPath);
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

  function applyExistingShelfImage(url) {
    const nextUrl = String(url || '').trim();
    if (!nextUrl) return;
    setImageUrl(nextUrl);
    setExistingShelfImagePickerOpen(false);
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
        youtubeUrl: isBinomialSection || isMiniProjectsSection || isExperimentsSection || isBookReviewsSection ? youtubeUrl : '',
        markdownText,
        bigDescription: isProjectsSection || isExperimentsSection ? bigDescription : '',
        projectTags: isProjectsSection ? projectTags : [],
        kavithaiFrom,
        subtitle: isCareerSection ? subtitle : '',
        dateText: isCareerSection ? dateText : '',
        category: isMiniProjectsSection
          ? miniProjectCategory
          : isProjectsSection
            ? projectCategory
            : isBooksReadSection || isBookReviewsSection
              ? bookCategory
              : undefined,
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
    setBookCategory(isBookReviewsSection ? 'TAMIL' : 'ENGLISH');
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

  function handleCreateBookReviewsCategoryChange(nextCategory) {
    setBookCategory(nextCategory === 'TAMIL' ? 'TAMIL' : 'ENGLISH');
  }

  function handleEditBookReviewsCategoryChange(item, nextCategory) {
    updateLocalItem(item.id, {
      category: nextCategory === 'TAMIL' ? 'TAMIL' : 'ENGLISH',
    });
  }

  async function saveResumePdf(nextResumePdfFile) {
    const formData = new FormData();
    formData.append('pdf', nextResumePdfFile);
    formData.append('currentUrl', resumePdfUrl || '');

    const res = await fetch('/api/admin/upload-resume-pdf', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Could not upload resume PDF.');
    }
    const nextPdfUrl = String(data?.pdfUrl || '').trim();
    if (!nextPdfUrl) {
      throw new Error('Resume PDF upload did not return a URL.');
    }
    const saveRes = await fetch('/api/admin/resume-assets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkId: link.id,
        pdfUrl: nextPdfUrl,
      }),
    });
    const saveData = await saveRes.json().catch(() => ({}));
    if (!saveRes.ok) {
      throw new Error(saveData.error || 'Could not save resume PDF.');
    }
    if (typeof saveData?.asset?.pdfUrl === 'string') {
      setResumePdfUrl(saveData.asset.pdfUrl);
    } else {
      setResumePdfUrl(nextPdfUrl);
    }
    setResumePdfFile(null);
    return saveData.asset || null;
  }

  async function saveResumePageImages(nextResumePageFiles) {
    const files = Array.isArray(nextResumePageFiles) ? nextResumePageFiles.filter(Boolean) : [];
    if (files.length === 0) return null;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    formData.append('currentUrls', JSON.stringify(resumePageImageUrls || []));

    const res = await fetch('/api/admin/upload-resume-images', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Could not upload resume images.');
    }
    const nextPageImageUrls = Array.isArray(data?.pageImageUrls) ? data.pageImageUrls : [];
    if (nextPageImageUrls.length === 0) {
      throw new Error('Resume image upload did not return any URLs.');
    }
    const saveRes = await fetch('/api/admin/resume-assets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkId: link.id,
        pageImageUrls: nextPageImageUrls,
      }),
    });
    const saveData = await saveRes.json().catch(() => ({}));
    if (!saveRes.ok) {
      throw new Error(saveData.error || 'Could not save resume images.');
    }
    if (Array.isArray(saveData?.asset?.pageImageUrls)) {
      setResumePageImageUrls(saveData.asset.pageImageUrls);
    } else {
      setResumePageImageUrls(nextPageImageUrls);
    }
    setResumePageFiles([]);
    return saveData.asset || null;
  }

  async function saveItem(item) {
    setPendingSaveIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    try {
      const payload = {
        ...item,
        linkId: item.linkId || link.id,
      };

      if (isBookReviewsSection) {
        const primaryImage = item.imageUrl || '';
        payload.imageUrl = primaryImage;
        payload.imageUrls = primaryImage ? [primaryImage] : [];
      }

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

          {isResumeSection ? (
            <>
              <section className="contact-card">
                <p className="contact-note">Resume PDF</p>
                <p className="contact-note" style={{ marginTop: 0 }}>
                  Upload the PDF people download from <code>/ari-resume</code>. Uploading a new file replaces the old one.
                </p>
                {resumePdfUrl ? (
                  <p className="contact-note" style={{ marginTop: 0 }}>
                    Current PDF: <a href={resumePdfUrl} target="_blank" rel="noreferrer">Open current PDF</a>
                  </p>
                ) : null}
                <label htmlFor="resume-pdf">Upload / Replace Resume PDF</label>
                <input
                  id="resume-pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setResumePdfFile(file);
                  }}
                />
                {resumePdfFile ? <p className="contact-note">Selected: {resumePdfFile.name}</p> : null}
                <div className="admin-item-actions" style={{ marginTop: '0.8rem' }}>
                  <button
                    type="button"
                    disabled={savingResumePdf || !resumePdfFile}
                    onClick={async () => {
                      if (!resumePdfFile) return;
                      setSavingResumePdf(true);
                      setError('');
                      try {
                        await saveResumePdf(resumePdfFile);
                      } catch (saveError) {
                        setError(saveError.message || 'Could not upload resume PDF.');
                      } finally {
                        setSavingResumePdf(false);
                      }
                    }}
                  >
                    {savingResumePdf ? 'Uploading...' : 'Upload PDF'}
                  </button>
                </div>
              </section>

              <section className="contact-card">
                <p className="contact-note">Resume page images</p>
                <p className="contact-note" style={{ marginTop: 0 }}>
                  Upload the page images in order. Replacing them deletes the old set and updates <code>/ari-resume</code>.
                </p>
                {Array.isArray(resumePageImageUrls) && resumePageImageUrls.length > 0 ? (
                  <div className="admin-upload-list" style={{ marginTop: '0.55rem' }}>
                    {resumePageImageUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="admin-upload-item">
                        <img className="admin-upload-thumb" src={url} alt={`Resume page ${index + 1}`} />
                        <span>
                          Page {index + 1}: {url}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="contact-note" style={{ marginTop: 0 }}>
                    No page images uploaded yet.
                  </p>
                )}
                <label htmlFor="resume-pages">Upload / Replace Resume Pages</label>
                <input
                  id="resume-pages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    setResumePageFiles(files);
                  }}
                />
                {resumePageFiles.length > 0 ? (
                  <p className="contact-note" style={{ marginTop: '0.45rem' }}>
                    Selected: {resumePageFiles.map((file) => file.name).join(', ')}
                  </p>
                ) : null}
                <div className="admin-item-actions" style={{ marginTop: '0.8rem' }}>
                  <button
                    type="button"
                    disabled={savingResumePages || resumePageFiles.length === 0}
                    onClick={async () => {
                      if (resumePageFiles.length === 0) return;
                      setSavingResumePages(true);
                      setError('');
                      try {
                        await saveResumePageImages(resumePageFiles);
                      } catch (saveError) {
                        setError(saveError.message || 'Could not upload resume page images.');
                      } finally {
                        setSavingResumePages(false);
                      }
                    }}
                  >
                    {savingResumePages ? 'Uploading...' : 'Upload Images'}
                  </button>
                </div>
              </section>
            </>
          ) : null}

          {isItemManagedSection ? (
          <form className="contact-card" onSubmit={addItem}>
            <label htmlFor="item-kavithai-from">
              {isShelfSection
                ? 'Name'
                : isMiniProjectsSection || isProjectsSection || isExperimentsSection
                  ? 'Project Title'
                  : isBinomialSection
                    ? 'Entry Name'
                    : isGallerySection || isBooksReadSection || isKavithaiSection || isCareerSection
                      ? 'Title'
                      : 'Kavithai Name'}
            </label>
            <input
              id="item-kavithai-from"
              value={kavithaiFrom}
              onChange={(event) => setKavithaiFrom(event.target.value)}
              required
            />
            {isShelfSection ? (
              <>
                <label htmlFor="item-shelf-subname">Subname</label>
                <input
                  id="item-shelf-subname"
                  value={markdownText}
                  onChange={(event) => setMarkdownText(event.target.value)}
                  required
                />
              </>
            ) : null}
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
            {isBookReviewsSection ? (
              <>
                <label htmlFor="item-book-category">Category</label>
                <select
                  id="item-book-category"
                  value={bookCategory}
                  onChange={(event) => handleCreateBookReviewsCategoryChange(event.target.value)}
                  required
                >
                  <option value="TAMIL">Tamil</option>
                  <option value="ENGLISH">English</option>
                </select>
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

            {isMiniProjectsSection || isExperimentsSection || isBookReviewsSection ? (
              <>
                <label htmlFor="item-youtube-url">
                  {isExperimentsSection ? 'Read More URL' : isBookReviewsSection ? 'YouTube or Instagram URL' : 'Project URL'}
                </label>
                <input
                  id="item-youtube-url"
                  type="url"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder={
                    isBookReviewsSection
                      ? 'https://www.youtube.com/live/... or https://www.instagram.com/reel/...'
                      : 'https://...'
                  }
                  required
                />
                {isBookReviewsSection && youtubeUrl ? (
                  <p className="contact-note" style={{ margin: '0.35rem 0 0' }}>
                    {isInstagramUrl(youtubeUrl) ? 'Instagram link detected' : 'YouTube link detected'}
                  </p>
                ) : null}
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
                  {isBookReviewsSection ? 'Upload cover image' : isGallerySection ? 'Upload images' : 'Upload image'}
                </label>
                <input
                  id="item-image-upload"
                  type="file"
                  accept="image/*"
                  multiple={isGallerySection && !isBookReviewsSection}
                  onChange={async (event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length === 0) return;
                    setUploading(true);
                    setError('');
                    try {
                      if (isGallerySection && !isBookReviewsSection) {
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
                {isShelfSection ? (
                  <>
                    <div className="admin-item-actions" style={{ marginTop: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={() => setExistingShelfImagePickerOpen((prev) => !prev)}
                      >
                        {existingShelfImagePickerOpen ? 'Hide Existing Shelf Images' : 'Select Existing Shelf Image'}
                      </button>
                    </div>
                    {existingShelfImagePickerOpen ? (
                      <div className="admin-existing-image-picker">
                        {existingShelfImages.length > 0 ? (
                          <div className="admin-existing-image-list">
                            {existingShelfImages.map((image) => (
                              <button
                                key={image.url}
                                type="button"
                                className="admin-existing-image-row"
                                onClick={() => applyExistingShelfImage(image.url)}
                                title={image.url}
                              >
                                <span>{image.name}</span>
                                {image.subname ? <small>{image.subname}</small> : null}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="contact-note" style={{ marginTop: '0.35rem' }}>
                            No existing Shelf images found yet.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </>
                ) : null}
                {isGallerySection && !isBookReviewsSection ? (
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

            {!isShelfSection ? (
              <>
                <label htmlFor="item-markdown">
                  {isMiniProjectsSection
                    ? 'Project Description'
                    : isProjectsSection || isExperimentsSection
                      ? 'Small Description (List Page)'
                      : isBinomialSection || isBooksReadSection
                        ? 'Caption'
                        : isCareerSection
                          ? 'Description'
                          : isGallerySection
                            ? 'Write-up'
                            : 'Markdown (.md) content'}
                </label>
                <textarea
                  id="item-markdown"
                  rows="7"
                  value={markdownText}
                  onChange={(event) => setMarkdownText(event.target.value)}
                  required
                />
              </>
            ) : null}
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
                {isShelfSection && item.markdownText ? (
                  <p className="contact-note" style={{ margin: '0.25rem 0 0' }}>
                    {item.markdownText}
                  </p>
                ) : null}
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
                {isBookReviewsSection && item.youtubeUrl ? (
                  <p className="contact-note" style={{ margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span aria-hidden="true" style={{ display: 'inline-flex', color: isInstagramUrl(item.youtubeUrl) ? '#e1306c' : '#ff0000' }}>
                      {renderAdminLinkIcon(item.youtubeUrl)}
                    </span>
                    <span style={{ wordBreak: 'break-all' }}>{item.youtubeUrl}</span>
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
                      {isShelfSection
                        ? 'Name'
                        : isMiniProjectsSection || isProjectsSection || isExperimentsSection
                          ? 'Project Title'
                          : isBinomialSection
                            ? 'Entry Name'
                            : isGallerySection || isBooksReadSection || isCareerSection
                              ? 'Title'
                              : 'Kavithai Name'}
                    </label>
                    <input
                      id={`edit-name-${item.id}`}
                      value={item.kavithaiFrom || ''}
                      placeholder={isShelfSection
                        ? 'Name'
                        : isMiniProjectsSection || isProjectsSection || isExperimentsSection
                          ? 'Project Title'
                          : isBinomialSection
                            ? 'Entry Name'
                            : isGallerySection || isBooksReadSection || isCareerSection
                              ? 'Title'
                              : 'Kavithai Name'}
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
                    ) : isBookReviewsSection ? (
                      <>
                        <label htmlFor={`edit-youtube-${item.id}`}>YouTube video URL</label>
                        <input
                          id={`edit-youtube-${item.id}`}
                          type="url"
                          value={item.youtubeUrl || ''}
                          placeholder="https://www.youtube.com/live/..."
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
                    ) : isBookReviewsSection ? (
                      <>
                        <label htmlFor={`edit-book-category-${item.id}`}>Category</label>
                        <select
                          id={`edit-book-category-${item.id}`}
                          value={item.category || 'TAMIL'}
                          onChange={(event) => handleEditBookReviewsCategoryChange(item, event.target.value)}
                        >
                          <option value="TAMIL">Tamil</option>
                          <option value="ENGLISH">English</option>
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
                        <label htmlFor={`edit-image-${item.id}`}>
                          {isBookReviewsSection
                            ? 'Replace Cover'
                            : isMiniProjectsSection
                              ? 'Replace Project Image'
                              : 'Replace Image'}
                        </label>
                        <input
                          id={`edit-image-${item.id}`}
                          type="file"
                          accept="image/*"
                          multiple={isGallerySection && !isBookReviewsSection}
                          onChange={async (event) => {
                            const files = Array.from(event.target.files || []);
                            if (files.length === 0) return;
                            setError('');
                            try {
                      if (isGallerySection && !isBookReviewsSection) {
                        const uploadedUrls = await uploadMultipleImages(files, item.kavithaiFrom);
                        const currentUrls = Array.isArray(item.imageUrls) ? item.imageUrls : [];
                        const nextUrls = [...currentUrls, ...uploadedUrls];
                        const nextItem = {
                          ...item,
                          imageUrl: nextUrls[0] || '',
                          imageUrls: nextUrls,
                        };
                        updateLocalItem(item.id, {
                          imageUrl: nextItem.imageUrl,
                          imageUrls: nextItem.imageUrls,
                        });
                        await saveItem(nextItem);
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
                        {isGallerySection && !isBookReviewsSection && Array.isArray(item.imageUrls) && item.imageUrls.length > 0 ? (
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

                    {isShelfSection ? (
                      <>
                        {existingShelfImages.length > 0 ? (
                          <>
                            <label htmlFor={`edit-image-existing-${item.id}`}>Reuse Existing Shelf Image</label>
                            <select
                              id={`edit-image-existing-${item.id}`}
                              value=""
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                if (nextValue) updateLocalItem(item.id, { imageUrl: nextValue });
                                event.target.value = '';
                              }}
                            >
                              <option value="">Select existing shelf image...</option>
                              {existingShelfImages.map((image) => (
                                <option key={`${item.id}-${image.url}`} value={image.url}>
                                  {image.name}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : null}
                        <label htmlFor={`edit-subname-${item.id}`}>Subname</label>
                        <input
                          id={`edit-subname-${item.id}`}
                          value={item.markdownText || ''}
                          onChange={(event) => updateLocalItem(item.id, { markdownText: event.target.value })}
                        />
                      </>
                    ) : (
                      <>
                        <label htmlFor={`edit-markdown-${item.id}`}>
                          {isMiniProjectsSection
                            ? 'Project Description'
                            : isProjectsSection || isExperimentsSection
                              ? 'Small Description (List Page)'
                              : isBinomialSection || isBooksReadSection
                                ? 'Caption'
                                : isCareerSection
                                  ? 'Description'
                                  : isGallerySection
                                    ? 'Write-up'
                                    : 'Poem'}
                        </label>
                        <textarea
                          id={`edit-markdown-${item.id}`}
                          rows="8"
                          value={item.markdownText || item.description || ''}
                          onChange={(event) => updateLocalItem(item.id, { markdownText: event.target.value })}
                        />
                      </>
                    )}
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
