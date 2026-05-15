import { neon } from '@neondatabase/serverless';

const defaultLinks = [
  { label: 'For AI', href: '/for-ai' },
  { label: 'Works', href: '#' },
  { label: 'Xperiements', href: '#' },
  { label: 'Projects', href: '#' },
  { label: 'Binomial Names', href: '/binomial-names' },
  { label: 'AriZone (Blog)', href: 'https://arihara-sudhan.github.io/blog/' },
  { label: 'Books Written', href: 'https://arihara-sudhan.github.io/books/' },
  { label: 'Learnings', href: 'https://arihara-sudhan.github.io/learn-with-ari/' },
  { label: 'Resume', href: 'https://arihara-sudhan.github.io/resume/' },
  { label: 'AI with ARI (YouTube)', href: '/ai-with-ari' },
  { label: 'Guest Lectures', href: 'https://arihara-sudhan.github.io/glectures/' },
  { label: 'Clay Play', href: '#' },
  { label: 'Ariyin Kavithaigal', href: '/ariyin-kavithaigal' },
  { label: 'Thirukkural', href: '#' },
  { label: 'Books Read', href: '#' },
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
          sort_order INTEGER NOT NULL,
          is_hidden INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;

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

      const row = await sql`SELECT COUNT(*)::int AS count FROM profile_links`;
      if (!row[0] || row[0].count === 0) {
        for (let idx = 0; idx < defaultLinks.length; idx += 1) {
          const link = defaultLinks[idx];
          await sql`
            INSERT INTO profile_links (label, href, sort_order, is_hidden)
            VALUES (${link.label}, ${link.href}, ${idx + 1}, 0)
          `;
        }
      }

      await sql`
        UPDATE profile_links
        SET label = 'Ariyin Kavithaigal', href = '/ariyin-kavithaigal'
        WHERE label = 'Kavithaigal'
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
          INSERT INTO profile_links (label, href, sort_order, is_hidden)
          VALUES ('Binomial Names', '/binomial-names', ${maxRow[0].max_order + 1}, 0)
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
  return null;
}

export async function listProfileLinks() {
  await ensureInitialized();
  return sql`SELECT id, label, href, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links ORDER BY sort_order ASC, id ASC`;
}

export async function listVisibleProfileLinks() {
  await ensureInitialized();
  return sql`SELECT id, label, href, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links WHERE is_hidden = 0 ORDER BY sort_order ASC, id ASC`;
}

export async function getProfileLinkById(id) {
  await ensureInitialized();
  const rows = await sql`SELECT id, label, href, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

export async function getProfileLinkByLabel(label) {
  await ensureInitialized();
  const rows = await sql`SELECT id, label, href, sort_order AS "sortOrder", is_hidden AS "isHidden" FROM profile_links WHERE label = ${label} LIMIT 1`;
  return rows[0] || null;
}

export async function addProfileLink({ label, href }) {
  await ensureInitialized();
  const maxRow = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM profile_links`;
  const rows = await sql`
    INSERT INTO profile_links (label, href, sort_order, is_hidden)
    VALUES (${label}, ${href}, ${(maxRow[0]?.max_order || 0) + 1}, 0)
    RETURNING id, label, href, sort_order AS "sortOrder", is_hidden AS "isHidden"
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

  if (label === 'Binomial Names') {
    return sql`
      SELECT id, link_id AS "linkId", ''::text AS "imageUrl", youtube_url AS "youtubeUrl",
             markdown_text AS "markdownText", entry_name AS "kavithaiFrom", sort_order AS "sortOrder"
      FROM binomial_names
      WHERE link_id = ${linkId}
      ORDER BY sort_order ASC, id ASC
    `;
  }

  if (label === 'Ariyin Kavithaigal' || label === 'Kavithaigal') {
    return sql`
      SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
             markdown_text AS "markdownText", kavithai_name AS "kavithaiFrom", sort_order AS "sortOrder"
      FROM ariyin_kavithaigal
      WHERE link_id = ${linkId}
      ORDER BY sort_order ASC, id ASC
    `;
  }

  return [];
}

export async function getLinkItemById(id) {
  await ensureInitialized();
  const kav = await sql`
    SELECT id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
           markdown_text AS "markdownText", kavithai_name AS "kavithaiFrom", sort_order AS "sortOrder"
    FROM ariyin_kavithaigal
    WHERE id = ${id}
    LIMIT 1
  `;
  if (kav[0]) return kav[0];

  const bio = await sql`
    SELECT id, link_id AS "linkId", ''::text AS "imageUrl", youtube_url AS "youtubeUrl",
           markdown_text AS "markdownText", entry_name AS "kavithaiFrom", sort_order AS "sortOrder"
    FROM binomial_names
    WHERE id = ${id}
    LIMIT 1
  `;
  return bio[0] || null;
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

export async function addLinkItem({ linkId, imageUrl, markdownText, kavithaiFrom }) {
  await ensureInitialized();
  const maxRow = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM ariyin_kavithaigal WHERE link_id = ${linkId}`;
  const rows = await sql`
    INSERT INTO ariyin_kavithaigal (link_id, image_url, markdown_text, kavithai_name, sort_order)
    VALUES (${linkId}, ${imageUrl || ''}, ${markdownText || ''}, ${kavithaiFrom || ''}, ${(maxRow[0]?.max_order || 0) + 1})
    RETURNING id, link_id AS "linkId", image_url AS "imageUrl", ''::text AS "youtubeUrl",
              markdown_text AS "markdownText", kavithai_name AS "kavithaiFrom", sort_order AS "sortOrder"
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
              markdown_text AS "markdownText", entry_name AS "kavithaiFrom", sort_order AS "sortOrder"
  `;
  return rows[0] || null;
}

export async function updateLinkItem({ id, linkId, imageUrl, youtubeUrl, markdownText, kavithaiFrom }) {
  await ensureInitialized();
  const label = Number.isInteger(Number(linkId)) ? await getSectionLabel(Number(linkId)) : '';

  if (label === 'Binomial Names') {
    await sql`UPDATE binomial_names SET youtube_url = ${youtubeUrl || ''}, markdown_text = ${markdownText || ''}, entry_name = ${kavithaiFrom || ''} WHERE id = ${id}`;
    return;
  }

  if (label === 'Ariyin Kavithaigal' || label === 'Kavithaigal') {
    await sql`UPDATE ariyin_kavithaigal SET image_url = ${imageUrl || ''}, markdown_text = ${markdownText || ''}, kavithai_name = ${kavithaiFrom || ''} WHERE id = ${id}`;
    return;
  }

  const fallback = await resolveItemTableById(id);
  if (fallback?.table === 'binomial_names') {
    await sql`UPDATE binomial_names SET youtube_url = ${youtubeUrl || ''}, markdown_text = ${markdownText || ''}, entry_name = ${kavithaiFrom || ''} WHERE id = ${id}`;
  } else if (fallback?.table === 'ariyin_kavithaigal') {
    await sql`UPDATE ariyin_kavithaigal SET image_url = ${imageUrl || ''}, markdown_text = ${markdownText || ''}, kavithai_name = ${kavithaiFrom || ''} WHERE id = ${id}`;
  }
}

export async function deleteLinkItem(id, linkId) {
  await ensureInitialized();
  const label = Number.isInteger(Number(linkId)) ? await getSectionLabel(Number(linkId)) : '';

  if (label === 'Binomial Names') {
    await sql`DELETE FROM binomial_names WHERE id = ${id}`;
    return;
  }

  if (label === 'Ariyin Kavithaigal' || label === 'Kavithaigal') {
    await sql`DELETE FROM ariyin_kavithaigal WHERE id = ${id}`;
    return;
  }

  const fallback = await resolveItemTableById(id);
  if (fallback?.table === 'binomial_names') {
    await sql`DELETE FROM binomial_names WHERE id = ${id}`;
  } else if (fallback?.table === 'ariyin_kavithaigal') {
    await sql`DELETE FROM ariyin_kavithaigal WHERE id = ${id}`;
  }
}
