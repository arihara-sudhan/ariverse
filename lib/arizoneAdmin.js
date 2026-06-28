import { neon } from '@neondatabase/serverless';
import { getArizoneCategoryLogoPath } from './arizoneAssets.js';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

let schemaReady = false;

function cleanText(value, maxLength = null) {
  const text = String(value ?? '').trim();
  if (!Number.isInteger(maxLength) || maxLength <= 0) return text;
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
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
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
      if (Array.isArray(parsed)) return normalizeJsonArray(parsed);
    } catch (_error) {
      return trimmed.split(/\r?\n|,/).map((item) => cleanText(item)).filter(Boolean);
    }
  }
  return [];
}

function buildDefaultStorageFolder(categorySlug, slug) {
  const safeCategory = normalizeSlug(categorySlug);
  const safeSlug = normalizeSlug(slug);
  if (!safeCategory || !safeSlug) return '';
  return `arizone/posts/${safeCategory}/${safeSlug}`;
}

function normalizeArizoneRow(row) {
  const kind = cleanText(row?.kind || 'post').toLowerCase() === 'category' ? 'category' : 'post';
  const slug = normalizeSlug(row?.slug);
  const label = cleanText(row?.label || row?.name || '');
  const title = cleanText(row?.title || '');
  const categoryLabel = cleanText(row?.category_label || row?.categoryLabel || label || '');
  const categorySlug = normalizeSlug(row?.category_slug || row?.categorySlug || categoryLabel);
  const storageFolder = normalizePath(row?.storage_folder || buildDefaultStorageFolder(categorySlug, slug));

  return {
    id: row?.id ?? null,
    kind,
    slug,
    title,
    label,
    categoryLabel,
    categorySlug,
    summary: cleanText(row?.summary || ''),
    contentMarkdown: typeof row?.content_markdown === 'string' ? row.content_markdown : String(row?.contentMarkdown || ''),
    storageFolder,
    contentPath: normalizePath(row?.content_path || `${storageFolder}/content.md`),
    coverImagePath: normalizePath(row?.cover_image_path || `${storageFolder}/images/cover.webp`),
    logoPath: normalizePath(row?.logo_path || getArizoneCategoryLogoPath(slug)),
    imagePaths: normalizeJsonArray(row?.image_paths),
    publishedAt: serializeDateValue(row?.published_at || row?.publishedAt || null),
    isPublished: Boolean(row?.is_published ?? row?.isPublished ?? true),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt || null),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt || null),
  };
}

