const SECTION_DEFINITIONS = [
  { key: 'ari-career', table: 'career_entries', publicPath: '/ari-career', labels: ['Career', 'Works', 'Experience'], hrefs: ['/ari-career'] },
  { key: 'ari-read-books', table: 'books_read_entries', publicPath: '/ari-read-books', labels: ['Books Read'], hrefs: ['/ari-read-books'] },
  { key: 'aris-books', table: 'aris_books_entries', publicPath: '/aris-books', labels: ['My Books', 'Books Written'], hrefs: ['/aris-books'] },
  { key: 'aris-shelf', table: 'shelf_entries', publicPath: '/aris-shelf', labels: ['Shelf'], hrefs: ['/aris-shelf'] },
  { key: 'binomial-names', table: 'binomial_names', publicPath: '/binomial-names', labels: ['Binomial Names'], hrefs: ['/binomial-names'] },
  { key: 'book-reviews', table: 'book_reviews_entries', publicPath: '/book-reviews', labels: ['Book Reviews'], hrefs: ['/book-reviews'] },
  { key: 'clay-play', table: 'clay_play_entries', publicPath: '/clay-play', labels: ['Clay Play'], hrefs: ['/clay-play'] },
  { key: 'guest-lectures', table: 'guest_lectures_entries', publicPath: '/guest-lectures', labels: ['Guest Lectures'], hrefs: ['/guest-lectures'] },
  {
    key: 'kavithaigal',
    table: 'ariyin_kavithaigal',
    publicPath: '/arichuvadi?category=kavithaigal',
    labels: ['My Poems', 'Ariyin Kavithaigal', 'Kavithaigal', 'அரியின் கவிதைகள்'],
    hrefs: ['/arichuvadi?category=kavithaigal', '/arichuvadi?category=Kavithaigal'],
  },
  { key: 'mini-projects', table: 'mini_projects_entries', publicPath: '/mini-projects', labels: ['Mini-Projects'], hrefs: ['/mini-projects'] },
  { key: 'projects', table: 'projects_entries', publicPath: '/projects', labels: ['Projects'], hrefs: ['/projects'] },
  { key: 'xperiments', table: 'experiments_entries', publicPath: '/aris-xperiments', labels: ['Experiments', 'Xperiements'], hrefs: ['/aris-xperiments', '/experiments'] },
  { key: 'arichuvadi', table: 'arichuvadi', publicPath: '/arichuvadi', labels: ['Arichuvadi', 'Arichuvadu', 'Arichuvadi (Blog)'], hrefs: ['/arichuvadi'] },
  { key: 'arizone', table: 'arizone', publicPath: '/arizone', labels: ['AriZone', 'AriZone (Blog)'], hrefs: ['/arizone'] },
  { key: 'skillset', table: 'skillset_entries', publicPath: '/skillset', labels: ['Skillset'], hrefs: ['/skillset'] },
  { key: 'resume', table: null, publicPath: '/ari-resume', labels: ['Resume'], hrefs: ['/ari-resume'] },
];

export const SECTION_REGISTRY = Object.freeze(
  Object.fromEntries(SECTION_DEFINITIONS.map((definition) => [definition.key, Object.freeze({ ...definition })])),
);

const SECTION_KEY_ALIASES = Object.freeze({
  career: 'ari-career',
  'books-read': 'ari-read-books',
  'my-books': 'aris-books',
  shelf: 'aris-shelf',
  experiments: 'xperiments',
});

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeHref(value) {
  return normalizeText(value).replace(/\/+$/, '') || '/';
}

function candidatesFor(value, property) {
  const normalized = property === 'href' ? normalizeHref(value) : normalizeText(value);
  if (!normalized) return [];
  return SECTION_DEFINITIONS
    .filter((definition) => (property === 'href' ? definition.hrefs : definition.labels).some((candidate) => (
      property === 'href' ? normalizeHref(candidate) === normalized : normalizeText(candidate) === normalized
    )))
    .map((definition) => definition.key);
}

export function normalizeSectionKey(value) {
  const normalized = normalizeText(value);
  if (SECTION_REGISTRY[normalized]) return normalized;
  return SECTION_KEY_ALIASES[normalized] || '';
}

export function getSectionDefinition(sectionKey) {
  return SECTION_REGISTRY[normalizeSectionKey(sectionKey)] || null;
}

export function sectionKeyForProfileLink(row = {}) {
  const explicit = normalizeSectionKey(row.sectionKey || row.section_key);
  if (explicit) return { status: 'matched', sectionKey: explicit, candidates: [explicit] };

  const candidates = new Set([
    ...candidatesFor(row.href, 'href'),
    ...candidatesFor(row.label, 'labels'),
  ]);
  if (candidates.size > 1) {
    return { status: 'ambiguous', sectionKey: '', candidates: [...candidates].sort() };
  }
  if (candidates.size === 1) {
    return { status: 'matched', sectionKey: [...candidates][0], candidates: [...candidates] };
  }
  return { status: 'unknown', sectionKey: '', candidates: [] };
}

export function sectionKeyForLabel(label) {
  const result = sectionKeyForProfileLink({ label });
  return result.status === 'matched' ? result.sectionKey : '';
}

export function sectionKeyForHref(href) {
  const result = sectionKeyForProfileLink({ href });
  return result.status === 'matched' ? result.sectionKey : '';
}

export function sectionTable(sectionKey) {
  return getSectionDefinition(sectionKey)?.table || null;
}

export function sectionPublicPath(sectionKey) {
  return getSectionDefinition(sectionKey)?.publicPath || '';
}
