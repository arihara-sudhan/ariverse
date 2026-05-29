import { neon, neonConfig } from '@neondatabase/serverless';
import { Agent, fetch as undiciFetch } from 'undici';
import { miniProjects as fallbackMiniProjects } from '../data/miniProjects';

const LINK_CATEGORIES = ['PROFESSIONAL', 'PASSIONAL', 'HOBBYAL'];
const BOOK_LANGUAGE_CATEGORIES = ['ENGLISH', 'TAMIL'];
const BOOK_SUBCATEGORY_BY_LANGUAGE = {
  ENGLISH: ['FICTION', 'NON_FICTION'],
  TAMIL: ['புனைவு', 'புனைவிலி'],
};

function normalizeCategory(value) {
  const category = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return LINK_CATEGORIES.includes(category) ? category : 'PASSIONAL';
}

function normalizeBookCategory(value) {
  const category = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return BOOK_LANGUAGE_CATEGORIES.includes(category) ? category : 'ENGLISH';
}

function normalizeBookSubcategory(category, value) {
  const normalizedCategory = normalizeBookCategory(category);
  const allowed = BOOK_SUBCATEGORY_BY_LANGUAGE[normalizedCategory];
  const input = typeof value === 'string' ? value.trim() : '';
  if (allowed.includes(input)) return input;
  return allowed[0];
}

function normalizeImageUrls(value) {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    return text ? [text] : [];
  }
  return [];
}

function extractImageUrlsFromText(text) {
  const input = typeof text === 'string' ? text.trim() : '';
  if (!input) return [];
  const matches = input.match(/https?:\/\/.*?(?=https?:\/\/|$)/g) || [];
  return matches.map((url) => url.trim().replace(/[,\]\)"'\s]+$/g, '')).filter(Boolean);
}

function parseImageUrls(raw, fallbackImageUrl = '') {
  try {
    const parsed = JSON.parse(raw || '[]');
    const normalized = normalizeImageUrls(parsed);
    if (normalized.length > 0) return normalized;
  } catch (_error) {
    // Ignore malformed JSON and fall back to single image URL.
  }
  const recoveredFromRaw = extractImageUrlsFromText(raw);
  if (recoveredFromRaw.length > 0) return recoveredFromRaw;
  const fallback = typeof fallbackImageUrl === 'string' ? fallbackImageUrl.trim() : '';
  if (!fallback) return [];
  const recoveredFromFallback = extractImageUrlsFromText(fallback);
  if (recoveredFromFallback.length > 0) return recoveredFromFallback;
  return [fallback];
}

const defaultLinks = [
  { label: 'For AI', href: '/for-ai', category: 'PASSIONAL' },
  { label: 'Career', href: '/ari_career', category: 'PROFESSIONAL' },
  { label: 'Experiments', href: '/aris-trials', category: 'PASSIONAL' },
  { label: 'Mini-Projects', href: '/mini-projects', category: 'PROFESSIONAL' },
  { label: 'Projects', href: '/projects', category: 'PROFESSIONAL' },
  { label: 'Skillset', href: '/skillset', category: 'PROFESSIONAL' },
  { label: 'Binomial Names', href: '/binomial-names', category: 'HOBBYAL' },
  { label: 'AriZone (Blog)', href: 'https://arihara-sudhan.github.io/blog/', category: 'HOBBYAL' },
  { label: 'My Books', href: '/aris-books', category: 'PASSIONAL' },
  { label: 'Resume', href: 'https://arihara-sudhan.github.io/resume/', category: 'PROFESSIONAL' },
  { label: 'AI with ARI (YouTube)', href: '/ai-with-ari', category: 'PASSIONAL' },
  { label: 'Guest Lectures', href: '/guest-lectures', category: 'PASSIONAL' },
  { label: 'Clay Play', href: '/clay-play', category: 'HOBBYAL' },
  { label: 'அரியின் கவிதைகள்', href: '/ariyin-kavithaigal', category: 'HOBBYAL' },
  { label: 'Thirukkural', href: '/thirukkural', category: 'PASSIONAL' },
  { label: 'Book Reviews', href: '/book-reviews', category: 'HOBBYAL' },
  { label: 'Books Read', href: '#', category: 'HOBBYAL' },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

async function ensureMiniProjectsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS mini_projects_entries (
      id SERIAL PRIMARY KEY,
      link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      embed_link TEXT NOT NULL DEFAULT '',
      logo_url TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
}

async function ensureProjectsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS projects_entries (
      id SERIAL PRIMARY KEY,
      link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      project_link TEXT NOT NULL DEFAULT '',
      logo_url TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
}

const DB_INIT_VERSION = '2026-05-23-career-timeline-v1';
const LINK_FIX_VERSION = '2026-05-23-career-link-fixes-v4';
const PROFILE_LINKS_CACHE_TTL_MS = 60 * 1000;
const DB_RETRY_AFTER_MS = 30 * 1000;
const DB_INIT_BACKOFF_MS = 1500;
const DB_INIT_TIMEOUT_ERROR_CODE = 'DB_INIT_TIMEOUT';
const DB_CONNECT_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
})();
const DB_FETCH_RETRY_COUNT = (() => {
  const parsed = Number.parseInt(process.env.DB_FETCH_RETRY_COUNT || '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2;
})();
const DB_FETCH_RETRY_BASE_DELAY_MS = (() => {
  const parsed = Number.parseInt(process.env.DB_FETCH_RETRY_BASE_DELAY_MS || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 250;
})();
const DB_INIT_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(process.env.DB_INIT_TIMEOUT_MS || '', 10);
  const requestedTimeout = Number.isFinite(parsed) && parsed > 0 ? parsed : 12000;
  return process.env.NODE_ENV === 'production' ? requestedTimeout : Math.max(requestedTimeout, 8000);
})();
const neonFetchAgent = new Agent({
  connect: {
    timeout: DB_CONNECT_TIMEOUT_MS,
  },
});
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDbFetchError(error) {
  const connectTimeout = error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || error?.code === 'UND_ERR_CONNECT_TIMEOUT';
  if (connectTimeout) return true;
  const message = `${error?.message || ''}`.toLowerCase();
  return message.includes('fetch failed') || message.includes('connect timeout');
}

neonConfig.fetchFunction = async (input, init = {}) => {
  const request = { ...init, dispatcher: init.dispatcher || neonFetchAgent };
  let attempt = 0;
  while (true) {
    try {
      return await undiciFetch(input, request);
    } catch (error) {
      if (attempt >= DB_FETCH_RETRY_COUNT || !isRetryableDbFetchError(error)) {
        throw error;
      }
      const delayMs = DB_FETCH_RETRY_BASE_DELAY_MS * 2 ** attempt;
      attempt += 1;
      await sleep(delayMs);
    }
  }
};
const sql = neon(connectionString);
let initPromise;
let profileLinksCache = {
  all: null,
  visible: null,
  allExpiresAt: 0,
  visibleExpiresAt: 0,
};
let dbUnavailable = false;
let dbErrorLogged = false;
let dbRetryAfter = 0;

function invalidateProfileLinksCache() {
  profileLinksCache = { all: null, visible: null, allExpiresAt: 0, visibleExpiresAt: 0 };
}

function waitWithTimeout(promise, timeoutMs, message) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const timeoutError = new Error(message);
      timeoutError.code = DB_INIT_TIMEOUT_ERROR_CODE;
      reject(timeoutError);
    }, timeoutMs);
    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function markDbUnavailable(error) {
  dbUnavailable = true;
  dbRetryAfter = Date.now() + DB_RETRY_AFTER_MS;
  initPromise = null;
  if (!dbErrorLogged) {
    console.error('Database unavailable, serving fallback content:', error);
    dbErrorLogged = true;
  }
}

function markDbInitializing(error) {
  dbUnavailable = true;
  dbRetryAfter = Date.now() + DB_INIT_BACKOFF_MS;
  if (!dbErrorLogged) {
    console.warn('Database initialization still running, serving fallback content:', error);
    dbErrorLogged = true;
  }
}

