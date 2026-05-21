import { neon } from '@neondatabase/serverless';

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
  { label: 'Works', href: '/works', category: 'PROFESSIONAL' },
  { label: 'Experiments', href: '/aris-trials', category: 'PASSIONAL' },
  { label: 'Mini-Projects', href: '/mini-projects', category: 'PASSIONAL' },
  { label: 'Projects', href: '/projects', category: 'PROFESSIONAL' },
  { label: 'Skillset', href: 'https://arihara-sudhan.github.io/resume/#skills', category: 'PROFESSIONAL' },
  { label: 'Experience', href: 'https://arihara-sudhan.github.io/resume/#experience', category: 'PROFESSIONAL' },
  { label: 'Binomial Names', href: '/binomial-names', category: 'HOBBYAL' },
  { label: 'AriZone (Blog)', href: 'https://arihara-sudhan.github.io/blog/', category: 'PASSIONAL' },
  { label: 'My Books', href: '/my-books', category: 'PASSIONAL' },
  { label: 'Resume', href: 'https://arihara-sudhan.github.io/resume/', category: 'PROFESSIONAL' },
  { label: 'AI with ARI (YouTube)', href: '/ai-with-ari', category: 'PROFESSIONAL' },
  { label: 'Guest Lectures', href: '/guest-lectures', category: 'PASSIONAL' },
  { label: 'Clay Play', href: '/clay-play', category: 'HOBBYAL' },
  { label: 'Ariyin Kavithaigal', href: '/ariyin-kavithaigal', category: 'HOBBYAL' },
  { label: 'Thirukkural', href: '/thirukkural', category: 'PASSIONAL' },
  { label: 'Book Reviews', href: '/book-reviews', category: 'HOBBYAL' },
  { label: 'Books Read', href: '#', category: 'HOBBYAL' },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const sql = neon(connectionString);
let initPromise;

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
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
        SET label = 'Ariyin Kavithaigal', href = '/ariyin-kavithaigal'
        WHERE label = 'Kavithaigal'
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
      await sql`UPDATE profile_links SET href = '/works' WHERE label = 'Works'`;
      await sql`UPDATE profile_links SET href = '/projects' WHERE label = 'Projects'`;
      await sql`UPDATE profile_links SET href = 'https://arihara-sudhan.github.io/resume/#skills' WHERE label = 'Skillset'`;
      await sql`UPDATE profile_links SET href = 'https://arihara-sudhan.github.io/resume/#experience' WHERE label = 'Experience'`;
      await sql`UPDATE profile_links SET href = '/aris-trials' WHERE label = 'Experiments'`;
      await sql`UPDATE profile_links SET href = '/mini-projects' WHERE label = 'Mini-Projects'`;
      await sql`UPDATE profile_links SET href = '/guest-lectures' WHERE label = 'Guest Lectures'`;
      await sql`UPDATE profile_links SET href = '/thirukkural' WHERE label = 'Thirukkural'`;
      await sql`UPDATE profile_links SET href = '/book-reviews' WHERE label = 'Book Reviews'`;
      await sql`UPDATE profile_links SET href = '/my-books' WHERE label = 'My Books'`;

      await sql`
        UPDATE profile_links
        SET category = 'PROFESSIONAL'
        WHERE label IN ('Works', 'Projects', 'Skillset', 'Experience', 'Resume', 'AI with ARI (YouTube)')
      `;

      const existingSkillset = await sql`SELECT id FROM profile_links WHERE label = 'Skillset' LIMIT 1`;
      if (!existingSkillset[0]) {
        const maxSkillset = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM profile_links`;
        await sql`
          INSERT INTO profile_links (label, href, category, sort_order, is_hidden)
          VALUES ('Skillset', 'https://arihara-sudhan.github.io/resume/#skills', 'PROFESSIONAL', ${maxSkillset[0].max_order + 1}, 0)
        `;
      }

      const existingExperience = await sql`SELECT id FROM profile_links WHERE label = 'Experience' LIMIT 1`;
      if (!existingExperience[0]) {
        const maxExperience = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM profile_links`;
        await sql`
          INSERT INTO profile_links (label, href, category, sort_order, is_hidden)
          VALUES ('Experience', 'https://arihara-sudhan.github.io/resume/#experience', 'PROFESSIONAL', ${maxExperience[0].max_order + 1}, 0)
        `;
      }

      await sql`
        UPDATE profile_links
        SET category = 'PASSIONAL'
        WHERE label IN ('Experiments', 'Mini-Projects', 'My Books', 'AriZone (Blog)', 'Thirukkural', 'For AI', 'Guest Lectures')
      `;

      const existingMiniProjects = await sql`SELECT id FROM profile_links WHERE label = 'Mini-Projects' LIMIT 1`;
      if (!existingMiniProjects[0]) {
        const maxMiniProjects = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM profile_links`;
        await sql`
          INSERT INTO profile_links (label, href, category, sort_order, is_hidden)
          VALUES ('Mini-Projects', '/mini-projects', 'PASSIONAL', ${(maxMiniProjects[0]?.max_order || 0) + 1}, 0)
        `;
      }

      await sql`
        UPDATE profile_links
        SET category = 'HOBBYAL'
        WHERE label IN ('Clay Play', 'Ariyin Kavithaigal', 'Books Read', 'Book Reviews', 'Binomial Names')
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
          WHERE pl.label IN ('Ariyin Kavithaigal', 'Kavithaigal')
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
    })();
  }

  await initPromise;
}

