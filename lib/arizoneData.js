import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import { ARIZONE_SITE_LOGO_URL, ARIZONE_TOPIC_LOGO_URLS, getArizoneCategoryLogoPath } from './arizoneAssets';
import { toPublicStorageUrl } from './storage';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

const DEFAULT_LOGO_URL = ARIZONE_SITE_LOGO_URL;
const LOCAL_BLOG_ROOT = path.join(process.cwd(), 'arizone_');
const TOPIC_LOGO_URLS = {
  ...ARIZONE_TOPIC_LOGO_URLS,
};

function cleanText(value) {
  return String(value ?? '').trim();
}

function normalizeSlug(value) {
  return cleanText(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizePathValue(value) {
  return cleanText(value).replace(/^\/+/, '').replace(/\/+$/, '');
}

function serializeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toISOString();
}

function isExternalUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:|mailto:|javascript:)/i.test(cleanText(value));
}

function resolveStoragePath(baseFolder, assetPath) {
  const cleanAsset = cleanText(assetPath);
  if (!cleanAsset || isExternalUrl(cleanAsset)) {
    return cleanAsset;
  }

  const normalizedAsset = cleanAsset.replace(/^\/+/, '');
  if (normalizedAsset.startsWith('arizone-posts/')) {
    return normalizedAsset;
  }

  const folder = normalizePathValue(baseFolder);
  if (!folder) {
    return normalizedAsset;
  }

  return `${folder}/${normalizedAsset}`;
}

function resolveStorageUrl(baseFolder, assetPath, assetMode = 'remote') {
  const storagePath = resolveStoragePath(baseFolder, assetPath);
  if (!storagePath || isExternalUrl(storagePath)) {
    return storagePath;
  }
  if (assetMode === 'local') {
    return `/${storagePath.replace(/^\/+/, '')}`;
  }
  return toPublicStorageUrl(storagePath);
}

function rewriteRelativeAttributes(html, baseFolder, assetMode = 'remote') {
  const attributes = ['src', 'href', 'poster'];
  let output = String(html ?? '');

  for (const attribute of attributes) {
    const pattern = new RegExp(`(${attribute}\\s*=\\s*["'])([^"']+)(["'])`, 'gi');
    output = output.replace(pattern, (match, prefix, value, suffix) => {
      const cleanValue = cleanText(value);
      if (!cleanValue || isExternalUrl(cleanValue) || cleanValue.startsWith('/')) {
        return match;
      }
      return `${prefix}${resolveStorageUrl(baseFolder, cleanValue, assetMode)}${suffix}`;
    });
  }

  return output;
}

function markdownToHtml(content, baseFolder, assetMode = 'remote') {
  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  const rendered = marked.parse(String(content ?? ''));
  return rewriteRelativeAttributes(rendered, baseFolder, assetMode);
}

function extractMarkdownTitle(content) {
  const lines = String(content ?? '').split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return cleanText(match[1]);
    }
  }
  return '';
}

function categorySlugFromRow(row) {
  return normalizeSlug(row?.category_slug || row?.categorySlug || row?.category_label || row?.category || '');
}

