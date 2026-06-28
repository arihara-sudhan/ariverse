import { neon } from '@neondatabase/serverless';
import { getArizoneCategoryLogoPath } from './arizoneAssets';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

let schemaReady = false;

function cleanText(value, maxLength = null) {
  const text = String(value ?? '').trim();
  if (!Number.isInteger(maxLength) || maxLength <= 0) {
    return text;
  }
  return text.slice(0, maxLength);
}

function normalizeSlug(value) {
  return cleanText(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizePath(value) {
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

function normalizeJsonArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = cleanText(value);
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeJsonArray(parsed);
      }
    } catch (_error) {
      return trimmed
        .split(/\r?\n|,/)
        .map((item) => cleanText(item))
        .filter(Boolean);
    }
  }
  return [];
}

function buildDefaultStorageFolder(categorySlug, slug) {
  const safeCategory = normalizeSlug(categorySlug);
  const safeSlug = normalizeSlug(slug);
  if (!safeCategory || !safeSlug) return '';
  return `arizone-posts/${safeCategory}/${safeSlug}`;
}

function normalizePost(row) {
  const slug = normalizeSlug(row?.slug);
  const categoryLabel = cleanText(row?.category_label || row?.categoryLabel || row?.category || '');
  const categorySlug = normalizeSlug(row?.category_slug || row?.categorySlug || categoryLabel);
  const storageFolder = normalizePath(row?.storage_folder || buildDefaultStorageFolder(categorySlug, slug));
  const contentPath = normalizePath(row?.content_path || `${storageFolder}/content.md`);
  const coverImagePath = normalizePath(row?.cover_image_path || `${storageFolder}/images/cover.img`);
  const imagePaths = normalizeJsonArray(row?.image_paths);

  return {
    id: row?.id ?? null,
    slug,
    title: cleanText(row?.title),
    categoryLabel,
    categorySlug,
    summary: cleanText(row?.summary),
    contentMarkdown: typeof row?.content_markdown === 'string' ? row.content_markdown : String(row?.contentMarkdown || ''),
    storageFolder,
    contentPath,
    coverImagePath,
    imagePaths,
    publishedAt: serializeDateValue(row?.published_at || row?.publishedAt || null),
    isPublished: Boolean(row?.is_published ?? row?.isPublished ?? true),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt || null),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt || null),
  };
}

function normalizeCategory(row) {
  const slug = normalizeSlug(row?.slug);
  const label = cleanText(row?.label || row?.name || '');
  const logoPath = normalizePath(row?.logo_path || row?.logoPath || getArizoneCategoryLogoPath(slug));

  return {
    id: row?.id ?? null,
    slug,
    label,
    logoPath,
    createdAt: serializeDateValue(row?.created_at || row?.createdAt || null),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt || null),
  };
}

function prepareImagesInput(value) {
  return normalizeJsonArray(value);
}

async function ensureSchema() {
  if (!sql || schemaReady) return;
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
      content_markdown TEXT NOT NULL DEFAULT '',
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
  await sql`ALTER TABLE arizone_posts ADD COLUMN IF NOT EXISTS content_markdown TEXT NOT NULL DEFAULT ''`;
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
  schemaReady = true;
}

export async function listArizoneAdminPosts() {
  if (!sql) return [];
  await ensureSchema();
  const rows = await sql`
    SELECT *
    FROM arizone_posts
    ORDER BY updated_at DESC, id DESC
  `;
  return rows.map(normalizePost);
}

export async function getArizoneAdminPostById(id) {
  if (!sql) return null;
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return null;
  await ensureSchema();
  const rows = await sql`
    SELECT *
    FROM arizone_posts
    WHERE id = ${resolvedId}
    LIMIT 1
  `;
  return rows[0] ? normalizePost(rows[0]) : null;
}

export async function listArizoneCategories() {
  if (!sql) return [];
  await ensureSchema();
  const rows = await sql`
    SELECT *
    FROM arizone_categories
    ORDER BY label ASC, slug ASC
  `;
  return rows.map(normalizeCategory);
}

