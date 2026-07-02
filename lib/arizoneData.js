import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import { ARIZONE_SITE_LOGO_URL, ARIZONE_TOPIC_LOGO_URLS } from './arizoneAssets.js';
import { toPublicStorageUrl } from './storage.js';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;
const LOCAL_BLOG_ROOT = path.join(process.cwd(), 'arizone_');
const DEFAULT_LOGO_URL = ARIZONE_SITE_LOGO_URL;
const ARIZONE_ALLOWED_CATEGORY_SLUGS = new Set(Object.keys(ARIZONE_TOPIC_LOGO_URLS));
const ARIZONE_CATEGORY_LABELS = {
  'deep-learning': 'Deep Learning',
  'quantum-computing': 'Quantum Computing',
};

function cleanText(value) {
  return String(value ?? '').trim();
}

function normalizeSlug(value) {
  return cleanText(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveSlug(primaryValue, fallbackValue = '') {
  const primarySlug = normalizeSlug(primaryValue);
  const fallbackSlug = normalizeSlug(fallbackValue);
  if (primarySlug && primarySlug !== 'untitled') return primarySlug;
  return fallbackSlug || primarySlug || 'untitled';
}

function normalizePathValue(value) {
  return cleanText(value).replace(/^\/+/, '').replace(/\/+$/, '');
}

function resolvePostCoverImagePath(storageFolder, coverImagePath) {
  const fallback = normalizePathValue(`${storageFolder}/images/cover.webp`);
  const candidate = normalizePathValue(coverImagePath);
  if (!candidate) return fallback;
  if (candidate.includes('/posts//')) return fallback;
  if (/^arizone\/posts\/images\/cover\.webp$/i.test(candidate)) return fallback;
  if (/^arizone\/posts\/[^/]+\/images\/cover\.webp$/i.test(candidate)) return candidate;
  if (/\/images\/cover\.webp$/i.test(candidate) && candidate.startsWith(storageFolder)) return candidate;
  return candidate;
}

function serializeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
}

function isExternalUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:|mailto:|javascript:)/i.test(cleanText(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTags(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').trim();
}

function normalizeInlineMediaBlocks(content) {
  const source = String(content ?? '');

  const withCaption = source.replace(
    /<image(?:WithCaption|Caption)>\s*<(?:img|image)>([\s\S]*?)<\/(?:img|image)>\s*<caption>([\s\S]*?)<\/caption>\s*<\/image(?:WithCaption|Caption)>/gi,
    (_match, imageUrl, caption) => {
      const src = cleanText(imageUrl);
      if (!src) return '';

      const captionText = cleanText(caption);
      const altText = stripTags(captionText) || 'Image';
      return [
        '',
        '<figure class="arizone-image-with-caption">',
        `  <img class="arizone-post-image" src="${escapeHtml(src)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" />`,
        captionText ? `  <figcaption>${escapeHtml(captionText)}</figcaption>` : '',
        '</figure>',
        '',
      ]
        .filter((line) => line !== '')
        .join('\n');
    },
  );

  return withCaption.replace(/<(?:img|image)>\s*([\s\S]*?)\s*<\/(?:img|image)>/gi, (_match, imageUrl) => {
    const src = cleanText(imageUrl);
    if (!src) return '';
    return [
      '',
      `<img class="arizone-post-image" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" />`,
      '',
    ].join('\n');
  });
}

function resolveStoragePath(baseFolder, assetPath) {
  const cleanAsset = cleanText(assetPath);
  if (!cleanAsset || isExternalUrl(cleanAsset)) return cleanAsset;

  const normalizedAsset = cleanAsset.replace(/^\/+/, '');
  if (normalizedAsset.startsWith('arizone/')) return normalizedAsset;

  const folder = normalizePathValue(baseFolder);
  if (!folder) return normalizedAsset;
  return `${folder}/${normalizedAsset}`;
}

function resolveStorageUrl(baseFolder, assetPath) {
  const storagePath = resolveStoragePath(baseFolder, assetPath);
  if (!storagePath || isExternalUrl(storagePath)) return storagePath;
  return toPublicStorageUrl(storagePath);
}

function rewriteRelativeAttributes(html, baseFolder) {
  const attributes = ['src', 'href', 'poster'];
  let output = String(html ?? '');

  for (const attribute of attributes) {
    const pattern = new RegExp(`(${attribute}\\s*=\\s*["'])([^"']+)(["'])`, 'gi');
    output = output.replace(pattern, (match, prefix, value, suffix) => {
      const cleanValue = cleanText(value);
      if (!cleanValue || isExternalUrl(cleanValue) || cleanValue.startsWith('/')) return match;
      return `${prefix}${resolveStorageUrl(baseFolder, cleanValue)}${suffix}`;
    });
  }

  return output;
}

function markdownToHtml(content, baseFolder) {
  marked.setOptions({ gfm: true, breaks: false });
  const normalizedContent = normalizeInlineMediaBlocks(content);
  return rewriteRelativeAttributes(marked.parse(normalizedContent), baseFolder);
}

function extractMarkdownTitle(content) {
  const lines = String(content ?? '').split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) return cleanText(match[1]);
  }
  return '';
}

