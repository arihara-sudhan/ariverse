import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ARICHUVADI_SITE_LOGO_URL, ARICHUVADI_TOPIC_LOGO_URLS } from './arichuvadiAssets.js';
import { renderMarkdownToSafeHtml } from './markdownRenderer.js';
import { toPublicStorageUrl } from './storage.js';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;
const LOCAL_BLOG_ROOT = path.join(process.cwd(), 'arichuvadi_');
const DEFAULT_LOGO_URL = ARICHUVADI_SITE_LOGO_URL;
const KAVITHAIGAL_CATEGORY_SLUG = 'kavithaigal';
const KAVITHAIGAL_CATEGORY_LABEL = 'கவிதைகள்';
let legacyKavithaiMigrationPromise = null;

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
  if (isExternalUrl(candidate)) return candidate;
  if (candidate.includes('/posts//')) return fallback;
  if (/^arichuvadi\/posts\/images\/cover\.webp$/i.test(candidate)) return fallback;
  if (/^arichuvadi\/posts\/[^/]+\/images\/cover\.webp$/i.test(candidate)) return candidate;
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

async function loadMarkdownFromContentPath(contentPath) {
  const normalizedPath = normalizePathValue(contentPath);
  if (!normalizedPath) return '';
  try {
    const response = await fetch(toPublicStorageUrl(normalizedPath));
    if (!response.ok) return '';
    const text = await response.text();
    return cleanText(text);
  } catch (_error) {
    return '';
  }
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
  const label = cleanText(row?.label || row?.name || '');
  const logoPath = normalizePathValue(row?.logo_path || row?.logoPath || `arichuvadi/categories/${slug}/logo.webp`);
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

function belongsToArichuvadi(record = {}) {
  const paths = [record?.storageFolder, record?.contentPath, record?.coverImagePath, record?.logoPath]
    .map((value) => cleanText(value))
    .filter(Boolean);
  if (paths.some((value) => value.startsWith('arichuvadi/'))) return true;
  if (paths.some((value) => value.startsWith('arizone/'))) return false;
  return true;
}

export async function runArichuvadiLegacyMigration(database = sql) {
  const sql = database;
  if (!sql) return;
  if (legacyKavithaiMigrationPromise) return legacyKavithaiMigrationPromise;

  legacyKavithaiMigrationPromise = (async () => {
    const legacyRows = await sql`
      SELECT to_regclass('public.ariyin_kavithaigal')::text AS name
    `;
    if (!legacyRows[0]?.name) {
      return;
    }

    await sql`
      INSERT INTO arichuvadi (
        kind, slug, title, label, category_label, category_slug, summary,
        content_markdown, storage_folder, content_path, cover_image_path,
        logo_path, image_paths, published_at, is_published, created_at, updated_at
      )
      SELECT
        'category',
        ${KAVITHAIGAL_CATEGORY_SLUG},
        ${KAVITHAIGAL_CATEGORY_LABEL},
        ${KAVITHAIGAL_CATEGORY_LABEL},
        ${KAVITHAIGAL_CATEGORY_LABEL},
        ${KAVITHAIGAL_CATEGORY_SLUG},
        '',
        '',
        ${`arichuvadi/categories/${KAVITHAIGAL_CATEGORY_SLUG}`},
        ${`arichuvadi/categories/${KAVITHAIGAL_CATEGORY_SLUG}/content.md`},
        '',
        ${'assets/hero-images-of-modules/ari-kavithai.webp'},
        '[]'::jsonb,
        NOW(),
        TRUE,
        NOW(),
        NOW()
      ON CONFLICT (kind, slug) DO NOTHING
    `;

    const poems = await sql`
      SELECT id, image_url AS "imageUrl", markdown_text AS "markdownText", kavithai_name AS "kavithaiName", created_at AS "createdAt", sort_order AS "sortOrder"
      FROM ariyin_kavithaigal
      WHERE TRIM(COALESCE(kavithai_name, '')) <> ''
      ORDER BY sort_order ASC, id ASC
    `;

    for (const poem of poems) {
      const safeSlug = `kavithai-${poem.id}`;
      const title = cleanText(poem.kavithaiName, 180);
      const storageFolder = `arichuvadi/posts/${safeSlug}`;
      const contentPath = `${storageFolder}/content.md`;
      const coverImagePath = cleanText(poem.imageUrl);

      await sql`
        INSERT INTO arichuvadi (
          kind, slug, title, label, category_label, category_slug, summary,
          content_markdown, storage_folder, content_path, cover_image_path,
          logo_path, image_paths, published_at, is_published, created_at, updated_at
        )
        VALUES (
          'post',
          ${safeSlug},
          ${title},
          ${title},
          ${KAVITHAIGAL_CATEGORY_LABEL},
          ${KAVITHAIGAL_CATEGORY_SLUG},
          ${cleanText(poem.markdownText, 500)},
          ${cleanText(poem.markdownText)},
          ${storageFolder},
          ${contentPath},
          ${coverImagePath},
          '',
          '[]'::jsonb,
          COALESCE(${poem.createdAt}, NOW()),
          TRUE,
          COALESCE(${poem.createdAt}, NOW()),
          NOW()
        )
        ON CONFLICT (kind, slug) DO NOTHING
      `;
    }
  })().catch((error) => {
    legacyKavithaiMigrationPromise = null;
    throw error;
  });

  return legacyKavithaiMigrationPromise;
}

function normalizePostRow(row, categoryMap = new Map()) {
  const slug = resolveSlug(row?.slug, row?.title);
  const categorySlug = normalizeSlug(row?.category_slug || row?.categorySlug || row?.category_label || row?.category || '');
  const categoryLabel = cleanText(row?.category_label || row?.categoryLabel || row?.category || '');
  const storageFolder = normalizePathValue(row?.storage_folder || `arichuvadi/posts/${slug}`);
  const categoryRow = categoryMap.get(categorySlug) || null;
  const coverImagePath = resolvePostCoverImagePath(storageFolder, row?.cover_image_path);
  const imagePaths = Array.isArray(row?.image_paths) ? row.image_paths.map((item) => cleanText(item)).filter(Boolean) : [];

  return {
    id: row?.id ?? null,
    slug,
    title: cleanText(row?.title),
    titleEnglish: cleanText(row?.title_english || row?.titleEnglish || ''),
    categoryLabel,
    categorySlug,
    summary: cleanText(row?.summary),
    contentMarkdown: typeof row?.content_markdown === 'string' ? row.content_markdown : String(row?.contentMarkdown || ''),
    translationReadme: typeof row?.translation_readme === 'string' ? row.translation_readme : String(row?.translationReadme || ''),
    storageFolder,
    contentPath: normalizePathValue(row?.content_path || `${storageFolder}/content.md`),
    coverImagePath,
    coverImageUrl: row?.cover_image_url
      ? String(row.cover_image_url).trim()
      : (coverImagePath.startsWith('http://') || coverImagePath.startsWith('https://')
          ? coverImagePath
          : toPublicStorageUrl(coverImagePath)),
    imagePaths,
    categoryLogoUrl: categoryRow?.logoUrl || ARICHUVADI_TOPIC_LOGO_URLS[categorySlug] || DEFAULT_LOGO_URL,
    publishedAt: serializeDateValue(row?.published_at || row?.publishedAt || null),
    isPublished: Boolean(row?.is_published ?? row?.isPublished ?? true),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt || null),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt || null),
  };
}

