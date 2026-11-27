function cleanText(value, maxLength = null) {
  const text = String(value ?? '').trim();
  if (!Number.isInteger(maxLength) || maxLength <= 0) return text;
  return text.slice(0, maxLength);
}

function normalizeSlug(value) {
  return cleanText(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveSlug(primaryValue, fallbackValue = 'untitled') {
  const primarySlug = normalizeSlug(primaryValue);
  const fallbackSlug = normalizeSlug(fallbackValue);
  if (primarySlug && primarySlug !== 'untitled') return primarySlug;
  return fallbackSlug || primarySlug || 'untitled';
}

function normalizePath(value) {
  return cleanText(value).replace(/^\/+/, '').replace(/\/+$/, '');
}

function resolvePostCoverImagePath(storageFolder, coverImagePath) {
  const fallback = normalizePath(`${storageFolder}/images/cover.webp`);
  const candidate = normalizePath(coverImagePath);
  if (!candidate) return fallback;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(candidate)) return candidate;
  if (candidate.includes('/posts//')) return fallback;
  if (/^arichuvadi\/posts\/images\/cover\.webp$/i.test(candidate)) return fallback;
  if (/^arichuvadi\/posts\/[^/]+\/images\/cover\.webp$/i.test(candidate)) return candidate;
  if (/\/images\/cover\.webp$/i.test(candidate) && candidate.startsWith(storageFolder)) return candidate;
  return candidate;
}

function buildDefaultStorageFolder(_categorySlug, slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return '';
  return `arichuvadi/posts/${safeSlug}`;
}

export function buildArichuvadiDraft() {
  return {
    title: '',
    titleEnglish: '',
    slug: '',
    categoryLabel: 'தமிழ் கற்றல்',
    categorySlug: 'deep-learning',
    summary: '',
    contentMarkdown: '',
    translationReadme: '',
    storageFolder: '',
    contentPath: '',
    coverImagePath: '',
    imagePaths: [],
    publishedAt: new Date().toISOString().slice(0, 10),
    isPublished: true,
  };
}

export function buildArichuvadiPathsFromDraft(draft = {}) {
  const title = cleanText(draft.title, 180);
  const slug = resolveSlug(draft.slug, title);
  const categoryLabel = cleanText(draft.categoryLabel || 'தமிழ் கற்றல்', 80);
  const categorySlug = normalizeSlug(draft.categorySlug || categoryLabel);
  const storageFolder = normalizePath(draft.storageFolder || buildDefaultStorageFolder(categorySlug, slug));
  return {
    slug,
    categoryLabel,
    categorySlug,
    storageFolder,
    contentPath: normalizePath(draft.contentPath || `${storageFolder}/content.md`),
    coverImagePath: resolvePostCoverImagePath(storageFolder, draft.coverImagePath),
  };
}