async function ensureInitialized() {
  if (dbUnavailable) {
    if (Date.now() < dbRetryAfter) return;
    dbUnavailable = false;
    dbErrorLogged = false;
  }
  if (!initPromise) {
    initPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS ariverse_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;

      const initState = await sql`
        SELECT value
        FROM ariverse_meta
        WHERE key = 'db_init_version'
        LIMIT 1
      `;
      const linkFixState = await sql`
        SELECT value
        FROM ariverse_meta
        WHERE key = 'link_fix_version'
        LIMIT 1
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS profile_links (
          id SERIAL PRIMARY KEY,
          label TEXT NOT NULL,
          href TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'PASSIONAL',
          sort_order INTEGER NOT NULL,
          is_hidden INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;

      await sql`ALTER TABLE profile_links ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'PASSIONAL'`;
      await sql`
        CREATE TABLE IF NOT EXISTS career_entries (
          id SERIAL PRIMARY KEY,
          link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL DEFAULT '',
          company_logo_url TEXT NOT NULL DEFAULT '',
          subtitle TEXT NOT NULL DEFAULT '',
          markdown_text TEXT NOT NULL DEFAULT '',
          entry_title TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`ALTER TABLE career_entries ADD COLUMN IF NOT EXISTS company_logo_url TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE career_entries ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT ''`;
      if (linkFixState[0]?.value !== LINK_FIX_VERSION) {
        await sql`DELETE FROM profile_links WHERE label = 'Experience' AND href = 'https://arihara-sudhan.github.io/resume/#experience'`;
        await sql`UPDATE profile_links SET category = 'PROFESSIONAL' WHERE label = 'Mini-Projects'`;
        await sql`UPDATE profile_links SET label = 'Career' WHERE label IN ('Works', 'Experience')`;
        await sql`UPDATE profile_links SET href = '/ari_career' WHERE label = 'Career'`;
        await sql`
          DELETE FROM profile_links
          WHERE label = 'Career'
            AND id NOT IN (
              SELECT id FROM profile_links WHERE label = 'Career' ORDER BY id ASC LIMIT 1
            )
        `;
        await sql`UPDATE profile_links SET sort_order = 1, category = 'PROFESSIONAL' WHERE label = 'Career'`;
        await sql`UPDATE profile_links SET href = '/skillset' WHERE label = 'Skillset'`;
        await sql`UPDATE profile_links SET label = 'அரியின் கவிதைகள்' WHERE label IN ('Ariyin Kavithaigal', 'Kavithaigal')`;
        await sql`
          INSERT INTO ariverse_meta (key, value, updated_at)
          VALUES ('link_fix_version', ${LINK_FIX_VERSION}, now())
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `;
        invalidateProfileLinksCache();
      }

      await ensureMiniProjectsTable();
      await ensureProjectsTable();

      if (initState[0]?.value === DB_INIT_VERSION) {
        return;
      }

      await sql`
        CREATE TABLE IF NOT EXISTS ariyin_kavithaigal (
          id SERIAL PRIMARY KEY,
          link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL DEFAULT '',
          markdown_text TEXT NOT NULL DEFAULT '',
          kavithai_name TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS binomial_names (
          id SERIAL PRIMARY KEY,
          link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
          youtube_url TEXT NOT NULL DEFAULT '',
          markdown_text TEXT NOT NULL DEFAULT '',
          entry_name TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS clay_play_entries (
          id SERIAL PRIMARY KEY,
          link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL DEFAULT '',
          image_urls TEXT NOT NULL DEFAULT '[]',
          markdown_text TEXT NOT NULL DEFAULT '',
          entry_title TEXT NOT NULL DEFAULT '',
          image_align TEXT NOT NULL DEFAULT 'left',
          sort_order INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS books_read_entries (
          id SERIAL PRIMARY KEY,
          link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL DEFAULT '',
          title TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'ENGLISH',
          subcategory TEXT NOT NULL DEFAULT 'FICTION',
          markdown_text TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS aris_books_entries (
          id SERIAL PRIMARY KEY,
          link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
          cover_url TEXT NOT NULL DEFAULT '',
          book_url TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL DEFAULT '',
          tag TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS guest_lectures_entries (
          id SERIAL PRIMARY KEY,
          link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL DEFAULT '',
          image_urls TEXT NOT NULL DEFAULT '[]',
          markdown_text TEXT NOT NULL DEFAULT '',
          entry_title TEXT NOT NULL DEFAULT '',
          image_align TEXT NOT NULL DEFAULT 'left',
          sort_order INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS career_entries (
          id SERIAL PRIMARY KEY,
          link_id INTEGER NOT NULL REFERENCES profile_links(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL DEFAULT '',
          company_logo_url TEXT NOT NULL DEFAULT '',
          subtitle TEXT NOT NULL DEFAULT '',
          markdown_text TEXT NOT NULL DEFAULT '',
          entry_title TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`ALTER TABLE career_entries ADD COLUMN IF NOT EXISTS company_logo_url TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE career_entries ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT ''`;
      await sql`
        CREATE TABLE IF NOT EXISTS ariverse_interactions (
          id BIGSERIAL PRIMARY KEY,
          scope_key TEXT NOT NULL,
          subgroup_key TEXT NOT NULL DEFAULT 'default',
          item_key TEXT NOT NULL,
          item_type TEXT NOT NULL DEFAULT 'post',
          interaction_type TEXT NOT NULL,
          actor_name TEXT NOT NULL DEFAULT '',
          content_text TEXT NOT NULL DEFAULT '',
          parent_interaction_id BIGINT REFERENCES ariverse_interactions(id) ON DELETE CASCADE,
          metadata_json TEXT NOT NULL DEFAULT '{}',
          is_deleted INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_ariverse_interactions_scope_item
          ON ariverse_interactions(scope_key, subgroup_key, item_key, created_at DESC);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_ariverse_interactions_parent
          ON ariverse_interactions(parent_interaction_id, created_at ASC);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_ariverse_interactions_type
          ON ariverse_interactions(interaction_type, created_at DESC);
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS clay_play_entry_likes (
          id SERIAL PRIMARY KEY,
          entry_id INTEGER NOT NULL REFERENCES clay_play_entries(id) ON DELETE CASCADE,
          person_name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS clay_play_entry_comments (
          id SERIAL PRIMARY KEY,
          entry_id INTEGER NOT NULL REFERENCES clay_play_entries(id) ON DELETE CASCADE,
          person_name TEXT NOT NULL,
          comment_text TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_clay_play_entry_likes_entry_id
          ON clay_play_entry_likes(entry_id);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_clay_play_entry_comments_entry_id
          ON clay_play_entry_comments(entry_id);
      `;
      await sql`ALTER TABLE books_read_entries DROP COLUMN IF EXISTS author_name`;
      await sql`ALTER TABLE books_read_entries ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'ENGLISH'`;
      await sql`ALTER TABLE books_read_entries ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT 'FICTION'`;
      await sql`
        UPDATE books_read_entries
        SET category = CASE
          WHEN UPPER(TRIM(COALESCE(category, ''))) = 'TAMIL' THEN 'TAMIL'
          ELSE 'ENGLISH'
        END
      `;
      await sql`
        UPDATE books_read_entries
        SET subcategory = CASE
          WHEN category = 'TAMIL' AND subcategory NOT IN ('புனைவு', 'புனைவிலி') THEN 'புனைவு'
          WHEN category = 'ENGLISH' AND subcategory NOT IN ('FICTION', 'NON_FICTION') THEN 'FICTION'
          ELSE subcategory
        END
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS section_heroes (
          id SERIAL PRIMARY KEY,
          link_id INTEGER NOT NULL UNIQUE REFERENCES profile_links(id) ON DELETE CASCADE,
          heading TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          image_url TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`ALTER TABLE section_heroes ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE section_heroes ADD COLUMN IF NOT EXISTS quote TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE clay_play_entries ADD COLUMN IF NOT EXISTS image_urls TEXT NOT NULL DEFAULT '[]'`;
      await sql`ALTER TABLE guest_lectures_entries ADD COLUMN IF NOT EXISTS image_urls TEXT NOT NULL DEFAULT '[]'`;
      await sql`
        UPDATE clay_play_entries
        SET image_urls = CASE
          WHEN TRIM(COALESCE(image_urls, '')) = '' OR image_urls = '[]'
            THEN CASE WHEN TRIM(COALESCE(image_url, '')) <> '' THEN to_jsonb(ARRAY[image_url])::text ELSE '[]' END
          ELSE image_urls
        END
      `;

      const row = await sql`SELECT COUNT(*)::int AS count FROM profile_links`;
      if (!row[0] || row[0].count === 0) {
        for (let idx = 0; idx < defaultLinks.length; idx += 1) {
          const link = defaultLinks[idx];
          await sql`
            INSERT INTO profile_links (label, href, category, sort_order, is_hidden)
            VALUES (${link.label}, ${link.href}, ${link.category}, ${idx + 1}, 0)
          `;
        }
      }

      await sql`
        UPDATE profile_links
        SET label = 'Experiments'
        WHERE label = 'Xperiements'
      `;

      await sql`
        UPDATE profile_links
        SET label = 'அரியின் கவிதைகள்', href = '/ariyin-kavithaigal'
        WHERE label IN ('Kavithaigal', 'Ariyin Kavithaigal')
      `;

      await sql`
        UPDATE profile_links
        SET href = '/clay-play'
        WHERE label = 'Clay Play'
      `;
      await sql`
        UPDATE guest_lectures_entries
        SET image_urls = CASE
          WHEN TRIM(COALESCE(image_urls, '')) = '' OR image_urls = '[]'
            THEN CASE WHEN TRIM(COALESCE(image_url, '')) <> '' THEN to_jsonb(ARRAY[image_url])::text ELSE '[]' END
          ELSE image_urls
        END
      `;
      await sql`
        UPDATE profile_links
        SET href = '/ari-read-books'
        WHERE label = 'Books Read'
      `;
      await sql`
        UPDATE profile_links
        SET label = 'My Books'
        WHERE label = 'Books Written'
      `;
      await sql`DELETE FROM profile_links WHERE label = 'Learnings'`;
      await sql`UPDATE profile_links SET label = 'Career' WHERE label IN ('Works', 'Experience')`;
      await sql`UPDATE profile_links SET href = '/ari_career' WHERE label = 'Career'`;
      await sql`
        DELETE FROM profile_links
        WHERE label = 'Career'
          AND id NOT IN (
            SELECT id FROM profile_links WHERE label = 'Career' ORDER BY id ASC LIMIT 1
          )
      `;
      await sql`UPDATE profile_links SET sort_order = 1, category = 'PROFESSIONAL' WHERE label = 'Career'`;
      await sql`UPDATE profile_links SET href = '/projects' WHERE label = 'Projects'`;
      await sql`UPDATE profile_links SET href = '/skillset' WHERE label = 'Skillset'`;
      await sql`DELETE FROM profile_links WHERE label = 'Experience' AND href = 'https://arihara-sudhan.github.io/resume/#experience'`;
      await sql`UPDATE profile_links SET href = '/aris-trials' WHERE label = 'Experiments'`;
      await sql`UPDATE profile_links SET href = '/mini-projects' WHERE label = 'Mini-Projects'`;
      await sql`UPDATE profile_links SET href = '/guest-lectures' WHERE label = 'Guest Lectures'`;
      await sql`UPDATE profile_links SET href = '/thirukkural' WHERE label = 'Thirukkural'`;
      await sql`UPDATE profile_links SET href = '/book-reviews' WHERE label = 'Book Reviews'`;
      await sql`UPDATE profile_links SET href = '/aris-books' WHERE label = 'My Books'`;

      await sql`
        UPDATE profile_links
        SET category = 'PROFESSIONAL'
        WHERE label IN ('Career', 'Projects', 'Skillset', 'Resume', 'Mini-Projects')
      `;

      const existingSkillset = await sql`SELECT id FROM profile_links WHERE label = 'Skillset' LIMIT 1`;
      if (!existingSkillset[0]) {
        const maxSkillset = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM profile_links`;
        await sql`
          INSERT INTO profile_links (label, href, category, sort_order, is_hidden)
          VALUES ('Skillset', '/skillset', 'PROFESSIONAL', ${maxSkillset[0].max_order + 1}, 0)
        `;
      }

      await sql`
        UPDATE profile_links
        SET category = 'PASSIONAL'
        WHERE label IN ('Experiments', 'My Books', 'Thirukkural', 'For AI', 'Guest Lectures', 'AI with ARI (YouTube)')
      `;

      const existingMiniProjects = await sql`SELECT id FROM profile_links WHERE label = 'Mini-Projects' LIMIT 1`;
      if (!existingMiniProjects[0]) {
        const maxMiniProjects = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM profile_links`;
        await sql`
          INSERT INTO profile_links (label, href, category, sort_order, is_hidden)
          VALUES ('Mini-Projects', '/mini-projects', 'PROFESSIONAL', ${(maxMiniProjects[0]?.max_order || 0) + 1}, 0)
        `;
      }

      await sql`
        UPDATE profile_links
        SET category = 'HOBBYAL'
        WHERE label IN ('Clay Play', 'அரியின் கவிதைகள்', 'Books Read', 'Book Reviews', 'Binomial Names', 'AriZone (Blog)')
      `;

      const legacyLinkItems = await sql`SELECT to_regclass('public.link_items')::text AS name`;
      if (legacyLinkItems[0]?.name) {
        await sql`
          INSERT INTO ariyin_kavithaigal (link_id, image_url, markdown_text, kavithai_name, sort_order, created_at)
          SELECT
            li.link_id,
            COALESCE(li.image_url, ''),
            COALESCE(NULLIF(li.markdown_text, ''), li.description, ''),
            COALESCE(li.kavithai_from, ''),
            li.sort_order,
            li.created_at
          FROM link_items li
          JOIN profile_links pl ON pl.id = li.link_id
          WHERE pl.label IN ('அரியின் கவிதைகள்', 'Ariyin Kavithaigal', 'Kavithaigal')
        `;

        await sql`
          INSERT INTO binomial_names (link_id, youtube_url, markdown_text, entry_name, sort_order, created_at)
          SELECT
            li.link_id,
            COALESCE(li.youtube_url, ''),
            COALESCE(NULLIF(li.markdown_text, ''), li.description, ''),
            COALESCE(li.kavithai_from, ''),
            li.sort_order,
            li.created_at
          FROM link_items li
          JOIN profile_links pl ON pl.id = li.link_id
          WHERE pl.label = 'Binomial Names'
        `;

        await sql`DROP TABLE link_items`;
      }

      const hasBinomial = await sql`SELECT id FROM profile_links WHERE label = 'Binomial Names' LIMIT 1`;
      if (!hasBinomial[0]) {
        const maxRow = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM profile_links`;
        await sql`
          INSERT INTO profile_links (label, href, category, sort_order, is_hidden)
          VALUES ('Binomial Names', '/binomial-names', 'HOBBYAL', ${maxRow[0].max_order + 1}, 0)
        `;
      }

      const binomialLink = await sql`SELECT id FROM profile_links WHERE label = 'Binomial Names' LIMIT 1`;
      if (binomialLink[0]) {
        const binomialCount = await sql`
          SELECT COUNT(*)::int AS count FROM binomial_names WHERE link_id = ${binomialLink[0].id}
        `;
        if (!binomialCount[0] || binomialCount[0].count === 0) {
          const text = "It's another facet of mine. While studying Biology, I had some serious dreams.\n\nWhen I joined Engineering, the mind could not let go of terms like Mitosis, Meiosis, Sodium-Potassium Pump, Phagocytes, Bacteriophage, C3 Cycle, Parenchyma, Sclerenchyma, Cilia, Flagella, Restriction Endonuclease, Ribonucleic Acid, Genocytes, and so on.\n\nI longed to hear someone mention any of these, but conversations revolved around Big O Notation, Normalization, Optimization, DFA-NFA, Recursion, OOPS, UI/UX, Java, Python, and C and plus plus.\n\nThis stubborn mind also began to fall in love with these new terms, as they felt like bio-mimicries. When I was into Machine Learning, my interest soared because many concepts were deeply rooted in biology and mathematics.\n\nWhy did I learn so many scientific names? I do not know. Maybe it was for this post.";
          await sql`
            INSERT INTO binomial_names (link_id, youtube_url, markdown_text, entry_name, sort_order)
            VALUES (${binomialLink[0].id}, 'https://youtu.be/CXd4P4M8lPA?si=Y6_lM7WYoztjnruH', ${text}, 'Binomial Names', 1)
          `;
        }
      }
      await sql`
        INSERT INTO ariverse_meta (key, value, updated_at)
        VALUES ('db_init_version', ${DB_INIT_VERSION}, now())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
      dbUnavailable = false;
      dbErrorLogged = false;
      dbRetryAfter = 0;
    })().catch((error) => {
      initPromise = null;
      markDbUnavailable(error);
    });
  }

  try {
    await waitWithTimeout(
      initPromise,
      DB_INIT_TIMEOUT_MS,
      `Database initialization timed out after ${DB_INIT_TIMEOUT_MS}ms`
    );
  } catch (error) {
    if (error?.code === DB_INIT_TIMEOUT_ERROR_CODE) {
      markDbInitializing(error);
      return;
    }
    markDbUnavailable(error);
  }
}

async function getSectionLabel(linkId) {
  const rows = await sql`SELECT label FROM profile_links WHERE id = ${linkId} LIMIT 1`;
  return rows[0]?.label || '';
}

function tableByLabel(label) {
  if (label === 'Clay Play') return 'clay_play_entries';
  if (label === 'Guest Lectures') return 'guest_lectures_entries';
  if (label === 'Binomial Names') return 'binomial_names';
  if (label === 'Books Read') return 'books_read_entries';
  if (label === 'Mini-Projects') return 'mini_projects_entries';
  if (label === 'Projects') return 'projects_entries';
  if (label === 'Career' || label === 'Works' || label === 'Experience') return 'career_entries';
  if (label === 'à®…à®°à®¿à®¯à®¿à®©à¯ à®•à®µà®¿à®¤à¯ˆà®•à®³à¯' || label === 'Ariyin Kavithaigal' || label === 'Kavithaigal') {
    return 'ariyin_kavithaigal';
  }
  return null;
}

async function resolveItemTableById(id, linkId) {
  const expectedLinkId = Number.isInteger(Number(linkId)) && Number(linkId) > 0 ? Number(linkId) : null;
  const rows = expectedLinkId
    ? await sql`
        SELECT * FROM (
          SELECT id, link_id AS "linkId", 'ariyin_kavithaigal'::text AS table_name FROM ariyin_kavithaigal WHERE id = ${id} AND link_id = ${expectedLinkId}
          UNION ALL
          SELECT id, link_id AS "linkId", 'binomial_names'::text AS table_name FROM binomial_names WHERE id = ${id} AND link_id = ${expectedLinkId}
          UNION ALL
          SELECT id, link_id AS "linkId", 'clay_play_entries'::text AS table_name FROM clay_play_entries WHERE id = ${id} AND link_id = ${expectedLinkId}
          UNION ALL
          SELECT id, link_id AS "linkId", 'guest_lectures_entries'::text AS table_name FROM guest_lectures_entries WHERE id = ${id} AND link_id = ${expectedLinkId}
          UNION ALL
          SELECT id, link_id AS "linkId", 'books_read_entries'::text AS table_name FROM books_read_entries WHERE id = ${id} AND link_id = ${expectedLinkId}
          UNION ALL
          SELECT id, link_id AS "linkId", 'mini_projects_entries'::text AS table_name FROM mini_projects_entries WHERE id = ${id} AND link_id = ${expectedLinkId}
          UNION ALL
          SELECT id, link_id AS "linkId", 'projects_entries'::text AS table_name FROM projects_entries WHERE id = ${id} AND link_id = ${expectedLinkId}
          UNION ALL
          SELECT id, link_id AS "linkId", 'career_entries'::text AS table_name FROM career_entries WHERE id = ${id} AND link_id = ${expectedLinkId}
        ) all_rows
        LIMIT 1
      `
    : await sql`
        SELECT * FROM (
          SELECT id, link_id AS "linkId", 'ariyin_kavithaigal'::text AS table_name FROM ariyin_kavithaigal WHERE id = ${id}
          UNION ALL
          SELECT id, link_id AS "linkId", 'binomial_names'::text AS table_name FROM binomial_names WHERE id = ${id}
          UNION ALL
          SELECT id, link_id AS "linkId", 'clay_play_entries'::text AS table_name FROM clay_play_entries WHERE id = ${id}
          UNION ALL
          SELECT id, link_id AS "linkId", 'guest_lectures_entries'::text AS table_name FROM guest_lectures_entries WHERE id = ${id}
          UNION ALL
          SELECT id, link_id AS "linkId", 'books_read_entries'::text AS table_name FROM books_read_entries WHERE id = ${id}
          UNION ALL
          SELECT id, link_id AS "linkId", 'mini_projects_entries'::text AS table_name FROM mini_projects_entries WHERE id = ${id}
          UNION ALL
          SELECT id, link_id AS "linkId", 'projects_entries'::text AS table_name FROM projects_entries WHERE id = ${id}
          UNION ALL
          SELECT id, link_id AS "linkId", 'career_entries'::text AS table_name FROM career_entries WHERE id = ${id}
        ) all_rows
        LIMIT 1
      `;
  if (!rows[0]) return null;
  return { table: rows[0].table_name, linkId: rows[0].linkId };
}

export async function listProfileLinks() {
  await ensureInitialized();
  if (dbUnavailable) return [];
  const now = Date.now();
  if (profileLinksCache.all && profileLinksCache.allExpiresAt > now) {
    return profileLinksCache.all;
  }
  const rows = await sql`SELECT id, label, href, category, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links ORDER BY sort_order ASC, id ASC`;
  profileLinksCache = {
    ...profileLinksCache,
    all: rows,
    allExpiresAt: now + PROFILE_LINKS_CACHE_TTL_MS,
  };
  return rows;
}

export async function listVisibleProfileLinks() {
  await ensureInitialized();
  if (dbUnavailable) return [];
  const now = Date.now();
  if (profileLinksCache.visible && profileLinksCache.visibleExpiresAt > now) {
    return profileLinksCache.visible;
  }
  const rows = await sql`SELECT id, label, href, category, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links WHERE is_hidden = 0 ORDER BY sort_order ASC, id ASC`;
  profileLinksCache = {
    ...profileLinksCache,
    visible: rows,
    visibleExpiresAt: now + PROFILE_LINKS_CACHE_TTL_MS,
  };
  return rows;
}

export async function getProfileLinkById(id) {
  await ensureInitialized();
  if (dbUnavailable) return null;
  const rows = await sql`SELECT id, label, href, category, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

export async function getProfileLinkByLabel(label) {
  await ensureInitialized();
  if (dbUnavailable) return null;
  const rows = await sql`SELECT id, label, href, category, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links WHERE label = ${label} LIMIT 1`;
  return rows[0] || null;
}

export async function addProfileLink({ label, href, category }) {
  await ensureInitialized();
  const hrefValue = typeof href === 'string' ? href.trim() : '';
  if (!hrefValue || (!hrefValue.startsWith('/') && !hrefValue.startsWith('https://'))) {
    throw new Error('Invalid profile link URL.');
  }
  const maxRow = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM profile_links`;
  const normalizedCategory = normalizeCategory(category);
  const rows = await sql`
    INSERT INTO profile_links (label, href, category, sort_order, is_hidden)
    VALUES (${label}, ${hrefValue}, ${normalizedCategory}, ${(maxRow[0]?.max_order || 0) + 1}, 0)
    RETURNING id, label, href, category, sort_order AS "sortOrder", is_hidden AS "isHidden"
  `;
  invalidateProfileLinksCache();
  return rows[0] || null;
}

export async function setProfileLinkHidden(id, hidden) {
  await ensureInitialized();
  await sql`UPDATE profile_links SET is_hidden = ${hidden ? 1 : 0} WHERE id = ${id}`;
  invalidateProfileLinksCache();
}

export async function listLinkItems(linkId) {
  await ensureInitialized();
  const label = await getSectionLabel(linkId);

  if (label === 'Mini-Projects') {
    await ensureMiniProjectsTable();
    let rows = await sql`
      SELECT id, link_id AS "linkId", logo_url AS "imageUrl", embed_link AS "youtubeUrl",
             caption AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
             category, sort_order AS "sortOrder"
      FROM mini_projects_entries
      WHERE link_id = ${linkId}
      ORDER BY sort_order ASC, id ASC
    `;
    if (rows.length === 0) {
      let sortOrder = 1;
      for (const item of fallbackMiniProjects) {
        await sql`
          INSERT INTO mini_projects_entries (link_id, title, embed_link, logo_url, caption, category, sort_order)
          VALUES (${linkId}, ${item.title || ''}, ${item.embedLink || ''}, ${item.logo || ''}, ${item.caption || ''}, ${item.category || ''}, ${sortOrder})
        `;
        sortOrder += 1;
      }
      rows = await sql`
        SELECT id, link_id AS "linkId", logo_url AS "imageUrl", embed_link AS "youtubeUrl",
               caption AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
               category, sort_order AS "sortOrder"
        FROM mini_projects_entries
        WHERE link_id = ${linkId}
        ORDER BY sort_order ASC, id ASC
      `;
    }
    return rows;
  }
  if (label === 'Projects') {
    await ensureProjectsTable();
    const rows = await sql`
      SELECT id, link_id AS "linkId", logo_url AS "imageUrl", project_link AS "youtubeUrl",
             caption AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
             category, sort_order AS "sortOrder"
      FROM projects_entries
      WHERE link_id = ${linkId}
      ORDER BY sort_order ASC, id ASC
    `;
    return rows;
  }
  if (label === 'Career' || label === 'Works' || label === 'Experience') {
    let rows = await sql`
      SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
             company_logo_url AS "companyLogoUrl",
             subtitle AS "subtitle",
             markdown_text AS "markdownText", entry_title AS "kavithaiFrom", 'left'::text AS "imageAlign",
             sort_order AS "sortOrder", created_at AS "createdAt"
      FROM career_entries
      WHERE link_id = ${linkId}
      ORDER BY sort_order ASC, id ASC
    `;
    return rows;
  }

  if (label === 'Clay Play') {
    const rows = await sql`
      SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
             image_urls AS "imageUrlsRaw", markdown_text AS "markdownText",
             entry_title AS "kavithaiFrom", image_align AS "imageAlign",
             sort_order AS "sortOrder"
      FROM clay_play_entries
      WHERE link_id = ${linkId}
      ORDER BY sort_order ASC, id ASC
    `;
    return rows.map((row) => ({
      ...row,
      imageUrls: parseImageUrls(row.imageUrlsRaw, row.imageUrl),
    }));
  }

  if (label === 'Binomial Names') {
    return sql`
      SELECT id, link_id AS "linkId", ''::text AS "imageUrl", youtube_url AS "youtubeUrl",
             markdown_text AS "markdownText", entry_name AS "kavithaiFrom", 'left'::text AS "imageAlign",
             sort_order AS "sortOrder"
      FROM binomial_names
      WHERE link_id = ${linkId}
      ORDER BY sort_order ASC, id ASC
    `;
  }

  if (label === 'அரியின் கவிதைகள்' || label === 'Ariyin Kavithaigal' || label === 'Kavithaigal') {
    return sql`
      SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
             markdown_text AS "markdownText", kavithai_name AS "kavithaiFrom", 'left'::text AS "imageAlign",
             sort_order AS "sortOrder"
      FROM ariyin_kavithaigal
      WHERE link_id = ${linkId}
      ORDER BY sort_order ASC, id ASC
    `;
  }
  if (label === 'Guest Lectures') {
    const rows = await sql`
      SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
             image_urls AS "imageUrlsRaw", markdown_text AS "markdownText",
             entry_title AS "kavithaiFrom", image_align AS "imageAlign",
             sort_order AS "sortOrder"
      FROM guest_lectures_entries
      WHERE link_id = ${linkId}
      ORDER BY sort_order ASC, id ASC
    `;
    return rows.map((row) => ({
      ...row,
      imageUrls: parseImageUrls(row.imageUrlsRaw, row.imageUrl),
    }));
  }

  if (label === 'Books Read') {
    const rows = await sql`
      SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
             markdown_text AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
             category, subcategory, sort_order AS "sortOrder"
      FROM books_read_entries
      WHERE link_id = ${linkId}
      ORDER BY sort_order ASC, id ASC
    `;
    return rows.map((row) => ({
      ...row,
      category: normalizeBookCategory(row.category),
      subcategory: normalizeBookSubcategory(row.category, row.subcategory),
    }));
  }

  return [];
}

export async function getLinkItemById(id, linkId) {
  await ensureInitialized();
  const resolved = await resolveItemTableById(id, linkId);
  if (!resolved) return null;

  if (resolved.table === 'guest_lectures_entries') {
    const rows = await sql`
      SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
             image_urls AS "imageUrlsRaw", markdown_text AS "markdownText",
             entry_title AS "kavithaiFrom", image_align AS "imageAlign",
             sort_order AS "sortOrder"
      FROM guest_lectures_entries
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!rows[0]) return null;
    return {
      ...rows[0],
      imageUrls: parseImageUrls(rows[0].imageUrlsRaw, rows[0].imageUrl),
    };
  }
  if (resolved.table === 'clay_play_entries') {
    const rows = await sql`
      SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
             image_urls AS "imageUrlsRaw", markdown_text AS "markdownText",
             entry_title AS "kavithaiFrom", image_align AS "imageAlign",
             sort_order AS "sortOrder"
      FROM clay_play_entries
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!rows[0]) return null;
    return {
      ...rows[0],
      imageUrls: parseImageUrls(rows[0].imageUrlsRaw, rows[0].imageUrl),
    };
  }
  if (resolved.table === 'ariyin_kavithaigal') {
    const rows = await sql`
      SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
             markdown_text AS "markdownText", kavithai_name AS "kavithaiFrom", 'left'::text AS "imageAlign",
             sort_order AS "sortOrder"
      FROM ariyin_kavithaigal
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] || null;
  }
  if (label === 'Projects') {
    await ensureProjectsTable();
    const maxProjects = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM projects_entries WHERE link_id = ${linkId}`;
    const rows = await sql`
      INSERT INTO projects_entries (link_id, title, project_link, logo_url, caption, category, sort_order)
      VALUES (${linkId}, ${kavithaiFrom || ''}, ${youtubeUrl || ''}, ${imageUrl || ''}, ${markdownText || ''}, ${category || ''}, ${(maxProjects[0]?.max_order || 0) + 1})
      RETURNING id, link_id AS "linkId", logo_url AS "imageUrl", project_link AS "youtubeUrl",
                caption AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
                category, sort_order AS "sortOrder"
    `;
    return rows[0] || null;
  }
  if (resolved.table === 'binomial_names') {
    const rows = await sql`
      SELECT id, link_id AS "linkId", ''::text AS "imageUrl", youtube_url AS "youtubeUrl",
             markdown_text AS "markdownText", entry_name AS "kavithaiFrom", 'left'::text AS "imageAlign",
             sort_order AS "sortOrder"
      FROM binomial_names
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] || null;
  }
  if (resolved.table === 'mini_projects_entries') {
    const rows = await sql`
      SELECT id, link_id AS "linkId", logo_url AS "imageUrl", embed_link AS "youtubeUrl",
             caption AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
             category, sort_order AS "sortOrder"
      FROM mini_projects_entries
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] || null;
  }
  if (resolved.table === 'projects_entries') {
    const rows = await sql`
      SELECT id, link_id AS "linkId", logo_url AS "imageUrl", project_link AS "youtubeUrl",
             caption AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
             category, sort_order AS "sortOrder"
      FROM projects_entries
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] || null;
  }
  if (resolved.table === 'career_entries') {
    const rows = await sql`
      SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
             company_logo_url AS "companyLogoUrl",
             subtitle AS "subtitle",
             markdown_text AS "markdownText", entry_title AS "kavithaiFrom", 'left'::text AS "imageAlign",
             sort_order AS "sortOrder", created_at AS "createdAt"
      FROM career_entries
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] || null;
  }
  const rows = await sql`
    SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
           markdown_text AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
           category, subcategory, sort_order AS "sortOrder"
    FROM books_read_entries
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return {
    ...rows[0],
    category: normalizeBookCategory(rows[0].category),
    subcategory: normalizeBookSubcategory(rows[0].category, rows[0].subcategory),
  };
}

export async function listKavithaiEntries() {
  await ensureInitialized();
  const kavithaiLink = (await getProfileLinkByLabel('அரியின் கவிதைகள்')) || (await getProfileLinkByLabel('Ariyin Kavithaigal')) || (await getProfileLinkByLabel('Kavithaigal'));
  if (!kavithaiLink) return [];

  return sql`
    SELECT id, kavithai_name AS "kavithaiName", image_url AS "imageUrl", markdown_text AS "markdownText", sort_order AS "sortOrder"
    FROM ariyin_kavithaigal
    WHERE link_id = ${kavithaiLink.id} AND TRIM(COALESCE(kavithai_name, '')) <> ''
    ORDER BY sort_order ASC, id ASC
  `;
}

export async function addLinkItem({ linkId, imageUrl, imageUrls, youtubeUrl, markdownText, kavithaiFrom, imageAlign, category, subcategory, companyLogoUrl, subtitle }) {
  await ensureInitialized();
  const label = await getSectionLabel(linkId);
  if (label === 'Mini-Projects') {
    await ensureMiniProjectsTable();
    const maxMini = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM mini_projects_entries WHERE link_id = ${linkId}`;
    const rows = await sql`
      INSERT INTO mini_projects_entries (link_id, title, embed_link, logo_url, caption, category, sort_order)
      VALUES (${linkId}, ${kavithaiFrom || ''}, ${youtubeUrl || ''}, ${imageUrl || ''}, ${markdownText || ''}, ${category || ''}, ${(maxMini[0]?.max_order || 0) + 1})
      RETURNING id, link_id AS "linkId", logo_url AS "imageUrl", embed_link AS "youtubeUrl",
                caption AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
                category, sort_order AS "sortOrder"
    `;
    return rows[0] || null;
  }
  if (label === 'Projects') {
    await ensureProjectsTable();
    const maxProjects = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM projects_entries WHERE link_id = ${linkId}`;
    const rows = await sql`
      INSERT INTO projects_entries (link_id, title, project_link, logo_url, caption, category, sort_order)
      VALUES (${linkId}, ${kavithaiFrom || ''}, ${youtubeUrl || ''}, ${imageUrl || ''}, ${markdownText || ''}, ${category || ''}, ${(maxProjects[0]?.max_order || 0) + 1})
      RETURNING id, link_id AS "linkId", logo_url AS "imageUrl", project_link AS "youtubeUrl",
                caption AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
                category, sort_order AS "sortOrder"
    `;
    return rows[0] || null;
  }
  if (label === 'Guest Lectures') {
    const maxGuest = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM guest_lectures_entries WHERE link_id = ${linkId}`;
    const align = imageAlign === 'right' ? 'right' : 'left';
    const normalizedUrls = normalizeImageUrls(imageUrls);
    const primaryImage = normalizedUrls[0] || imageUrl || '';
    const guestRows = await sql`
      INSERT INTO guest_lectures_entries (link_id, image_url, image_urls, markdown_text, entry_title, image_align, sort_order)
      VALUES (${linkId}, ${primaryImage}, ${JSON.stringify(normalizedUrls)}, ${markdownText || ''}, ${kavithaiFrom || ''}, ${align}, ${(maxGuest[0]?.max_order || 0) + 1})
      RETURNING id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
                image_urls AS "imageUrlsRaw", markdown_text AS "markdownText",
                entry_title AS "kavithaiFrom", image_align AS "imageAlign",
                sort_order AS "sortOrder"
    `;
    if (!guestRows[0]) return null;
    return {
      ...guestRows[0],
      imageUrls: parseImageUrls(guestRows[0].imageUrlsRaw, guestRows[0].imageUrl),
    };
  }
  if (label === 'Clay Play') {
    const maxClay = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM clay_play_entries WHERE link_id = ${linkId}`;
    const align = imageAlign === 'right' ? 'right' : 'left';
    const normalizedUrls = normalizeImageUrls(imageUrls);
    const primaryImage = normalizedUrls[0] || imageUrl || '';
    const clayRows = await sql`
      INSERT INTO clay_play_entries (link_id, image_url, image_urls, markdown_text, entry_title, image_align, sort_order)
      VALUES (${linkId}, ${primaryImage}, ${JSON.stringify(normalizedUrls)}, ${markdownText || ''}, ${kavithaiFrom || ''}, ${align}, ${(maxClay[0]?.max_order || 0) + 1})
      RETURNING id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
                image_urls AS "imageUrlsRaw", markdown_text AS "markdownText",
                entry_title AS "kavithaiFrom", image_align AS "imageAlign",
                sort_order AS "sortOrder"
    `;
    if (!clayRows[0]) return null;
    return {
      ...clayRows[0],
      imageUrls: parseImageUrls(clayRows[0].imageUrlsRaw, clayRows[0].imageUrl),
    };
  }

  if (label === 'Books Read') {
    const maxBooks = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM books_read_entries WHERE link_id = ${linkId}`;
    const normalizedCategory = normalizeBookCategory(category);
    const normalizedSubcategory = normalizeBookSubcategory(normalizedCategory, subcategory);
    const bookRows = await sql`
      INSERT INTO books_read_entries (link_id, image_url, title, category, subcategory, markdown_text, sort_order)
      VALUES (${linkId}, ${imageUrl || ''}, ${kavithaiFrom || ''}, ${normalizedCategory}, ${normalizedSubcategory}, ${markdownText || ''}, ${(maxBooks[0]?.max_order || 0) + 1})
      RETURNING id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
                markdown_text AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign", category, subcategory,
                sort_order AS "sortOrder"
    `;
    if (!bookRows[0]) return null;
    return {
      ...bookRows[0],
      category: normalizeBookCategory(bookRows[0].category),
      subcategory: normalizeBookSubcategory(bookRows[0].category, bookRows[0].subcategory),
    };
  }
  if (label === 'Career' || label === 'Works' || label === 'Experience') {
    const maxCareer = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM career_entries WHERE link_id = ${linkId}`;
    const rows = await sql`
      INSERT INTO career_entries (link_id, image_url, company_logo_url, subtitle, markdown_text, entry_title, sort_order)
      VALUES (${linkId}, ${imageUrl || ''}, ${companyLogoUrl || ''}, ${subtitle || ''}, ${markdownText || ''}, ${kavithaiFrom || ''}, ${(maxCareer[0]?.max_order || 0) + 1})
      RETURNING id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
                company_logo_url AS "companyLogoUrl",
                subtitle AS "subtitle",
                markdown_text AS "markdownText", entry_title AS "kavithaiFrom", 'left'::text AS "imageAlign",
                sort_order AS "sortOrder", created_at AS "createdAt"
    `;
    return rows[0] || null;
  }

  const maxRow = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM ariyin_kavithaigal WHERE link_id = ${linkId}`;
  const rows = await sql`
    INSERT INTO ariyin_kavithaigal (link_id, image_url, markdown_text, kavithai_name, sort_order)
    VALUES (${linkId}, ${imageUrl || ''}, ${markdownText || ''}, ${kavithaiFrom || ''}, ${(maxRow[0]?.max_order || 0) + 1})
    RETURNING id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
              markdown_text AS "markdownText", kavithai_name AS "kavithaiFrom", 'left'::text AS "imageAlign",
              sort_order AS "sortOrder"
  `;
  return rows[0] || null;
}

export async function addBinomialItem({ linkId, name, youtubeUrl, caption }) {
  await ensureInitialized();
  const maxRow = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM binomial_names WHERE link_id = ${linkId}`;
  const rows = await sql`
    INSERT INTO binomial_names (link_id, youtube_url, markdown_text, entry_name, sort_order)
    VALUES (${linkId}, ${youtubeUrl || ''}, ${caption || ''}, ${name || ''}, ${(maxRow[0]?.max_order || 0) + 1})
    RETURNING id, link_id AS "linkId", ''::text AS "imageUrl", youtube_url AS "youtubeUrl",
              markdown_text AS "markdownText", entry_name AS "kavithaiFrom", 'left'::text AS "imageAlign",
              sort_order AS "sortOrder"
  `;
  return rows[0] || null;
}

export async function updateLinkItem({ id, linkId, imageUrl, imageUrls, youtubeUrl, markdownText, kavithaiFrom, imageAlign, category, subcategory, companyLogoUrl, subtitle }) {
  await ensureInitialized();
  const resolved = await resolveItemTableById(id, linkId);
  if (!resolved) return;

  const expectedLinkId = Number.isInteger(Number(linkId)) && Number(linkId) > 0 ? Number(linkId) : null;
  if (expectedLinkId && expectedLinkId !== resolved.linkId) {
    throw new Error('Invalid link association for item.');
  }

  const scopedLinkId = expectedLinkId || resolved.linkId;
  const label = await getSectionLabel(scopedLinkId);
  const preferredTable = tableByLabel(label);
  if (preferredTable && preferredTable !== resolved.table) {
    throw new Error('Item does not belong to the provided section.');
  }

  if (resolved.table === 'binomial_names') {
    await sql`UPDATE binomial_names SET youtube_url = ${youtubeUrl || ''}, markdown_text = ${markdownText || ''}, entry_name = ${kavithaiFrom || ''} WHERE id = ${id} AND link_id = ${resolved.linkId}`;
    return;
  }
  if (resolved.table === 'projects_entries') {
    await sql`UPDATE projects_entries SET logo_url = ${imageUrl || ''}, project_link = ${youtubeUrl || ''}, caption = ${markdownText || ''}, title = ${kavithaiFrom || ''}, category = ${category || ''} WHERE id = ${id} AND link_id = ${resolved.linkId}`;
    return;
  }
  if (resolved.table === 'ariyin_kavithaigal') {
    await sql`UPDATE ariyin_kavithaigal SET image_url = ${imageUrl || ''}, markdown_text = ${markdownText || ''}, kavithai_name = ${kavithaiFrom || ''} WHERE id = ${id} AND link_id = ${resolved.linkId}`;
    return;
  }
  if (resolved.table === 'books_read_entries') {
    const normalizedCategory = normalizeBookCategory(category);
    const normalizedSubcategory = normalizeBookSubcategory(normalizedCategory, subcategory);
    await sql`UPDATE books_read_entries SET image_url = ${imageUrl || ''}, markdown_text = ${markdownText || ''}, title = ${kavithaiFrom || ''}, category = ${normalizedCategory}, subcategory = ${normalizedSubcategory} WHERE id = ${id} AND link_id = ${resolved.linkId}`;
    return;
  }
  if (resolved.table === 'mini_projects_entries') {
    await sql`UPDATE mini_projects_entries SET logo_url = ${imageUrl || ''}, embed_link = ${youtubeUrl || ''}, caption = ${markdownText || ''}, title = ${kavithaiFrom || ''}, category = ${category || ''} WHERE id = ${id} AND link_id = ${resolved.linkId}`;
    return;
  }
  if (resolved.table === 'career_entries') {
    await sql`UPDATE career_entries SET image_url = ${imageUrl || ''}, company_logo_url = ${companyLogoUrl || ''}, subtitle = ${subtitle || ''}, markdown_text = ${markdownText || ''}, entry_title = ${kavithaiFrom || ''} WHERE id = ${id} AND link_id = ${resolved.linkId}`;
    return;
  }

  const align = imageAlign === 'right' ? 'right' : 'left';
  const normalizedUrls = normalizeImageUrls(imageUrls);
  const primaryImage = normalizedUrls[0] || imageUrl || '';
  if (resolved.table === 'clay_play_entries') {
    await sql`UPDATE clay_play_entries SET image_url = ${primaryImage}, image_urls = ${JSON.stringify(normalizedUrls)}, markdown_text = ${markdownText || ''}, entry_title = ${kavithaiFrom || ''}, image_align = ${align} WHERE id = ${id} AND link_id = ${resolved.linkId}`;
    return;
  }
  if (resolved.table === 'guest_lectures_entries') {
    await sql`UPDATE guest_lectures_entries SET image_url = ${primaryImage}, image_urls = ${JSON.stringify(normalizedUrls)}, markdown_text = ${markdownText || ''}, entry_title = ${kavithaiFrom || ''}, image_align = ${align} WHERE id = ${id} AND link_id = ${resolved.linkId}`;
  }
}

export async function deleteLinkItem(id, linkId) {
  await ensureInitialized();
  const resolved = await resolveItemTableById(id, linkId);
  if (!resolved) return;

  const expectedLinkId = Number.isInteger(Number(linkId)) && Number(linkId) > 0 ? Number(linkId) : null;
  if (expectedLinkId && expectedLinkId !== resolved.linkId) {
    throw new Error('Invalid link association for item.');
  }

  const scopedLinkId = expectedLinkId || resolved.linkId;
  const label = await getSectionLabel(scopedLinkId);
  const preferredTable = tableByLabel(label);
  if (preferredTable && preferredTable !== resolved.table) {
    throw new Error('Item does not belong to the provided section.');
  }

  if (resolved.table === 'binomial_names') {
    await sql`DELETE FROM binomial_names WHERE id = ${id} AND link_id = ${resolved.linkId}`;
  } else if (resolved.table === 'clay_play_entries') {
    await sql`DELETE FROM clay_play_entries WHERE id = ${id} AND link_id = ${resolved.linkId}`;
  } else if (resolved.table === 'guest_lectures_entries') {
    await sql`DELETE FROM guest_lectures_entries WHERE id = ${id} AND link_id = ${resolved.linkId}`;
  } else if (resolved.table === 'ariyin_kavithaigal') {
    await sql`DELETE FROM ariyin_kavithaigal WHERE id = ${id} AND link_id = ${resolved.linkId}`;
  } else if (resolved.table === 'books_read_entries') {
    await sql`DELETE FROM books_read_entries WHERE id = ${id} AND link_id = ${resolved.linkId}`;
  } else if (resolved.table === 'mini_projects_entries') {
    await sql`DELETE FROM mini_projects_entries WHERE id = ${id} AND link_id = ${resolved.linkId}`;
  } else if (resolved.table === 'projects_entries') {
    await sql`DELETE FROM projects_entries WHERE id = ${id} AND link_id = ${resolved.linkId}`;
  } else if (resolved.table === 'career_entries') {
    await sql`DELETE FROM career_entries WHERE id = ${id} AND link_id = ${resolved.linkId}`;
  }
}

export async function listMiniProjectEntries() {
  await ensureInitialized();
  const link = await getProfileLinkByLabel('Mini-Projects');
  if (!link) return fallbackMiniProjects;
  const items = await listLinkItems(link.id);
  if (!Array.isArray(items) || items.length === 0) return fallbackMiniProjects;
  return items.map((item) => ({
    title: item.kavithaiFrom || '',
    embedLink: item.youtubeUrl || '',
    logo: item.imageUrl || '',
    category: item.category || '',
    caption: item.markdownText || '',
  }));
}

export async function listProjectEntries() {
  await ensureInitialized();
  const link = await getProfileLinkByLabel('Projects');
  if (!link) return [];
  const items = await listLinkItems(link.id);
  if (!Array.isArray(items) || items.length === 0) return [];
  return items.map((item) => ({
    id: item.id,
    title: item.kavithaiFrom || '',
    embedLink: item.youtubeUrl || '',
    logo: item.imageUrl || '',
    category: item.category || '',
    caption: item.markdownText || '',
  }));
}

export async function listBooksReadEntries() {
  await ensureInitialized();
  const booksReadLink = await getProfileLinkByLabel('Books Read');
  if (!booksReadLink) return [];
  const rows = await sql`
    SELECT id, image_url AS "imageUrl", title, category, subcategory, markdown_text AS "markdownText", sort_order AS "sortOrder"
    FROM books_read_entries
    WHERE link_id = ${booksReadLink.id}
    ORDER BY sort_order ASC, id ASC
  `;
  return rows.map((row) => ({
    ...row,
    category: normalizeBookCategory(row.category),
    subcategory: normalizeBookSubcategory(row.category, row.subcategory),
  }));
}

export async function listArisBooksEntries() {
  await ensureInitialized();
  const link = await getProfileLinkByLabel('My Books');
  if (!link) return [];
  const rows = await sql`
    SELECT id, cover_url AS "coverUrl", book_url AS "bookUrl", name, tag, sort_order AS "sortOrder"
    FROM aris_books_entries
    WHERE link_id = ${link.id}
    ORDER BY sort_order ASC, id ASC
  `;
  return rows.map((row) => ({
    ...row,
    name: row.name || '',
    tag: row.tag || '',
    coverUrl: row.coverUrl || '',
    bookUrl: row.bookUrl || '',
  }));
}

export async function listCareerEntries() {
  await ensureInitialized();
  const link = (await getProfileLinkByLabel('Career')) || (await getProfileLinkByLabel('Works'));
  if (!link) return [];
  return listLinkItems(link.id);
}

export async function getSectionHero(linkId, fallbackHeading = '') {
  await ensureInitialized();
  if (dbUnavailable) {
    return {
      linkId,
      heading: fallbackHeading || '',
      description: '',
      quote: '',
      imageUrl: '',
    };
  }
  const rows = await sql`
    SELECT link_id AS "linkId", heading, description, quote, image_url AS "imageUrl"
    FROM section_heroes
    WHERE link_id = ${linkId}
    LIMIT 1
  `;
  if (rows[0]) return rows[0];
  return {
    linkId,
    heading: fallbackHeading || '',
    description: '',
    quote: '',
    imageUrl: '',
  };
}

export async function upsertSectionHero({ linkId, heading, description, quote, imageUrl }) {
  await ensureInitialized();
  const rows = await sql`
    INSERT INTO section_heroes (link_id, heading, description, quote, image_url, updated_at)
    VALUES (${linkId}, ${heading || ''}, ${description || ''}, ${quote || ''}, ${imageUrl || ''}, now())
    ON CONFLICT (link_id)
    DO UPDATE SET
      heading = EXCLUDED.heading,
      description = EXCLUDED.description,
      quote = EXCLUDED.quote,
      image_url = EXCLUDED.image_url,
      updated_at = now()
    RETURNING link_id AS "linkId", heading, description, quote, image_url AS "imageUrl"
  `;
  return rows[0] || null;
}

function normalizePersonName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name.slice(0, 80);
}

function normalizeCommentText(value) {
  const comment = typeof value === 'string' ? value.trim() : '';
  return comment.slice(0, 800);
}

export async function listClayPlayEntryReactions(entryIds = []) {
  await ensureInitialized();
  const ids = Array.from(new Set(entryIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
  if (ids.length === 0) return {};

  const likesRows = await sql`
    SELECT entry_id AS "entryId", COUNT(*)::int AS "likesCount"
    FROM clay_play_entry_likes
    WHERE entry_id = ANY(${ids}::int[])
    GROUP BY entry_id
  `;

  const commentsRows = await sql`
    SELECT id, entry_id AS "entryId", person_name AS "name", comment_text AS "comment", created_at AS "createdAt"
    FROM clay_play_entry_comments
    WHERE entry_id = ANY(${ids}::int[])
    ORDER BY entry_id ASC, created_at DESC, id DESC
  `;

  const byEntry = {};
  for (const id of ids) {
    byEntry[id] = { likesCount: 0, comments: [] };
  }
  for (const row of likesRows) {
    if (!byEntry[row.entryId]) byEntry[row.entryId] = { likesCount: 0, comments: [] };
    byEntry[row.entryId].likesCount = row.likesCount;
  }
  for (const row of commentsRows) {
    if (!byEntry[row.entryId]) byEntry[row.entryId] = { likesCount: 0, comments: [] };
    byEntry[row.entryId].comments.push({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ''),
    });
  }

  return byEntry;
}

export async function addClayPlayEntryLike({ entryId, name }) {
  await ensureInitialized();
  const resolvedEntryId = Number(entryId);
  let personName = normalizePersonName(name);
  if (!Number.isInteger(resolvedEntryId) || resolvedEntryId <= 0) throw new Error('Invalid entry id.');
  if (!personName) {
    const anonCountRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM clay_play_entry_likes
      WHERE entry_id = ${resolvedEntryId}
        AND LOWER(person_name) LIKE 'anonymous-like%'
    `;
    const next = (anonCountRows[0]?.count || 0) + 1;
    personName = `anonymous-like${next}`;
  }
  await sql`
    INSERT INTO clay_play_entry_likes (entry_id, person_name)
    VALUES (${resolvedEntryId}, ${personName})
  `;

  const countRows = await sql`
    SELECT COUNT(*)::int AS count
    FROM clay_play_entry_likes
    WHERE entry_id = ${resolvedEntryId}
  `;

  return {
    likesCount: countRows[0]?.count || 0,
  };
}

export async function addClayPlayEntryComment({ entryId, name, comment }) {
  await ensureInitialized();
  const resolvedEntryId = Number(entryId);
  let personName = normalizePersonName(name);
  const commentText = normalizeCommentText(comment);
  if (!Number.isInteger(resolvedEntryId) || resolvedEntryId <= 0) throw new Error('Invalid entry id.');
  if (!commentText) throw new Error('Comment is required.');

  if (!personName) {
    const anonCountRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM clay_play_entry_comments
      WHERE entry_id = ${resolvedEntryId}
        AND LOWER(person_name) LIKE 'anonymous%'
    `;
    const next = (anonCountRows[0]?.count || 0) + 1;
    personName = `anonymous${next}`;
  }

  const rows = await sql`
    INSERT INTO clay_play_entry_comments (entry_id, person_name, comment_text)
    VALUES (${resolvedEntryId}, ${personName}, ${commentText})
    RETURNING id, entry_id AS "entryId", person_name AS "name", comment_text AS "comment", created_at AS "createdAt"
  `;
  if (!rows[0]) return null;
  return {
    ...rows[0],
    createdAt: rows[0].createdAt instanceof Date ? rows[0].createdAt.toISOString() : String(rows[0].createdAt || ''),
  };
}