async function loadCategoryMap() {
  if (!sql) return new Map();
  const rows = await sql`
    SELECT *
    FROM arichuvadi
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
      storageFolder: `arichuvadi/posts/${normalizeSlug(row?.id || row?.slug || row?.title)}`,
      contentPath: '',
      coverImagePath: '',
      imagePaths: [],
      categoryLogoUrl: ARICHUVADI_TOPIC_LOGO_URLS[normalizeSlug(row?.category)] || DEFAULT_LOGO_URL,
      publishedAt: row?.date ? `${row.date}T00:00:00.000Z` : null,
      isPublished: true,
      createdAt: null,
      updatedAt: null,
    }));
  } catch (_error) {
    return [];
  }
}

export async function listArichuvadiCategories() {
  if (!sql) return [];
  const rows = await sql`
    SELECT *
    FROM arichuvadi
    WHERE kind = 'category'
    ORDER BY label ASC, slug ASC
  `;
  return rows.map(normalizeCategoryRow).filter(belongsToArichuvadi);
}

export async function listArichuvadiPosts() {
  if (!sql) return loadLocalPostIndex();
  const categoryMap = await loadCategoryMap();
  const rows = await sql`
    SELECT *
    FROM arichuvadi
    WHERE kind = 'post' AND is_published = TRUE
    ORDER BY published_at DESC, id DESC
  `;
  return rows.length > 0 ? rows.map((row) => normalizePostRow(row, categoryMap)).filter(belongsToArichuvadi) : [];
}

export async function getArichuvadiPostBySlug(slug) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;
  const lookupSlug = normalizedSlug === 'untitled' ? 'oyvu-naal' : normalizedSlug;

  if (!sql) {
    const localPosts = await loadLocalPostIndex();
    const match = localPosts.find((entry) => entry.slug === lookupSlug || (normalizedSlug === 'untitled' && entry.slug === 'oyvu-naal')) || null;
    if (!match) return null;
    return {
      ...match,
      content: '',
      html: '',
      title: match.title,
    };
  }
  const categoryMap = await loadCategoryMap();
  const rows = await sql`
    SELECT *
    FROM arichuvadi
    WHERE kind = 'post' AND slug = ${lookupSlug} AND is_published = TRUE
    LIMIT 1
  `;
  let row = rows[0] || null;
  let post = row ? normalizePostRow(row, categoryMap) : null;
  if (post && !belongsToArichuvadi(post)) {
    row = null;
    post = null;
  }

  if (!post) {
    const legacyRows = await sql`
      SELECT id, image_url AS "imageUrl", markdown_text AS "markdownText", kavithai_name AS "kavithaiName", created_at AS "createdAt"
      FROM ariyin_kavithaigal
      ORDER BY sort_order ASC, id ASC
    `;
    const legacyMatch = legacyRows.find((candidate) => {
      const candidateSlug = `kavithai-${candidate.id}`;
      return normalizeSlug(candidateSlug) === normalizedSlug;
    }) || null;
    if (legacyMatch) {
      const title = cleanText(legacyMatch.kavithaiName);
      const storageFolder = `arichuvadi/posts/kavithai-${legacyMatch.id}`;
      const coverImagePath = cleanText(legacyMatch.imageUrl);
      const markdown = cleanText(legacyMatch.markdownText);
      return {
        id: legacyMatch.id,
        slug: `kavithai-${legacyMatch.id}`,
        title,
        categoryLabel: KAVITHAIGAL_CATEGORY_LABEL,
        categorySlug: KAVITHAIGAL_CATEGORY_SLUG,
        summary: markdown,
        contentMarkdown: markdown,
        storageFolder,
        contentPath: `${storageFolder}/content.md`,
        coverImagePath,
        coverImageUrl: coverImagePath.startsWith('http://') || coverImagePath.startsWith('https://')
          ? coverImagePath
          : toPublicStorageUrl(coverImagePath),
        imagePaths: [],
        categoryLogoUrl: ARICHUVADI_TOPIC_LOGO_URLS[KAVITHAIGAL_CATEGORY_SLUG] || DEFAULT_LOGO_URL,
        publishedAt: serializeDateValue(legacyMatch.createdAt),
        isPublished: true,
        createdAt: serializeDateValue(legacyMatch.createdAt),
        updatedAt: serializeDateValue(legacyMatch.createdAt),
        content: markdown,
        html: renderMarkdownToSafeHtml(markdown, storageFolder, {
          section: 'arichuvadi',
          categorySlug: KAVITHAIGAL_CATEGORY_SLUG,
          slug: `kavithai-${legacyMatch.id}`,
        }),
      };
    }

    const fallbackRows = await sql`
      SELECT *
      FROM arichuvadi
      WHERE kind = 'post' AND is_published = TRUE
      ORDER BY published_at DESC, id DESC
    `;
    const fallbackRow = fallbackRows.find((candidate) => {
      const candidatePost = normalizePostRow(candidate, categoryMap);
      return belongsToArichuvadi(candidatePost) && (candidatePost.slug === lookupSlug || normalizeSlug(candidatePost.title) === lookupSlug);
    }) || null;
    if (!fallbackRow) return null;
    row = fallbackRow;
    post = normalizePostRow(fallbackRow, categoryMap);
  }

  let markdown = '';
  if (post.contentPath) {
    markdown = await loadMarkdownFromContentPath(post.contentPath);
  }
  if (!markdown && typeof row.content_markdown === 'string' && row.content_markdown.trim()) {
    markdown = row.content_markdown;
  }

  const html = renderMarkdownToSafeHtml(markdown, post.storageFolder, {
    section: 'arichuvadi',
    categorySlug: post.categorySlug,
    slug: post.slug,
  });
  const translationHtml = post.translationReadme
    ? renderMarkdownToSafeHtml(post.translationReadme, post.storageFolder, {
        section: 'arichuvadi',
        categorySlug: post.categorySlug,
        slug: post.slug,
      })
    : '';

  return {
    ...post,
    content: markdown,
    title: extractMarkdownTitle(markdown) || post.title,
    html,
    translationHtml,
  };
}

export function getArichuvadiCategoryMeta(posts = []) {
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

export function getArichuvadiHeroLogo(topicSlug = 'all') {
  if (topicSlug === 'all') return DEFAULT_LOGO_URL;
  return ARICHUVADI_TOPIC_LOGO_URLS[topicSlug] || DEFAULT_LOGO_URL;
}

export function getArichuvadiCardImage(post) {
  if (!post) return DEFAULT_LOGO_URL;
  return post.coverImageUrl || getArichuvadiHeroLogo(post.categorySlug);
}