function normalizeCategoryRow(row) {
  const slug = resolveSlug(row?.slug, row?.label || row?.name);
  const label = ARIZONE_CATEGORY_LABELS[slug] || cleanText(row?.label || row?.name || '');
  const logoPath = normalizePathValue(row?.logo_path || row?.logoPath || `arizone/categories/${slug}/logo.webp`);
  return {
    id: row?.id ?? null,
    slug,
    label,
    logoPath,
    logoUrl: logoPath ? toPublicStorageUrl(logoPath) : '',
    createdAt: serializeDateValue(row?.created_at || row?.createdAt || null),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt || null),
  };
}

function belongsToAriZone(record = {}) {
  const paths = [record?.storageFolder, record?.contentPath, record?.coverImagePath, record?.logoPath]
    .map((value) => cleanText(value))
    .filter(Boolean);
  if (paths.some((value) => value.startsWith('arichuvadi/'))) return false;
  const categorySlug = cleanText(record?.categorySlug || '');
  if (categorySlug && !ARIZONE_ALLOWED_CATEGORY_SLUGS.has(categorySlug)) return false;
  const slug = cleanText(record?.slug || '');
  if (slug && slug !== 'all' && slug === cleanText(record?.categoryLabel || '')) return false;
  return true;
}

function normalizePostRow(row, categoryMap = new Map()) {
  const slug = resolveSlug(row?.slug, row?.title);
  const categorySlug = normalizeSlug(row?.category_slug || row?.categorySlug || row?.category_label || row?.category || '');
  const categoryLabel = cleanText(row?.category_label || row?.categoryLabel || row?.category || '');
  const storageFolder = normalizePathValue(row?.storage_folder || `arizone/posts/${categorySlug}/${slug}`);
  const categoryRow = categoryMap.get(categorySlug) || null;
  const coverImagePath = resolvePostCoverImagePath(storageFolder, row?.cover_image_path);
  const imagePaths = Array.isArray(row?.image_paths) ? row.image_paths.map((item) => cleanText(item)).filter(Boolean) : [];

  return {
    id: row?.id ?? null,
    slug,
    title: cleanText(row?.title),
    categoryLabel,
    categorySlug,
    summary: cleanText(row?.summary),
    contentMarkdown: typeof row?.content_markdown === 'string' ? row.content_markdown : String(row?.contentMarkdown || ''),
    storageFolder,
    contentPath: normalizePathValue(row?.content_path || `${storageFolder}/content.md`),
    coverImagePath,
    coverImageUrl: row?.cover_image_url
      ? String(row.cover_image_url).trim()
      : toPublicStorageUrl(coverImagePath),
    imagePaths,
    categoryLogoUrl: categoryRow?.logoUrl || ARIZONE_TOPIC_LOGO_URLS[categorySlug] || DEFAULT_LOGO_URL,
    publishedAt: serializeDateValue(row?.published_at || row?.publishedAt || null),
    isPublished: Boolean(row?.is_published ?? row?.isPublished ?? true),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt || null),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt || null),
  };
}