async function getSectionLabel(linkId) {
  const rows = await sql`SELECT label FROM profile_links WHERE id = ${linkId} LIMIT 1`;
  return rows[0]?.label || '';
}

async function resolveItemTableById(id) {
  const kav = await sql`SELECT id, link_id AS "linkId" FROM ariyin_kavithaigal WHERE id = ${id} LIMIT 1`;
  if (kav[0]) return { table: 'ariyin_kavithaigal', linkId: kav[0].linkId };
  const bio = await sql`SELECT id, link_id AS "linkId" FROM binomial_names WHERE id = ${id} LIMIT 1`;
  if (bio[0]) return { table: 'binomial_names', linkId: bio[0].linkId };
  const clay = await sql`SELECT id, link_id AS "linkId" FROM clay_play_entries WHERE id = ${id} LIMIT 1`;
  if (clay[0]) return { table: 'clay_play_entries', linkId: clay[0].linkId };
  const guest = await sql`SELECT id, link_id AS "linkId" FROM guest_lectures_entries WHERE id = ${id} LIMIT 1`;
  if (guest[0]) return { table: 'guest_lectures_entries', linkId: guest[0].linkId };
  const books = await sql`SELECT id, link_id AS "linkId" FROM books_read_entries WHERE id = ${id} LIMIT 1`;
  if (books[0]) return { table: 'books_read_entries', linkId: books[0].linkId };
  return null;
}

export async function listProfileLinks() {
  await ensureInitialized();
  return sql`SELECT id, label, href, category, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links ORDER BY sort_order ASC, id ASC`;
}

export async function listVisibleProfileLinks() {
  await ensureInitialized();
  return sql`SELECT id, label, href, category, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links WHERE is_hidden = 0 ORDER BY sort_order ASC, id ASC`;
}

export async function getProfileLinkById(id) {
  await ensureInitialized();
  const rows = await sql`SELECT id, label, href, category, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

export async function getProfileLinkByLabel(label) {
  await ensureInitialized();
  const rows = await sql`SELECT id, label, href, category, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links WHERE label = ${label} LIMIT 1`;
  return rows[0] || null;
}

export async function addProfileLink({ label, href, category }) {
  await ensureInitialized();
  const maxRow = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM profile_links`;
  const normalizedCategory = normalizeCategory(category);
  const rows = await sql`
    INSERT INTO profile_links (label, href, category, sort_order, is_hidden)
    VALUES (${label}, ${href}, ${normalizedCategory}, ${(maxRow[0]?.max_order || 0) + 1}, 0)
    RETURNING id, label, href, category, sort_order AS "sortOrder", is_hidden AS "isHidden"
  `;
  return rows[0] || null;
}

export async function setProfileLinkHidden(id, hidden) {
  await ensureInitialized();
  await sql`UPDATE profile_links SET is_hidden = ${hidden ? 1 : 0} WHERE id = ${id}`;
}