export async function getArizoneCategoryBySlug(slug) {
  if (!sql) return null;
  const resolvedSlug = normalizeSlug(slug);
  if (!resolvedSlug) return null;
  await ensureSchema();
  const rows = await sql`
    SELECT *
    FROM arizone_categories
    WHERE slug = ${resolvedSlug}
    LIMIT 1
  `;
  return rows[0] ? normalizeCategory(rows[0]) : null;
}

export async function getArizoneCategoryById(id) {
  if (!sql) return null;
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return null;
  await ensureSchema();
  const rows = await sql`
    SELECT *
    FROM arizone_categories
    WHERE id = ${resolvedId}
    LIMIT 1
  `;
  return rows[0] ? normalizeCategory(rows[0]) : null;
}

export async function createArizoneCategory(input = {}) {
  if (!sql) return null;
  await ensureSchema();

  const label = cleanText(input.label || input.categoryLabel, 80);
  const slug = normalizeSlug(input.slug || input.categorySlug || label);
  const logoPath = normalizePath(input.logoPath || input.logo_path || getArizoneCategoryLogoPath(slug));
  if (!label || !slug) return null;

  const rows = await sql`
    INSERT INTO arizone_categories (
      slug,
      label,
      logo_path,
      created_at,
      updated_at
    )
    VALUES (
      ${slug},
      ${label},
      ${logoPath},
      NOW(),
      NOW()
    )
    ON CONFLICT (slug)
    DO UPDATE SET
      label = EXCLUDED.label,
      logo_path = EXCLUDED.logo_path,
      updated_at = NOW()
    RETURNING *
  `;

  return rows[0] ? normalizeCategory(rows[0]) : null;
}

export async function updateArizoneCategory(id, input = {}) {
  if (!sql) return null;
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return null;
  await ensureSchema();
  const existingRows = await sql`
    SELECT *
    FROM arizone_categories
    WHERE id = ${resolvedId}
    LIMIT 1
  `;
  const existing = existingRows[0];
  if (!existing) return null;

  const label = cleanText(input.label ?? input.categoryLabel ?? existing.label, 80);
  const slug = normalizeSlug((input.slug ?? input.categorySlug ?? existing.slug) || label);
  const logoPath = normalizePath((input.logoPath ?? input.logo_path ?? existing.logo_path) || getArizoneCategoryLogoPath(slug));

  const rows = await sql`
    UPDATE arizone_categories
    SET
      slug = ${slug},
      label = ${label},
      logo_path = ${logoPath},
      updated_at = NOW()
    WHERE id = ${resolvedId}
    RETURNING *
  `;

  return rows[0] ? normalizeCategory(rows[0]) : null;
}

export async function deleteArizoneCategory(id) {
  if (!sql) return false;
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return false;
  await ensureSchema();
  await sql`DELETE FROM arizone_categories WHERE id = ${resolvedId}`;
  return true;
}

export async function createArizonePost(input = {}) {
  if (!sql) return null;
  await ensureSchema();

  const title = cleanText(input.title, 180);
  const slug = normalizeSlug(input.slug || title);
  const categoryLabel = cleanText(input.categoryLabel || input.category_label, 80);
  const categorySlug = normalizeSlug(input.categorySlug || input.category_slug || categoryLabel);
  const summary = cleanText(input.summary, 500);
  const storageFolder = normalizePath(input.storageFolder || input.storage_folder || buildDefaultStorageFolder(categorySlug, slug));
  const contentPath = normalizePath(input.contentPath || input.content_path || `${storageFolder}/content.md`);
  const coverImagePath = normalizePath(input.coverImagePath || input.cover_image_path || `${storageFolder}/images/cover.img`);
  const imagePaths = prepareImagesInput(input.imagePaths || input.image_paths);
  const publishedAt = input.publishedAt || input.published_at || new Date().toISOString();
  const isPublished = Boolean(input.isPublished ?? input.is_published ?? true);

  const rows = await sql`
    INSERT INTO arizone_posts (
      slug,
      title,
      category_label,
      category_slug,
      summary,
      content_markdown,
      storage_folder,
      content_path,
      cover_image_path,
      image_paths,
      published_at,
      is_published,
      created_at,
      updated_at
    )
    VALUES (
      ${slug},
      ${title},
      ${categoryLabel},
      ${categorySlug},
      ${summary},
      ${String(input.contentMarkdown ?? input.content_markdown ?? '')},
      ${storageFolder},
      ${contentPath},
      ${coverImagePath},
      ${JSON.stringify(imagePaths)}::jsonb,
      ${publishedAt},
      ${isPublished},
      NOW(),
      NOW()
    )
    RETURNING *
  `;

  return rows[0] ? normalizePost(rows[0]) : null;
}