async function ensureSchema() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS arizone (
      id BIGSERIAL PRIMARY KEY,
      kind TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      category_label TEXT NOT NULL DEFAULT '',
      category_slug TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      content_markdown TEXT NOT NULL DEFAULT '',
      storage_folder TEXT NOT NULL DEFAULT '',
      content_path TEXT NOT NULL DEFAULT '',
      cover_image_path TEXT NOT NULL DEFAULT '',
      logo_path TEXT NOT NULL DEFAULT '',
      image_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function loadCategoryMap() {
  if (!sql) return new Map();
  await ensureSchema();
  const rows = await sql`
    SELECT *
    FROM arizone
    WHERE kind = 'category'
    ORDER BY label ASC, slug ASC
  `;
  const categories = rows.map(normalizeCategoryRow);
  return new Map(categories.map((category) => [category.slug, category]));
}

async function loadLocalPostIndex() {
  const localIndexPath = path.join(LOCAL_BLOG_ROOT, 'posts.json');
  try {
    const raw = await readFile(localIndexPath, 'utf8');
    const data = JSON.parse(raw);
    const posts = Array.isArray(data?.posts) ? data.posts : [];
    return posts.map((row) => ({
      id: row?.id ?? row?.slug ?? row?.title ?? '',
      slug: resolveSlug(row?.slug || row?.id, row?.title),
      title: cleanText(row?.title),
      categoryLabel: cleanText(row?.category),
      categorySlug: normalizeSlug(row?.category),
      summary: '',
      contentMarkdown: '',
    storageFolder: `arizone/posts/${normalizeSlug(row?.category)}/${normalizeSlug(row?.id || row?.slug || row?.title)}`,
      contentPath: '',
      coverImagePath: '',
      imagePaths: [],
      categoryLogoUrl: ARIZONE_TOPIC_LOGO_URLS[normalizeSlug(row?.category)] || DEFAULT_LOGO_URL,
      publishedAt: row?.date ? `${row.date}T00:00:00.000Z` : null,
      isPublished: true,
      createdAt: null,
      updatedAt: null,
    }));
  } catch (_error) {
    return [];
  }
}

export async function listArizoneCategories() {
  if (!sql) return [];
  await ensureSchema();
  const rows = await sql`
    SELECT *
    FROM arizone
    WHERE kind = 'category'
    ORDER BY label ASC, slug ASC
  `;
  const categories = rows.map(normalizeCategoryRow).filter((category) => ARIZONE_ALLOWED_CATEGORY_SLUGS.has(category.slug));
  return categories.length > 0
    ? categories
    : Object.entries(ARIZONE_CATEGORY_LABELS).map(([slug, label]) => ({
        id: null,
        slug,
        label,
        logoPath: `arizone/categories/${slug}/logo.webp`,
        logoUrl: toPublicStorageUrl(`arizone/categories/${slug}/logo.webp`),
        createdAt: null,
        updatedAt: null,
      }));
}

export async function listArizonePosts() {
  if (!sql) return loadLocalPostIndex();
  await ensureSchema();
  const categoryMap = await loadCategoryMap();
  const rows = await sql`
    SELECT *
    FROM arizone
    WHERE kind = 'post' AND is_published = TRUE
    ORDER BY published_at DESC, id DESC
  `;
  return rows.length > 0 ? rows.map((row) => normalizePostRow(row, categoryMap)).filter(belongsToAriZone) : [];
}

export async function getArizonePostBySlug(slug) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;

  if (!sql) {
    const localPosts = await loadLocalPostIndex();
    const match = localPosts.find((entry) => entry.slug === normalizedSlug) || null;
    if (!match) return null;
    return {
      ...match,
      content: '',
      html: '',
      title: match.title,
    };
  }

  await ensureSchema();
  const categoryMap = await loadCategoryMap();
  const rows = await sql`
    SELECT *
    FROM arizone
    WHERE kind = 'post' AND slug = ${normalizedSlug} AND is_published = TRUE
    LIMIT 1
  `;
  if (rows[0]) {
    const post = normalizePostRow(rows[0], categoryMap);
    if (belongsToAriZone(post)) {
      return {
        ...post,
        content: '',
        html: '',
        title: post.title,
      };
    }
  }

  const fallbackRows = await sql`
    SELECT *
    FROM arizone
    WHERE kind = 'post' AND is_published = TRUE
    ORDER BY published_at DESC, id DESC
  `;
  const fallbackRow = fallbackRows.find((row) => {
    const post = normalizePostRow(row, categoryMap);
    return belongsToAriZone(post) && (post.slug === normalizedSlug || normalizeSlug(post.title) === normalizedSlug);
  }) || null;
  if (!fallbackRow) return null;
  const post = normalizePostRow(fallbackRow, categoryMap);

  let markdown = '';
  if (typeof fallbackRow.content_markdown === 'string' && fallbackRow.content_markdown.trim()) {
    markdown = fallbackRow.content_markdown;
  } else if (post.contentPath) {
    const contentUrl = toPublicStorageUrl(post.contentPath);
    const response = await fetch(contentUrl);
    if (response.ok) {
      markdown = await response.text();
    }
  }

  const html = markdownToHtml(markdown, post.storageFolder);

  return {
    ...post,
    content: markdown,
    title: extractMarkdownTitle(markdown) || post.title,
    html,
  };
}

export function getArizoneCategoryMeta(posts = []) {
  const categories = new Map();
  for (const post of posts) {
    const slug = cleanText(post?.categorySlug || post?.category_slug || '');
    if (!slug) continue;
    const label = cleanText(post?.categoryLabel || post?.category_label || post?.category || '') || slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    if (!categories.has(slug)) categories.set(slug, label);
  }
  return [...categories.entries()]
    .map(([slug, label]) => ({ slug, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getArizoneHeroLogo(topicSlug = 'all') {
  if (topicSlug === 'all') return DEFAULT_LOGO_URL;
  return ARIZONE_TOPIC_LOGO_URLS[topicSlug] || DEFAULT_LOGO_URL;
}

export function getArizoneCardImage(post) {
  if (!post) return DEFAULT_LOGO_URL;
  return post.coverImageUrl || getArizoneHeroLogo(post.categorySlug);
}
