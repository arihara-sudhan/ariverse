# AriVerse: end-to-end architecture and schema capture

> Repository review date: 2026-11-26. This document describes the files currently on disk, and calls out the working-tree deletion of the ARI XPands feature where it changes the architecture. It is an architecture audit, not a claim that the remote database has exactly the schema emitted by the current code.

## 1. Executive summary

AriVerse is a single Next.js 16 Pages Router application. It is deployed as a server-rendered/static-rendered web site plus API routes; it does not have a separate backend service, worker, queue, ORM, migration directory, or typed API contract.

The main runtime path is:

```text
Browser
  |-- public pages (SSG/ISR or SSR)
  |-- browser fetches to /api/* for interactions and admin mutations
  `-- static files under public/
          |
          v
Next.js Pages Router
  |-- pages/*.jsx                 UI and page data loaders
  |-- pages/api/*.js              HTTP boundary
  |-- lib/adminData.js            main Neon/Postgres data access + bootstrap
  |-- lib/arichuvadiData.js       Arichuvadi read model/content loader
  |-- lib/arizoneData.js          AriZone read model/content loader
  |-- lib/arichuvadiAdmin.js      Arichuvadi write model
  |-- lib/arizoneAdmin.js         AriZone write model
  `-- lib/adminAuth/security.js   cookie auth, CSRF-ish origin check, memory rate limits
          |
          |-- Neon serverless Postgres (DATABASE_URL)
          |-- Supabase Storage bucket `ariverse` (images/markdown/media)
          |-- Vercel Blob (resume PDF/pages)
          |-- Formspree (admin notifications)
          `-- YouTube Data API (AI with ARI page)
```

The design is pragmatic and content-oriented, but has four important characteristics:

1. Database schema creation and migrations happen lazily inside request-time JavaScript.
2. `profile_links` is the central navigation/configuration table; many content tables are selected by link label rather than a typed domain registry.
3. Media is represented as URL/path strings and is split between Supabase Storage, Vercel Blob, checked-in `public/`, and hard-coded external URLs.
4. The current working tree has undergone a broad XPand removal; the latest build reaches page-data collection, where it requires a reachable Neon database.

## 2. Repository shape

| Area | Responsibility |
|---|---|
| `pages/` | Next.js pages, dynamic pages, API routes, sitemap/robots |
| `src/components/` | Shared UI and domain views: header, hero, cards, comments, likes, blogs |
| `src/styles.css` | Global CSS; the current worktree removes the XPand-specific blocks that existed in `HEAD` |
| `lib/` | Database access, normalization, storage URL translation, auth/security, integrations |
| `data/` | Checked-in fallback data (`data/ariTrials.js`) |
| `public/` | Static PDF, fonts, images, and a portfolio JSON data file |
| `scripts/` | One-off storage/content migrations and asset utilities |
| `tests/` | Previously XPand-focused Node test; deleted in the current working tree |
| `.env` | Runtime secrets/configuration; currently present in the repository workspace and must not be committed |
| `.next/`, `node_modules/` | Generated/dependency directories; not application source |

The working tree is dirty. Compared with `HEAD`, the following XPand files are deleted: `lib/ariXpands.js`, `lib/ariXpandsCore.mjs`, the XPand pages/components, the XPand create/entity/quick-log API routes, the XPand CSS blocks, and `tests/ari-xpands-core.test.mjs`. The dynamic route `pages/api/admin/ari-xpands/[id].js` was also deleted in the latest filesystem state; it briefly remained during the first build check, which exposed the orphan-import failure documented in §13.

## 3. Request and rendering model

### 3.1 Public page rendering

Most content pages use `getStaticProps` with `revalidate: 60` from `lib/pageCache.js`, so content is regenerated on demand at most approximately once per minute per deployment/cache boundary. Examples include the home page, projects index, mini-projects, career, shelf, books, experiments, clay play, book reviews, guest lectures, Arichuvadi index/detail, and AriZone index/detail.

SSR pages are used where the request affects the response or where the page is an admin/dynamic detail surface: project detail, binomial names, experiments, project/XPand detail historically, admin pages, and sitemap/robots.

The `_app` component adds global CSS, SEO defaults, route loading overlays, and optional anti-inspection browser event handlers controlled by `NEXT_PUBLIC_INSPECTABLE`. `_document` adds Google Fonts and the base HTML shell.

### 3.2 Common read path

```text
page getStaticProps/getServerSideProps
  → lib data function
  → ensure schema/bootstrap where applicable
  → parameterized Neon SQL
  → row normalizer (snake_case DB → camelCase UI object)
  → optional storage URL normalization
  → page props
  → React component
```

`lib/adminData.js` has a special bootstrap state machine: it creates `ariverse_meta`, checks several version keys, creates/updates tables, runs data fixes/seeds, caches profile links for 60 seconds, retries selected Neon fetch failures, and serves empty/fallback content when the database is unavailable. `lib/arichuvadiData.js` and `lib/arizoneData.js` have their own lazy schema initialization instead of sharing this bootstrap.

### 3.3 Mutation path

```text
Browser form/action
  → POST/PUT/PATCH/DELETE /api/*
  → same-origin check for writes
  → admin cookie check when administrative
  → in-process IP rate limit when configured
  → request string/int normalization
  → lib write function
  → SQL INSERT/UPDATE/DELETE and/or external upload
  → JSON response
```

Public comments/testimonials are inserted as `pending`; admin approval changes them to `green`. Some older interaction endpoints (Clay Play and Book Reviews) write directly to like/comment tables without the same moderation workflow.

## 4. Route inventory

### 4.1 Public pages

| Route | Source | Data path / behavior |
|---|---|---|
| `/` | `pages/index.jsx` | Visible `profile_links`, feature images, testimonials/client forms |
| `/projects`, `/projects/[slug]` | `pages/projects*.jsx` | `projects_entries`, tags, project comments/reactions |
| `/mini-projects` | `pages/mini-projects.jsx` | `mini_projects_entries`, reactions |
| `/aris-xperiments` | `pages/aris-xperiments.jsx` | `experiments_entries`, fallback `data/ariTrials.js`, comments/reactions |
| `/ari-career` | `pages/ari-career.jsx` | `career_entries`, reactions |
| `/ari-read-books` | `pages/ari-read-books.jsx` | `books_read_entries`, reactions |
| `/aris-books` | `pages/aris-books.jsx` | `aris_books_entries`, reactions |
| `/aris-shelf` | `pages/aris-shelf.jsx` | `shelf_entries`, reactions |
| `/clay-play` | `pages/clay-play.jsx` | `clay_play_entries`, direct likes/comments |
| `/book-reviews` | `pages/book-reviews.jsx` | `book_reviews_entries`, direct likes |
| `/guest-lectures` | `pages/guest-lectures.jsx` | `guest_lectures_entries`, comments/reactions |
| `/binomial-names` | `pages/binomial-names.jsx` | `binomial_names`, YouTube URL validation |
| `/skillset` | `pages/skillset.jsx` | `skillset_entries`, icon metadata in `src/data/skillsetIcons.js` |
| `/ari-resume` | `pages/ari-resume.jsx` | resume metadata/assets; static `public/resume.pdf` is also present |
| `/ari-folio` | `pages/ari-folio.jsx` | checked-in `public/ari-folio/data.json` and CSS module |
| `/for-ai` | `pages/for-ai.jsx` | local `src/components/ForAI/forAIContent.js` |
| `/ai-with-ari` | `pages/ai-with-ari.jsx` | YouTube Data API, cached static props |
| `/arichuvadi`, `/arichuvadi/[slug]`, `/arichuvadi/about` | `pages/arichuvadi/*` | `arichuvadi` DB rows plus Supabase markdown/media |
| `/arizone`, `/arizone/[slug]`, `/arizone/about` | `pages/arizone/*` | `arizone` DB rows plus Supabase markdown/media |
| `/sitemap.xml`, `/robots.txt` | `pages/sitemap.xml.js`, `robots.txt.js` | generated URL/robots responses |

`next.config.js` redirects `/works`, `/my-books`, `/aris-trials`, `/blog`, and `/thirukkural` to the current route/legacy external destination.

### 4.2 Public API routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/contact` | POST | Validates/rate-limits contact form, stores `contact_messages`, notifies Formspree |
| `/api/testimonials` | GET, POST | Lists approved testimonials; queues a new pending testimonial and Formspree notice |
| `/api/content/comments` | GET, POST, PATCH, DELETE | Generic section/item moderated comments and owner edits |
| `/api/content/reactions` | GET, POST | Generic section/item like counts |
| `/api/projects/comments` | GET, POST, PATCH, DELETE | Project-specific moderated comments, replies, owner edits |
| `/api/clay-play/reactions` | GET, POST | Clay Play likes/comments, including batched client events |
| `/api/book-reviews/reactions` | GET, POST | Book review likes |
| `/api/resume-download` | GET | Proxies the configured resume PDF URL |
| `/api/curriculum-download` | GET | Proxies a configured curriculum URL when present |

### 4.3 Admin API routes

All admin data routes depend on the signed `ariverse_admin` cookie. Writes additionally require the same-origin check and most mutating routes have an in-memory rate limit.

| Route family | Purpose |
|---|---|
| `/api/admin/login`, `/logout` | Password login and cookie clearing |
| `/api/admin/links` | Profile/navigation link list, create, hide/unhide |
| `/api/admin/link-items` | CRUD for section-specific content rows selected by link label |
| `/api/admin/link-hero` | Section hero read/upsert |
| `/api/admin/resume-assets` | Resume text/PDF/page URL metadata |
| `/api/admin/upload-image` | Multipart image upload to Supabase Storage |
| `/api/admin/upload-resume-pdf`, `/upload-resume-images` | Multipart upload to Vercel Blob |
| `/api/admin/images`, `/feature-images` | Shelf image inventory and home feature-image CRUD |
| `/api/admin/testimonials` | Pending testimonial approval/edit/delete |
| `/api/admin/comment-approvals` | Unified project/content comment moderation and replies |
| `/api/admin/arichuvadi*` | Arichuvadi post/category CRUD |
| `/api/admin/arizone*` | AriZone post/category CRUD |
| `/api/admin/ari-xpands*` | Historical XPand admin routes; deleted from the latest filesystem state, with database tables possibly still remaining |

## 5. Data architecture

### 5.1 Database and storage providers

| Provider | Used for | Access pattern |
|---|---|---|
| Neon Postgres | All relational/content/interaction data | `@neondatabase/serverless` through parameterized tagged SQL |
| Supabase Storage | Site images, blog markdown, public media | Public object URLs; server uploads use `SUPABASE_SERVICE_ROLE_KEY` |
| Vercel Blob | Resume PDF and generated resume page images | `@vercel/blob` public objects with `BLOB_READ_WRITE_TOKEN` |
| Local filesystem | Checked-in fallback/static assets; historical Arichuvadi local index support | `public/`, `data/`; `arichuvadi_` fallback directory is referenced but absent in this workspace |
| External services | Formspree email notifications and YouTube API | Server-side `fetch` |

Storage path compatibility is centralized in `lib/storage.js`, but many older aliases remain. It maps old names such as `projects/`, `experiments/`, `books-read/`, `aris-books/`, and legacy Arichuvadi/AriZone paths to canonical Supabase object paths and normalizes image extensions to WebP in several cases.

## 6. Relational schema catalog

The application emits schema from JavaScript. The definitions below are the effective shapes represented by `CREATE TABLE`, later `ALTER TABLE`, and the query/normalization code.

### 6.1 Bootstrap and navigation

| Table | Columns / constraints | Relationships / use |
|---|---|---|
| `ariverse_meta` | `key TEXT PRIMARY KEY`, `value TEXT`, `updated_at TIMESTAMPTZ` | Schema/data-fix version gate. Keys include `db_init_version`, link and asset-fix versions. |
| `profile_links` | `id SERIAL PK`, `label`, `href`, `category`, `sort_order`, `is_hidden INTEGER`, `created_at` | Root navigation/config record. `category` is effectively `PROFESSIONAL`, `PASSIONAL`, or `HOBBYAL`; no DB check constraint or unique key on label/href. |
| `section_heroes` | `id SERIAL PK`, `link_id`, `heading`, `description`, `quote`, `image_url`, timestamps | One hero per profile link via `UNIQUE link_id`; `link_id → profile_links` cascade. `quote` is added later by `ALTER TABLE`. |
| `feature_images` | `id SERIAL PK`, `image_url`, `created_at` | Unique index on `image_url`; home-page feature image pool. |
| `resume_assets` | `link_id PK`, `resume_text`, `pdf_url`, `page_image_urls JSONB`, `updated_at` | One-to-one with Resume `profile_links`; cascade. |
| `skillset_entries` | `id SERIAL PK`, `skillname`, `title`, `description`, `skills_svg_list JSONB`, `sort_order`, `created_at` | Unique index on `skillname`; seeded with defaults if empty. |

### 6.2 Section content tables

All of these use an integer `id`, a `link_id → profile_links(id) ON DELETE CASCADE`, sortable rows, and a `created_at` timestamp unless noted.

| Table | Main fields | Content semantics |
|---|---|---|
| `career_entries` | `image_url`, `company_logo_url`, `subtitle`, `date_text`, `markdown_text`, `entry_title`, `sort_order` | Career history/cards. |
| `projects_entries` | `title`, `project_link`, `logo_url`, `caption`, `detail_text`, `category`, `sort_order` | Project cards and detail pages. |
| `mini_projects_entries` | `title`, `embed_link`, `logo_url`, `caption`, `category`, `sort_order` | Embedded mini-projects. |
| `experiments_entries` | `image_url`, `markdown_text`, `detail_text`, `entry_title`, `read_more_url`, `sort_order` | Experiment/trial cards. |
| `ariyin_kavithaigal` | `image_url`, `markdown_text`, `kavithai_name`, `sort_order` | Legacy poems table; also used by legacy migration/read fallback. |
| `binomial_names` | `youtube_url`, `markdown_text`, `entry_name`, `sort_order` | Biology/binomial name entries. |
| `clay_play_entries` | `image_url`, `image_urls TEXT`, `markdown_text`, `entry_title`, `image_align`, `sort_order` | `image_urls` is JSON encoded inside TEXT rather than JSONB. |
| `books_read_entries` | `image_url`, `title`, `category`, `subcategory`, `markdown_text`, `sort_order` | Language/category-specific reading list. `author_name` is explicitly dropped by a bootstrap migration. |
| `aris_books_entries` | `cover_url`, `book_url`, `name`, `tag`, `sort_order` | Books authored/owned by Ari. |
| `shelf_entries` | `image_url`, `entry_name`, `subname`, `sort_order` | Shelf/gallery cards. |
| `guest_lectures_entries` | `image_url`, `image_urls TEXT`, `markdown_text`, `entry_title`, `image_align`, `sort_order` | Lecture/gallery entries; gallery URLs are JSON encoded inside TEXT. |
| `book_reviews_entries` | `image_url`, `image_urls TEXT`, `youtube_url`, `category`, `markdown_text`, `entry_title`, `image_align`, `sort_order` | Book reviews with YouTube/Instagram link and Tamil/English category. |

The table chosen for a link item is derived by `tableByLabel()` in `lib/adminData.js`; this makes labels part of the data model. Renaming a label can change which table an admin endpoint reads/writes unless normalization/legacy aliases catch it.

`link_items` is not created by the current bootstrap, but `adminData.js` probes for it during legacy migration and copies matching rows into `ariyin_kavithaigal` and `binomial_names` when it exists. It is therefore a historical external schema dependency, not a current canonical table.

### 6.3 Project tags

| Table | Shape |
|---|---|
| `project_tags` | `id SERIAL PK`, `name TEXT UNIQUE`, `created_at` |
| `project_entry_tags` | `project_entry_id → projects_entries`, `tag_id → project_tags`, `created_at`, composite primary key `(project_entry_id, tag_id)` |

### 6.4 Interaction and moderation tables

| Table | Shape / behavior |
|---|---|
| `ariverse_interactions` | Generic legacy polymorphic table: `scope_key`, `subgroup_key`, `item_key`, `item_type`, `interaction_type`, `actor_name`, `content_text`, self-referencing `parent_interaction_id`, `metadata_json TEXT`, `is_deleted INTEGER`, `created_at`. Current specialized APIs mostly use the tables below instead. |
| `clay_play_entry_likes` | `entry_id → clay_play_entries`, `person_name`, `created_at`; no uniqueness, so each request adds rows. |
| `clay_play_entry_comments` | `entry_id → clay_play_entries`, `person_name`, `comment_text`, `created_at`; direct/public path, no status field. |
| `book_reviews_entry_likes` | `entry_id → book_reviews_entries`, `person_name`, `created_at`; no uniqueness. |
| `project_comments` | `project_entry_id → projects_entries`, self-FK `parent_comment_id`, `person_name`, `comment_text`, `status`, `avatar_url`, `commenter_token`, `created_at`; `status` is normally `pending` or `green`. |
| `project_comment_likes` | `project_comment_id → project_comments`, `person_name`, `created_at`; currently schema-supported but no obvious public API in the current route inventory. |
| `content_comments` | Polymorphic `section_key TEXT + entry_id INTEGER`, self-FK `parent_comment_id`, name/text/status/avatar/token/timestamp. No FK can validate `entry_id` because it points to multiple section tables. |
| `content_entry_likes` | Polymorphic `section_key + entry_id`, `person_name`, `created_at`; no FK or uniqueness. |
| `testimonials` | `person_name`, `relation_text`, `testimonial_text`, `status`, `created_at`; public reads filter to `green`; admin sees pending. |
| `contact_messages` | `name`, `email`, `subject`, `message`, `source_ip`, `created_at`; no status/processed flag or retention policy. |

### 6.5 Blog schemas

`arichuvadi` and `arizone` intentionally use the same content shape:

```text
id BIGSERIAL PK
kind TEXT CHECK (kind IN ('post', 'category'))
slug TEXT
title, label, category_label, category_slug TEXT
summary, content_markdown TEXT
storage_folder, content_path, cover_image_path, logo_path TEXT
image_paths JSONB
published_at TIMESTAMPTZ
is_published BOOLEAN
created_at, updated_at TIMESTAMPTZ
UNIQUE(kind, slug)
```

The actual tables are separate (`arichuvadi` and `arizone`). `title_english` and `translation_readme` are added later by `ALTER TABLE` in both admin/read implementations. Posts do not have a relational foreign key to a category; `category_slug` is a free-text reference. Media and markdown paths are also free text. Arichuvadi uses a Postgres advisory lock during schema setup and includes a legacy `ariyin_kavithaigal` migration; AriZone does not use the same lock.

## 7. Historical ARI XPands subsystem

The pre-existing `HEAD` contained a complete XPand subsystem, but it has been deleted in the current worktree except for `pages/api/admin/ari-xpands/[id].js` and CSS remnants. The historical schema was:

| Table | Purpose |
|---|---|
| `ari_xpands` | Journey root: title/slug/subtitle/description/status/visibility/cover/curriculum/start/end/tags/timestamps/archive time. |
| `ari_xpand_logs` | One daily log per XPand (`UNIQUE (xpand_id, log_date)`), JSON arrays for done/learned/failed/questions/blockers/next, note markdown, time spent, visibility. |
| `ari_xpand_notes` | Notes/questions/ideas/insights with kind/status, visibility, and optional linked entity. |
| `ari_xpand_milestones` | Ordered milestones with status, target/completion dates, visibility. |
| `ari_xpand_evidence` | Evidence records with type, URL, date, JSON metadata, visibility. |
| `ari_xpand_resources` | Reading/resource queue with type, URL, author, notes, status, visibility. |
| `ari_xpand_experiments` | Structured experiment journal: code, question, hypothesis, method, baseline, dataset, config, hardware, metrics, result, failure analysis, interpretation, next experiment, status, dates, visibility. |
| `ari_xpand_sections` | Hierarchical plan sections with self-FK `parent_section_id`, ordering, status/date range, JSON metadata. |

Historical workflow: admin creates a root XPand; admin edits children through `/api/admin/ari-xpand-entities`; daily `/done`, `/learned`, `/failed`, `/question`, `/idea`, `/insight`, `/blocker`, `/next`, `/read`, `/evidence`, `/time`, `/note` quick-log commands update the daily log and may create notes/resources/evidence; public pages aggregate child rows into stats and a timeline. All child tables cascade from the root. The current deletion removes the code path but does not prove that these tables were dropped from Neon.

## 8. End-to-end workflows

### 8.1 Initial request / database bootstrap

1. Next invokes a page loader or API handler.
2. The loader calls a library function.
3. The library lazily creates tables and indexes using `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
4. `adminData.js` checks `ariverse_meta` versions and may run data rewrite migrations/seeds.
5. If Neon is unreachable, selected admin-data reads mark the DB unavailable for a backoff period and return empty/fallback content. This can produce a valid HTTP page with missing content rather than a hard failure.
6. The result is normalized and either rendered into static props/SSR HTML or returned as JSON.

### 8.2 Admin login and edit

1. `/admin` is SSR and checks `isAdminRequest(req)`.
2. The browser posts the password to `/api/admin/login`.
3. The server compares the password with `ADMIN_PASSWORD` using a timing-safe comparison.
4. It signs a base64url JSON payload containing only an expiration time using HMAC-SHA256 and sets `ariverse_admin` as an HttpOnly, Secure, SameSite=Lax cookie with an eight-hour TTL.
5. Admin UI calls the relevant API route. The route verifies the cookie, checks request origin, rate-limits, validates fields, and calls a library write function.
6. The UI refreshes local state or navigates to the edited content.

### 8.3 Content authoring with media

1. Admin chooses a section, title, category/subcategory, and file.
2. `/api/admin/upload-image` parses multipart data with Formidable, permits JPEG/PNG/WebP/GIF, caps one file at 8 MiB, derives a canonical section path, and uploads to Supabase Storage using the service-role key.
3. The returned public URL is saved into the relevant DB row through `/api/admin/link-items`, blog admin, hero admin, or feature-image admin.
4. Resume PDF/pages use Vercel Blob instead; `resume_assets` stores the URLs after the separate metadata update.

### 8.4 Public comment/reaction

1. A public page server-loads existing approved comments/reaction counts.
2. The browser posts a section/item or project/item action.
3. The API checks same-origin and a process-local IP bucket.
4. A comment is stored as pending with a client-provided commenter token; an email notification is attempted through Formspree without making notification failure block the response.
5. Admin retrieves pending rows via `/api/admin/comment-approvals`, marks them `green`, edits, replies, or deletes.
6. Public GETs expose green comments; the original commenter may see/edit/delete their own pending comment if they present the same token.

### 8.5 Blog publishing

1. Admin creates a category/post through the blog API.
2. The write model creates a row in `arichuvadi` or `arizone` and stores path metadata for markdown/images.
3. Image upload writes to the matching Supabase prefix.
4. Public blog loaders select published rows, resolve category maps, load markdown from `content_path` when needed, convert Markdown with `marked`, rewrite relative media attributes into public storage URLs, and render the blog component.
5. Blog category association is by `category_slug`, not FK; deleting/renaming a category can leave dangling post references.

## 9. Security and trust boundaries

### Existing controls

- Admin password is never stored in the database; the cookie is HttpOnly and HMAC-signed.
- Admin writes and public writes generally use `enforceSameOriginWrite`.
- Most write endpoints rate-limit by client IP.
- URL validation exists for profile links, YouTube links, and some public hrefs.
- SQL is issued through Neon tagged-template parameters rather than string-concatenated query values.
- Upload endpoints restrict MIME types and size, and admin-check before upload.

### Important weaknesses

- `.env` in the workspace contains database credentials, an admin password, an admin session secret, and a Supabase service-role key. Treat all as compromised if this file has ever been committed, logged, copied, or shared; rotate them and use a secret manager. Do not reproduce their values in documentation.
- The rate limiter is a process-local `Map`; it resets on restart, is not shared across serverless instances, and trusts the first `x-forwarded-for` value. It is not a reliable abuse-control boundary at scale.
- Like APIs accept a positive `count` and expand it with `generate_series`; there is no tight server-side maximum in the generic/content/book-review paths. A caller can amplify writes and database work.
- Likes have no uniqueness/idempotency key, so retries, double-clicks, and malicious requests all create more rows.
- Polymorphic comments/reactions accept arbitrary `section_key`/`entry_id` pairs without a DB FK. The application validates shape, not that the target exists or belongs to the named section.
- Owner comment editing/deletion relies on a client-supplied `commenterToken`; it is an application capability token, not an authenticated identity and not visibly bound to a browser cookie/session.
- Blog Markdown is converted to HTML and includes custom HTML/media rewriting. The document does not establish a robust sanitizer policy; review this before allowing untrusted authors.
- Supabase service-role and Blob tokens are server secrets, but their public object URLs are stored and served directly; there is no private-media authorization layer.
- `secure: true` is hard-coded on the admin cookie. Plain HTTP local development will not persist the cookie in normal browsers; local HTTPS or an environment-aware cookie policy is required.

## 10. Schema and system-design issues

### High priority

1. **XPand removal must be completed as one coherent change.** During the audit, the route was briefly left behind after its library was deleted, causing a module-resolution failure. The latest filesystem state removes that route too, but the database tables/CSS/history need an explicit retention or cleanup decision.
2. **Secrets are present in `.env`.** Rotate the Neon password/connection string, Supabase service-role key, admin secret/password, and YouTube key if this workspace is not strictly private.
3. **Schema migration is coupled to web traffic.** DDL, data fixes, and seed loops run from application requests. This creates cold-start latency, race conditions between instances, and difficult rollback/observability. There is no explicit migration history table with checksums or transactional migration runner; `ariverse_meta` is a hand-rolled version gate.

### Medium priority

4. **`profile_links` is an implicit registry.** Table selection depends on display labels, while routes and storage paths use a different set of names and aliases. A label edit can alter behavior.
5. **Duplicate schema definitions drift.** `project_comments` is created once during main bootstrap and again in `ensureProjectCommentsTables`; the later function adds missing columns. This works as an incremental repair, but the canonical schema is not in one place.
6. **Weak relational integrity.** Blog categories, generic content reactions/comments, and many media paths are free-text/polymorphic. Referential integrity and cleanup cannot be delegated to Postgres.
7. **Inconsistent types.** Image galleries use JSON encoded as `TEXT`, metadata is sometimes `TEXT` and sometimes `JSONB`, booleans are sometimes `INTEGER`, and the same content concept has different field names across tables (`entry_title`, `title`, `entry_name`).
8. **Engagement is fragmented.** `ariverse_interactions`, specialized like/comment tables, and moderated comment tables overlap. This makes reporting, deduplication, retention, and moderation semantics inconsistent.
9. **Media source-of-truth is split.** The same logical asset may exist in `public/`, a Supabase path alias, a Vercel Blob URL, a DB URL, or a hard-coded constant. Renames require path aliases and one-off scripts.
10. **Public caching can stale edits.** ISR is set to 60 seconds and there is no tag/path revalidation after admin writes. A successful admin mutation may not be visible immediately.

### Lower priority / maintainability

11. Many API handlers catch all errors and return `Unexpected server error`, with no structured request ID or durable error event.
12. There is no shared schema validator (Zod/JSON Schema/etc.); each endpoint manually truncates and normalizes fields.
13. Admin authorization is a single shared password with no user identity, role model, audit log, or session revocation list.
14. Several legacy aliases, migrations, unused schema tables, and stale XPand CSS/files increase the number of possible states the system can occupy.
15. Contact messages lack delivery/processing state, spam classification, retention, or admin UI in the documented route surface.

## 11. Recommended target architecture

### Immediate stabilization

1. Decide whether XPand is being removed or restored. If removed, delete the orphan route and stale CSS, remove any remaining database rows only after a data-retention decision, and restore a working build. If retained, restore the deleted library/routes/tests as one atomic change.
2. Rotate all exposed secrets and remove `.env` from version control/backup artifacts. Add `.env.example` with names only.
3. Run schema creation as a controlled deploy/pre-deploy migration, not during page requests. Record migration version, checksum, duration, and failure state.
4. Add a CI gate for `npm run build`, a real test script, and an import/reference check for deleted modules.

### Data model consolidation

1. Introduce a typed section registry with stable keys (`projects`, `career`, `books_read`, etc.) and store `profile_links.section_key`; keep label/href as presentation fields.
2. Normalize repeated entry fields into a deliberate content model or define a documented per-section schema. Use JSONB only where the shape is intentionally extensible.
3. Replace polymorphic likes/comments with either per-domain FKs or a well-defined aggregate table with a target registry and database constraints.
4. Add uniqueness/idempotency for likes and a bounded server-side increment for counters.
5. Make blog categories relational or enforce category existence in a transaction; add deletion/reassignment behavior.
6. Add an asset table with provider, canonical key, public URL, content type, byte size, owner, and lifecycle status.

### Operational/security hardening

1. Move rate limiting to a shared store or edge/WAF policy and do not trust arbitrary forwarded IP headers without a trusted proxy configuration.
2. Use environment-aware cookie settings only for local development, keep production Secure/HttpOnly/SameSite, and consider a server-side session store for revocation.
3. Add structured logs, request IDs, metrics for DB bootstrap/cache fallback/upload failures, and an admin audit trail.
4. Sanitize Markdown/HTML with an allowlist, validate all outbound URLs, and consider signed/private media for non-public assets.
5. Add explicit cache revalidation after writes or make dynamic/public reads coherent with the selected publishing model.

## 12. Useful source map

| Concern | Primary source |
|---|---|
| Package/runtime/version | `package.json`, `next.config.js` |
| Global app shell | `pages/_app.jsx`, `pages/_document.js` |
| Main DB bootstrap/schema | `lib/adminData.js` |
| Content normalization/table dispatch | `lib/adminData.js` (`tableByLabel`, list/add/update functions) |
| Blog read path | `lib/arichuvadiData.js`, `lib/arizoneData.js` |
| Blog write path/schema | `lib/arichuvadiAdmin.js`, `lib/arizoneAdmin.js` |
| Storage aliases/public URL conversion | `lib/storage.js` |
| Admin cookie | `lib/adminAuth.js` |
| CSRF-ish origin/rate limiting/URL checks | `lib/security.js` |
| Request field normalization | `lib/requestUtils.js` |
| Media uploads | `pages/api/admin/upload-image.js`, `upload-resume-pdf.js`, `upload-resume-images.js` |
| External notifications | `lib/formspree.js` |
| YouTube integration | `lib/youtube.js`, `pages/ai-with-ari.jsx` |
| One-off data migrations | `scripts/` |
| Historical XPand implementation | `HEAD:lib/ariXpands.js`, `HEAD:lib/ariXpandsCore.mjs` and related deleted routes |

## 13. Verification performed

- Repository and source inventory completed, including pages, API routes, libraries, scripts, assets, schemas, and current Git worktree state.
- `npm run build` was executed twice while the working tree was changing. The first run failed at `pages/api/admin/ari-xpands/[id].js:2` because `../../../../lib/ariXpands` had already been deleted. The latest run compiled successfully, then failed during page-data collection for `/arizone/[slug]` because the configured Neon fetch failed with a sandbox `EACCES` network error.
- `npm test` was also executed; it fails immediately because the current `package.json` has no `test` script, while the former XPand test file is deleted.
- I did not intentionally restore, delete, or rewrite source files; existing dirty changes were preserved. This document is the intended audit addition.