export async function updateArizonePost(id, input = {}) {
  if (!sql) return null;
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return null;
  await ensureSchema();

  const existing = await getArizoneAdminPostById(resolvedId);
  if (!existing) return null;

  const title = cleanText(input.title ?? existing.title, 180);
  const slug = normalizeSlug(input.slug ?? existing.slug);
  const categoryLabel = cleanText(input.categoryLabel ?? input.category_label ?? existing.categoryLabel, 80);
  const categorySlug = normalizeSlug((input.categorySlug ?? input.category_slug ?? existing.categorySlug) || categoryLabel);
  const summary = cleanText(input.summary ?? existing.summary, 500);
  const contentMarkdown = String(input.contentMarkdown ?? input.content_markdown ?? existing.contentMarkdown ?? existing.content_markdown ?? '');
  const storageFolder = normalizePath((input.storageFolder ?? input.storage_folder ?? existing.storageFolder) || buildDefaultStorageFolder(categorySlug, slug));
  const contentPath = normalizePath((input.contentPath ?? input.content_path ?? existing.contentPath) || `${storageFolder}/content.md`);
  const coverImagePath = normalizePath((input.coverImagePath ?? input.cover_image_path ?? existing.coverImagePath) || `${storageFolder}/images/cover.img`);
  const imagePaths = prepareImagesInput(input.imagePaths ?? input.image_paths ?? existing.imagePaths);
  const publishedAt = input.publishedAt ?? input.published_at ?? existing.publishedAt ?? new Date().toISOString();
  const isPublished = input.isPublished ?? input.is_published ?? existing.isPublished ?? true;

  const rows = await sql`
    UPDATE arizone_posts
    SET
      slug = ${slug},
      title = ${title},
      category_label = ${categoryLabel},
      category_slug = ${categorySlug},
      summary = ${summary},
      content_markdown = ${contentMarkdown},
      storage_folder = ${storageFolder},
      content_path = ${contentPath},
      cover_image_path = ${coverImagePath},
      image_paths = ${JSON.stringify(imagePaths)}::jsonb,
      published_at = ${publishedAt},
      is_published = ${isPublished},
      updated_at = NOW()
    WHERE id = ${resolvedId}
    RETURNING *
  `;

  return rows[0] ? normalizePost(rows[0]) : null;
}

export async function deleteArizonePost(id) {
  if (!sql) return false;
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return false;
  await ensureSchema();
  await sql`DELETE FROM arizone_posts WHERE id = ${resolvedId}`;
  return true;
}

export function buildArizoneDraft() {
  return {
    title: '',
    slug: '',
    categoryLabel: 'Deep Learning',
    categorySlug: 'deep-learning',
    summary: '',
    contentMarkdown: '',
    storageFolder: '',
    contentPath: '',
    coverImagePath: '',
    imagePaths: [],
    publishedAt: new Date().toISOString().slice(0, 10),
    isPublished: true,
  };
}

export function buildArizonePathsFromDraft(draft = {}) {
  const title = cleanText(draft.title, 180);
  const slug = normalizeSlug(draft.slug || title);
  const categoryLabel = cleanText(draft.categoryLabel || 'Deep Learning', 80);
  const categorySlug = normalizeSlug(draft.categorySlug || categoryLabel);
  const storageFolder = normalizePath(draft.storageFolder || buildDefaultStorageFolder(categorySlug, slug));
  return {
    slug,
    categoryLabel,
    categorySlug,
    storageFolder,
    contentPath: normalizePath(draft.contentPath || `${storageFolder}/content.md`),
    coverImagePath: normalizePath(draft.coverImagePath || `${storageFolder}/images/cover.img`),
  };
}