function categoryLabelFromRow(row) {
  const label = cleanText(row?.category_label || row?.category || '');
  if (label) return label;
  const slug = categorySlugFromRow(row);
  if (!slug) return '';
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeCategoryRow(row) {
  const slug = normalizeSlug(row?.slug);
  const label = cleanText(row?.label || row?.name || '');
  const logoPath = normalizePathValue(row?.logo_path || row?.logoPath || getArizoneCategoryLogoPath(slug));
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

function normalizeImagePathList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = cleanText(value);
    return trimmed ? [trimmed] : [];
  }
  return [];
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

async function loadArizoneCategoryRows() {
  if (!sql) return [];
  await ensureArizoneSchema();
  const rows = await sql`
    SELECT *
    FROM arizone_categories
    ORDER BY label ASC, slug ASC
  `;
  return rows.map(normalizeCategoryRow);
}

function localPostStorageFolder(post) {
  const categorySlug = normalizeSlug(post?.category || post?.categoryLabel || post?.category_label || '');
  const postSlug = normalizeSlug(post?.id || post?.slug || '');
  if (!categorySlug || !postSlug) {
    return '';
  }
  return `arizone-posts/${categorySlug}/${postSlug}`;
}

async function resolveLocalCoverImage(storageFolder) {
  const candidates = ['cover.webp', 'cover.png', 'cover.jpg', 'cover.jpeg', 'cover.gif', 'cover.avif'];
  for (const candidate of candidates) {
    const sourcePath = path.join(LOCAL_BLOG_ROOT, storageFolder.replace(/^arizone-posts\//, 'posts/'), 'images', candidate);
    if (await fileExists(sourcePath)) {
      return `images/${candidate}`;
    }
  }
  return '';
}

async function loadLocalPostIndex() {
  const localIndexPath = path.join(LOCAL_BLOG_ROOT, 'posts.json');
  const data = await readJsonIfExists(localIndexPath);
  const posts = Array.isArray(data?.posts) ? data.posts : [];

  const resolvedPosts = await Promise.all(posts.map(async (row) => {
    const storageFolder = localPostStorageFolder(row);
    const coverImagePath = storageFolder ? await resolveLocalCoverImage(storageFolder) : '';
    return applyRowPresentation({
      slug: normalizeSlug(row?.id),
      title: cleanText(row?.title),
      category_label: cleanText(row?.category),
      category_slug: normalizeSlug(row?.category),
      summary: '',
      storage_folder: storageFolder,
      asset_mode: 'local',
      content_path: storageFolder ? `/${storageFolder}/content.md` : '',
      cover_image_path: coverImagePath ? `/${storageFolder}/${coverImagePath}` : '',
      image_paths: [],
      published_at: row?.date ? `${row.date}T00:00:00.000Z` : null,
      is_published: true,
    });
  }));

  return resolvedPosts
    .filter(Boolean)
    .sort((left, right) => new Date(right.publishedAt || 0) - new Date(left.publishedAt || 0));
}

function normalizePostRow(row) {
  const slug = normalizeSlug(row?.slug);
  const assetMode = String(row?.asset_mode || row?.assetMode || 'remote').trim().toLowerCase() === 'local'
    ? 'local'
    : 'remote';
  const storageFolder = normalizePathValue(row?.storage_folder || `arizone-posts/${slug}`);
  const contentPath = assetMode === 'local'
    ? cleanText(row?.content_path || `/${storageFolder}/content.md`)
    : normalizePathValue(row?.content_path || `${storageFolder}/content.md`);
  const coverImagePath = assetMode === 'local'
    ? cleanText(row?.cover_image_path || `/${storageFolder}/images/cover.img`)
    : normalizePathValue(row?.cover_image_path || `${storageFolder}/images/cover.img`);
  const imagePaths = normalizeImagePathList(row?.image_paths);
  const title = cleanText(row?.title);
  const categorySlug = categorySlugFromRow(row);
  const categoryLabel = categoryLabelFromRow(row);

  return {
    id: row?.id ?? null,
    slug,
    title,
    categorySlug,
    categoryLabel,
    summary: cleanText(row?.summary),
    contentMarkdown: typeof row?.content_markdown === 'string' ? row.content_markdown : String(row?.contentMarkdown || ''),
    storageFolder,
    contentPath,
    coverImagePath,
    imagePaths,
    assetMode,
    publishedAt: serializeDateValue(row?.published_at || row?.publishedAt || null),
    isPublished: Boolean(row?.is_published ?? row?.isPublished ?? true),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt || null),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt || null),
  };
}

function applyRowPresentation(row, categoryMap = new Map()) {
  const normalized = normalizePostRow(row);
  const toLocalUrl = (value) => {
    const cleanValue = cleanText(value);
    if (!cleanValue) return '';
    return cleanValue.startsWith('/') ? cleanValue : `/${cleanValue}`;
  };
  const categoryRow = categoryMap.get(normalized.categorySlug) || null;

  return {
    ...normalized,
    heroLogoUrl: TOPIC_LOGO_URLS[normalized.categorySlug] || DEFAULT_LOGO_URL,
    categoryLogoUrl: categoryRow?.logoPath ? toPublicStorageUrl(categoryRow.logoPath) : '',
    coverImageUrl: normalized.assetMode === 'local'
      ? toLocalUrl(normalized.coverImagePath)
      : resolveStorageUrl(normalized.storageFolder, normalized.coverImagePath, normalized.assetMode),
    imageUrls: normalized.imagePaths
      .map((imagePath) => (
        normalized.assetMode === 'local'
          ? toLocalUrl(resolveStoragePath(normalized.storageFolder, imagePath))
          : resolveStorageUrl(normalized.storageFolder, imagePath, normalized.assetMode)
      ))
      .filter(Boolean),
  };
}

async function ensureArizoneSchema() {
  if (!sql) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS arizone_categories (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL DEFAULT '',
      logo_path TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS arizone_posts (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      category_label TEXT NOT NULL DEFAULT '',
      category_slug TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      storage_folder TEXT NOT NULL DEFAULT '',
      content_path TEXT NOT NULL DEFAULT '',
      cover_image_path TEXT NOT NULL DEFAULT '',
      image_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE arizone_categories ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE arizone_categories ADD COLUMN IF NOT EXISTS logo_path TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE arizone_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE arizone_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS category_label TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS category_slug TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS storage_folder TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS content_path TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS cover_image_path TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS image_paths JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`CREATE INDEX IF NOT EXISTS idx_arizone_posts_published_at ON arizone_posts (published_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_arizone_posts_category_slug ON arizone_posts (category_slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_arizone_categories_slug ON arizone_categories (slug)`;
}

export async function listArizonePosts() {
  if (!sql) {
    return loadLocalPostIndex();
  }

  await ensureArizoneSchema();
  const categoryRows = await loadArizoneCategoryRows();
  const categoryMap = new Map(categoryRows.map((category) => [category.slug, category]));
  const rows = await sql`
    SELECT *
    FROM arizone_posts
    WHERE is_published = TRUE
    ORDER BY published_at DESC, id DESC
  `;

  if (rows.length > 0) {
    return rows.map((row) => applyRowPresentation(row, categoryMap));
  }

  return loadLocalPostIndex();
}

export async function listArizoneCategories() {
  if (!sql) return [];
  return loadArizoneCategoryRows();
}

export async function getArizonePostBySlug(slug) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return null;
  }

  let post = null;

  if (sql) {
    await ensureArizoneSchema();
    const rows = await sql`
      SELECT *
      FROM arizone_posts
      WHERE slug = ${normalizedSlug}
        AND is_published = TRUE
      LIMIT 1
    `;
    if (rows[0]) {
      const categoryRows = await loadArizoneCategoryRows();
      const categoryMap = new Map(categoryRows.map((category) => [category.slug, category]));
      post = applyRowPresentation(rows[0], categoryMap);
    }
  }

  if (!post) {
    const localPosts = await loadLocalPostIndex();
    post = localPosts.find((entry) => entry.slug === normalizedSlug) || null;
  }

  if (!post) {
    return null;
  }

  let markdown = '';

  if (typeof post.contentMarkdown === 'string' && post.contentMarkdown.trim()) {
    markdown = post.contentMarkdown;
  } else if (post.assetMode === 'local') {
    const localContentPath = path.join(
      LOCAL_BLOG_ROOT,
      post.storageFolder.replace(/^arizone-posts\//, 'posts/'),
      'content.md',
    );
    try {
      markdown = await readFile(localContentPath, 'utf8');
    } catch (_error) {
      markdown = '';
    }
  } else {
    const contentUrl = post.contentPath ? toPublicStorageUrl(post.contentPath) : '';
    if (contentUrl) {
      const response = await fetch(contentUrl);
      if (response.ok) {
        markdown = await response.text();
      }
    }

    if (!markdown) {
      const localContentPath = path.join(
        LOCAL_BLOG_ROOT,
        post.storageFolder.replace(/^arizone-posts\//, 'posts/'),
        'content.md',
      );
      try {
        markdown = await readFile(localContentPath, 'utf8');
      } catch (_error) {
        markdown = '';
      }
    }
  }

  const html = markdownToHtml(markdown, post.storageFolder, post.assetMode);

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

    const label = cleanText(post?.categoryLabel || post?.category_label || post?.category || '');
    const resolvedLabel = label || slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    if (!categories.has(slug)) {
      categories.set(slug, resolvedLabel);
    }
  }

  return [...categories.entries()]
    .map(([slug, label]) => ({ slug, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getArizoneHeroLogo(topicSlug = 'all') {
  if (topicSlug === 'all') {
    return DEFAULT_LOGO_URL;
  }
  return TOPIC_LOGO_URLS[topicSlug] || DEFAULT_LOGO_URL;
}

export function getArizoneCardImage(post) {
  if (!post) return DEFAULT_LOGO_URL;
  return post.coverImageUrl || getArizoneHeroLogo(post.categorySlug);
}