async function ensureSchema() {
  if (!sql || schemaReady) return;
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT arizone_kind_check CHECK (kind IN ('post', 'category')),
      CONSTRAINT arizone_kind_slug_unique UNIQUE (kind, slug)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_arizone_kind ON arizone (kind)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_arizone_published_at ON arizone (published_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_arizone_category_slug ON arizone (category_slug)`;
  schemaReady = true;
}

async function getArizoneRowById(id, kind = null) {
  if (!sql) return null;
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return null;
  await ensureSchema();
  const rows = kind
    ? await sql`
      SELECT *
      FROM arizone
      WHERE id = ${resolvedId} AND kind = ${kind}
      LIMIT 1
    `
    : await sql`
      SELECT *
      FROM arizone
      WHERE id = ${resolvedId}
      LIMIT 1
    `;
  return rows[0] ? normalizeArizoneRow(rows[0]) : null;
}

export async function listArizoneAdminPosts() {
  if (!sql) return [];
  await ensureSchema();
  const rows = await sql`
    SELECT *
    FROM arizone
    WHERE kind = 'post'
    ORDER BY updated_at DESC, id DESC
  `;
  return rows.map(normalizeArizoneRow);
}

export async function getArizoneAdminPostById(id) {
  return getArizoneRowById(id, 'post');
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
  return rows.map(normalizeArizoneRow);
}

export async function getArizoneCategoryBySlug(slug) {
  if (!sql) return null;
  const resolvedSlug = normalizeSlug(slug);
  if (!resolvedSlug) return null;
  await ensureSchema();
  const rows = await sql`
    SELECT *
    FROM arizone
    WHERE kind = 'category' AND slug = ${resolvedSlug}
    LIMIT 1
  `;
  return rows[0] ? normalizeArizoneRow(rows[0]) : null;
}

export async function getArizoneCategoryById(id) {
  return getArizoneRowById(id, 'category');
}

export async function createArizoneCategory(input = {}) {
  if (!sql) return null;
  await ensureSchema();
  const label = cleanText(input.label || input.categoryLabel, 80);
  const slug = normalizeSlug(input.slug || input.categorySlug || label);
  const logoPath = normalizePath(input.logoPath || input.logo_path || getArizoneCategoryLogoPath(slug));
  if (!label || !slug) return null;

  const rows = await sql`
    INSERT INTO arizone (
      kind, slug, label, logo_path, created_at, updated_at
    )
    VALUES (
      'category', ${slug}, ${label}, ${logoPath}, NOW(), NOW()
    )
    ON CONFLICT (kind, slug)
    DO UPDATE SET
      label = EXCLUDED.label,
      logo_path = EXCLUDED.logo_path,
      updated_at = NOW()
    RETURNING *
  `;

  return rows[0] ? normalizeArizoneRow(rows[0]) : null;
}

export async function updateArizoneCategory(id, input = {}) {
  if (!sql) return null;
  const existing = await getArizoneRowById(id, 'category');
  if (!existing) return null;

  const label = cleanText(input.label ?? input.categoryLabel ?? existing.label, 80);
  const slug = normalizeSlug((input.slug ?? input.categorySlug ?? existing.slug) || label);
  const logoPath = normalizePath((input.logoPath ?? input.logo_path ?? existing.logoPath) || getArizoneCategoryLogoPath(slug));

  const rows = await sql`
    UPDATE arizone
    SET
      slug = ${slug},
      label = ${label},
      logo_path = ${logoPath},
      updated_at = NOW()
    WHERE id = ${existing.id} AND kind = 'category'
    RETURNING *
  `;

  return rows[0] ? normalizeArizoneRow(rows[0]) : null;
}

export async function deleteArizoneCategory(id) {
  if (!sql) return false;
  const existing = await getArizoneRowById(id, 'category');
  if (!existing) return false;
  await ensureSchema();
  await sql`DELETE FROM arizone WHERE id = ${existing.id} AND kind = 'category'`;
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
  const coverImagePath = normalizePath(input.coverImagePath || input.cover_image_path || `${storageFolder}/images/cover.webp`);
  const imagePaths = normalizeJsonArray(input.imagePaths || input.image_paths);
  const publishedAt = input.publishedAt || input.published_at || new Date().toISOString();
  const isPublished = Boolean(input.isPublished ?? input.is_published ?? true);

  const rows = await sql`
    INSERT INTO arizone (
      kind, slug, title, category_label, category_slug, summary, content_markdown,
      storage_folder, content_path, cover_image_path, image_paths, published_at,
      is_published, created_at, updated_at
    )
    VALUES (
      'post', ${slug}, ${title}, ${categoryLabel}, ${categorySlug}, ${summary}, ${String(input.contentMarkdown ?? input.content_markdown ?? '')},
      ${storageFolder}, ${contentPath}, ${coverImagePath}, ${JSON.stringify(imagePaths)}::jsonb, ${publishedAt},
      ${isPublished}, NOW(), NOW()
    )
    ON CONFLICT (kind, slug)
    DO UPDATE SET
      title = EXCLUDED.title,
      category_label = EXCLUDED.category_label,
      category_slug = EXCLUDED.category_slug,
      summary = EXCLUDED.summary,
      content_markdown = EXCLUDED.content_markdown,
      storage_folder = EXCLUDED.storage_folder,
      content_path = EXCLUDED.content_path,
      cover_image_path = EXCLUDED.cover_image_path,
      image_paths = EXCLUDED.image_paths,
      published_at = EXCLUDED.published_at,
      is_published = EXCLUDED.is_published,
      updated_at = NOW()
    RETURNING *
  `;

  return rows[0] ? normalizeArizoneRow(rows[0]) : null;
}

export async function updateArizonePost(id, input = {}) {
  if (!sql) return null;
  const existing = await getArizoneRowById(id, 'post');
  if (!existing) return null;

  const title = cleanText(input.title ?? existing.title, 180);
  const slug = normalizeSlug(input.slug ?? existing.slug);
  const categoryLabel = cleanText(input.categoryLabel ?? input.category_label ?? existing.categoryLabel, 80);
  const categorySlug = normalizeSlug((input.categorySlug ?? input.category_slug ?? existing.categorySlug) || categoryLabel);
  const summary = cleanText(input.summary ?? existing.summary, 500);
  const contentMarkdown = String(input.contentMarkdown ?? input.content_markdown ?? existing.contentMarkdown ?? '');
  const storageFolder = normalizePath((input.storageFolder ?? input.storage_folder ?? existing.storageFolder) || buildDefaultStorageFolder(categorySlug, slug));
  const contentPath = normalizePath((input.contentPath ?? input.content_path ?? existing.contentPath) || `${storageFolder}/content.md`);
  const coverImagePath = normalizePath((input.coverImagePath ?? input.cover_image_path ?? existing.coverImagePath) || `${storageFolder}/images/cover.webp`);
  const imagePaths = normalizeJsonArray(input.imagePaths ?? input.image_paths ?? existing.imagePaths);
  const publishedAt = input.publishedAt ?? input.published_at ?? existing.publishedAt ?? new Date().toISOString();
  const isPublished = input.isPublished ?? input.is_published ?? existing.isPublished ?? true;

  const rows = await sql`
    UPDATE arizone
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
    WHERE id = ${existing.id} AND kind = 'post'
    RETURNING *
  `;

  return rows[0] ? normalizeArizoneRow(rows[0]) : null;
}

export async function deleteArizonePost(id) {
  if (!sql) return false;
  const existing = await getArizoneRowById(id, 'post');
  if (!existing) return false;
  await ensureSchema();
  await sql`DELETE FROM arizone WHERE id = ${existing.id} AND kind = 'post'`;
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
    coverImagePath: normalizePath(draft.coverImagePath || `${storageFolder}/images/cover.webp`),
  };
}