export async function listLinkItems(linkId) {
  await ensureInitialized();
  const label = await getSectionLabel(linkId);

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

  if (label === 'Ariyin Kavithaigal' || label === 'Kavithaigal') {
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

export async function getLinkItemById(id) {
  await ensureInitialized();
  const guest = await sql`
    SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
           image_urls AS "imageUrlsRaw", markdown_text AS "markdownText",
           entry_title AS "kavithaiFrom", image_align AS "imageAlign",
           sort_order AS "sortOrder"
    FROM guest_lectures_entries
    WHERE id = ${id}
    LIMIT 1
  `;
  if (guest[0]) {
    return {
      ...guest[0],
      imageUrls: parseImageUrls(guest[0].imageUrlsRaw, guest[0].imageUrl),
    };
  }

  const clay = await sql`
    SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
           image_urls AS "imageUrlsRaw", markdown_text AS "markdownText",
           entry_title AS "kavithaiFrom", image_align AS "imageAlign",
           sort_order AS "sortOrder"
    FROM clay_play_entries
    WHERE id = ${id}
    LIMIT 1
  `;
  if (clay[0]) {
    return {
      ...clay[0],
      imageUrls: parseImageUrls(clay[0].imageUrlsRaw, clay[0].imageUrl),
    };
  }

  const kav = await sql`
    SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
           markdown_text AS "markdownText", kavithai_name AS "kavithaiFrom", 'left'::text AS "imageAlign",
           sort_order AS "sortOrder"
    FROM ariyin_kavithaigal
    WHERE id = ${id}
    LIMIT 1
  `;
  if (kav[0]) return kav[0];

  const bio = await sql`
    SELECT id, link_id AS "linkId", ''::text AS "imageUrl", youtube_url AS "youtubeUrl",
           markdown_text AS "markdownText", entry_name AS "kavithaiFrom", 'left'::text AS "imageAlign",
           sort_order AS "sortOrder"
    FROM binomial_names
    WHERE id = ${id}
    LIMIT 1
  `;
  if (bio[0]) return bio[0];

  const books = await sql`
    SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
           markdown_text AS "markdownText", title AS "kavithaiFrom", 'left'::text AS "imageAlign",
           category, subcategory, sort_order AS "sortOrder"
    FROM books_read_entries
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!books[0]) return null;
  return {
    ...books[0],
    category: normalizeBookCategory(books[0].category),
    subcategory: normalizeBookSubcategory(books[0].category, books[0].subcategory),
  };
}

export async function listKavithaiEntries() {
  await ensureInitialized();
  const kavithaiLink = (await getProfileLinkByLabel('Ariyin Kavithaigal')) || (await getProfileLinkByLabel('Kavithaigal'));
  if (!kavithaiLink) return [];

  return sql`
    SELECT id, kavithai_name AS "kavithaiName", image_url AS "imageUrl", markdown_text AS "markdownText", sort_order AS "sortOrder"
    FROM ariyin_kavithaigal
    WHERE link_id = ${kavithaiLink.id} AND TRIM(COALESCE(kavithai_name, '')) <> ''
    ORDER BY sort_order ASC, id ASC
  `;
}

export async function addLinkItem({ linkId, imageUrl, imageUrls, youtubeUrl, markdownText, kavithaiFrom, imageAlign, category, subcategory }) {
  await ensureInitialized();
  const label = await getSectionLabel(linkId);
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

export async function updateLinkItem({ id, linkId, imageUrl, imageUrls, youtubeUrl, markdownText, kavithaiFrom, imageAlign, category, subcategory }) {
  await ensureInitialized();
  const label = Number.isInteger(Number(linkId)) ? await getSectionLabel(Number(linkId)) : '';

  if (label === 'Clay Play') {
    const align = imageAlign === 'right' ? 'right' : 'left';
    const normalizedUrls = normalizeImageUrls(imageUrls);
    const primaryImage = normalizedUrls[0] || imageUrl || '';
    await sql`UPDATE clay_play_entries SET image_url = ${primaryImage}, image_urls = ${JSON.stringify(normalizedUrls)}, markdown_text = ${markdownText || ''}, entry_title = ${kavithaiFrom || ''}, image_align = ${align} WHERE id = ${id}`;
    return;
  }

  if (label === 'Binomial Names') {
    await sql`UPDATE binomial_names SET youtube_url = ${youtubeUrl || ''}, markdown_text = ${markdownText || ''}, entry_name = ${kavithaiFrom || ''} WHERE id = ${id}`;
    return;
  }

  if (label === 'Ariyin Kavithaigal' || label === 'Kavithaigal') {
    await sql`UPDATE ariyin_kavithaigal SET image_url = ${imageUrl || ''}, markdown_text = ${markdownText || ''}, kavithai_name = ${kavithaiFrom || ''} WHERE id = ${id}`;
    return;
  }
  if (label === 'Guest Lectures') {
    const align = imageAlign === 'right' ? 'right' : 'left';
    const normalizedUrls = normalizeImageUrls(imageUrls);
    const primaryImage = normalizedUrls[0] || imageUrl || '';
    await sql`UPDATE guest_lectures_entries SET image_url = ${primaryImage}, image_urls = ${JSON.stringify(normalizedUrls)}, markdown_text = ${markdownText || ''}, entry_title = ${kavithaiFrom || ''}, image_align = ${align} WHERE id = ${id}`;
    return;
  }
  if (label === 'Books Read') {
    const normalizedCategory = normalizeBookCategory(category);
    const normalizedSubcategory = normalizeBookSubcategory(normalizedCategory, subcategory);
    await sql`UPDATE books_read_entries SET image_url = ${imageUrl || ''}, markdown_text = ${markdownText || ''}, title = ${kavithaiFrom || ''}, category = ${normalizedCategory}, subcategory = ${normalizedSubcategory} WHERE id = ${id}`;
    return;
  }

  const fallback = await resolveItemTableById(id);
  if (fallback?.table === 'binomial_names') {
    await sql`UPDATE binomial_names SET youtube_url = ${youtubeUrl || ''}, markdown_text = ${markdownText || ''}, entry_name = ${kavithaiFrom || ''} WHERE id = ${id}`;
  } else if (fallback?.table === 'clay_play_entries') {
    const align = imageAlign === 'right' ? 'right' : 'left';
    const normalizedUrls = normalizeImageUrls(imageUrls);
    const primaryImage = normalizedUrls[0] || imageUrl || '';
    await sql`UPDATE clay_play_entries SET image_url = ${primaryImage}, image_urls = ${JSON.stringify(normalizedUrls)}, markdown_text = ${markdownText || ''}, entry_title = ${kavithaiFrom || ''}, image_align = ${align} WHERE id = ${id}`;
  } else if (fallback?.table === 'guest_lectures_entries') {
    const align = imageAlign === 'right' ? 'right' : 'left';
    const normalizedUrls = normalizeImageUrls(imageUrls);
    const primaryImage = normalizedUrls[0] || imageUrl || '';
    await sql`UPDATE guest_lectures_entries SET image_url = ${primaryImage}, image_urls = ${JSON.stringify(normalizedUrls)}, markdown_text = ${markdownText || ''}, entry_title = ${kavithaiFrom || ''}, image_align = ${align} WHERE id = ${id}`;
  } else if (fallback?.table === 'ariyin_kavithaigal') {
    await sql`UPDATE ariyin_kavithaigal SET image_url = ${imageUrl || ''}, markdown_text = ${markdownText || ''}, kavithai_name = ${kavithaiFrom || ''} WHERE id = ${id}`;
  } else if (fallback?.table === 'books_read_entries') {
    const normalizedCategory = normalizeBookCategory(category);
    const normalizedSubcategory = normalizeBookSubcategory(normalizedCategory, subcategory);
    await sql`UPDATE books_read_entries SET image_url = ${imageUrl || ''}, markdown_text = ${markdownText || ''}, title = ${kavithaiFrom || ''}, category = ${normalizedCategory}, subcategory = ${normalizedSubcategory} WHERE id = ${id}`;
  }
}

export async function deleteLinkItem(id, linkId) {
  await ensureInitialized();
  const label = Number.isInteger(Number(linkId)) ? await getSectionLabel(Number(linkId)) : '';

  if (label === 'Clay Play') {
    await sql`DELETE FROM clay_play_entries WHERE id = ${id}`;
    return;
  }
  if (label === 'Guest Lectures') {
    await sql`DELETE FROM guest_lectures_entries WHERE id = ${id}`;
    return;
  }

  if (label === 'Binomial Names') {
    await sql`DELETE FROM binomial_names WHERE id = ${id}`;
    return;
  }

  if (label === 'Ariyin Kavithaigal' || label === 'Kavithaigal') {
    await sql`DELETE FROM ariyin_kavithaigal WHERE id = ${id}`;
    return;
  }
  if (label === 'Books Read') {
    await sql`DELETE FROM books_read_entries WHERE id = ${id}`;
    return;
  }

  const fallback = await resolveItemTableById(id);
  if (fallback?.table === 'binomial_names') {
    await sql`DELETE FROM binomial_names WHERE id = ${id}`;
  } else if (fallback?.table === 'clay_play_entries') {
    await sql`DELETE FROM clay_play_entries WHERE id = ${id}`;
  } else if (fallback?.table === 'guest_lectures_entries') {
    await sql`DELETE FROM guest_lectures_entries WHERE id = ${id}`;
  } else if (fallback?.table === 'ariyin_kavithaigal') {
    await sql`DELETE FROM ariyin_kavithaigal WHERE id = ${id}`;
  } else if (fallback?.table === 'books_read_entries') {
    await sql`DELETE FROM books_read_entries WHERE id = ${id}`;
  }
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

export async function getSectionHero(linkId, fallbackHeading = '') {
  await ensureInitialized();
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

function normalizeInteractionText(value, maxLen = 1000) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.slice(0, maxLen);
}

export async function addAriverseInteraction({
  scopeKey,
  subgroupKey = 'default',
  itemKey,
  itemType = 'post',
  interactionType,
  actorName = '',
  contentText = '',
  parentInteractionId = null,
  metadataJson = '{}',
}) {
  await ensureInitialized();
  const scope = normalizeInteractionText(scopeKey, 120);
  const subgroup = normalizeInteractionText(subgroupKey, 120) || 'default';
  const item = normalizeInteractionText(itemKey, 160);
  const type = normalizeInteractionText(interactionType, 40).toLowerCase();
  const actor = normalizeInteractionText(actorName, 120);
  const content = normalizeInteractionText(contentText, 4000);
  const itemKind = normalizeInteractionText(itemType, 40) || 'post';
  const parentId = Number.isInteger(Number(parentInteractionId)) && Number(parentInteractionId) > 0
    ? Number(parentInteractionId)
    : null;
  const metadata = normalizeInteractionText(metadataJson, 20000) || '{}';
  if (!scope || !item || !type) throw new Error('scopeKey, itemKey, and interactionType are required.');

  const rows = await sql`
    INSERT INTO ariverse_interactions (
      scope_key, subgroup_key, item_key, item_type, interaction_type,
      actor_name, content_text, parent_interaction_id, metadata_json
    )
    VALUES (
      ${scope}, ${subgroup}, ${item}, ${itemKind}, ${type},
      ${actor}, ${content}, ${parentId}, ${metadata}
    )
    RETURNING id, scope_key AS "scopeKey", subgroup_key AS "subgroupKey",
      item_key AS "itemKey", item_type AS "itemType", interaction_type AS "interactionType",
      actor_name AS "actorName", content_text AS "contentText",
      parent_interaction_id AS "parentInteractionId", metadata_json AS "metadataJson",
      is_deleted AS "isDeleted", created_at AS "createdAt"
  `;
  if (!rows[0]) return null;
  return {
    ...rows[0],
    createdAt: rows[0].createdAt instanceof Date ? rows[0].createdAt.toISOString() : String(rows[0].createdAt || ''),
  };
}

export async function listAriverseInteractions({ scopeKey, subgroupKey = 'default', itemKey }) {
  await ensureInitialized();
  const scope = normalizeInteractionText(scopeKey, 120);
  const subgroup = normalizeInteractionText(subgroupKey, 120) || 'default';
  const item = normalizeInteractionText(itemKey, 160);
  if (!scope || !item) return [];

  const rows = await sql`
    SELECT id, scope_key AS "scopeKey", subgroup_key AS "subgroupKey",
      item_key AS "itemKey", item_type AS "itemType", interaction_type AS "interactionType",
      actor_name AS "actorName", content_text AS "contentText",
      parent_interaction_id AS "parentInteractionId", metadata_json AS "metadataJson",
      is_deleted AS "isDeleted", created_at AS "createdAt"
    FROM ariverse_interactions
    WHERE scope_key = ${scope}
      AND subgroup_key = ${subgroup}
      AND item_key = ${item}
      AND is_deleted = 0
    ORDER BY created_at ASC, id ASC
  `;
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ''),
  }));
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
