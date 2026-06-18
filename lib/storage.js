const DEFAULT_SUPABASE_BASE_URL = 'https://qbghhenrxoupaykgnxyj.supabase.co';
const DEFAULT_SUPABASE_BUCKET = 'ariverse';

const PATH_ALIASES = new Map([
  ['assets/hero.png', 'assets/hero.webp'],
  ['assets/aalkaatti.png', 'assets/aalkaatti.webp'],
  ['assets/glory-lily.jpg', 'assets/glory-lily.webp'],
  ['assets/marsilea.png', 'assets/marsilea.webp'],
  ['homepage/feature-images/aalkaatti.webp', 'assets/aalkaatti.webp'],
  ['homepage/feature-images/lilu.webp', 'assets/glory-lily.webp'],
  ['homepage/feature-images/marsilea.webp', 'assets/marsilea.webp'],
  ['binomial-names/hero.webp', 'assets/hero-images-of-modules/ari-biota.webp'],
  ['clay-play/hero.webp', 'assets/hero-images-of-modules/ari-clay.webp'],
  ['experiments/hero.webp', 'assets/hero-images-of-modules/ari-experiments.webp'],
  ['guest-lectures/hero.webp', 'assets/hero-images-of-modules/ari-guestlecture.webp'],
  ['projects/hero.webp', 'assets/hero-images-of-modules/ari-projects.webp'],
  ['mini-projects/hero.webp', 'assets/hero-images-of-modules/ari-wins.webp'],
  ['books-read/hero.webp', 'assets/hero-images-of-modules/ari-reads.webp'],
  ['careers/hero.webp', 'assets/hero-images-of-modules/ari-career.webp'],
  ['ari-resume/hero.webp', 'assets/hero-images-of-modules/ari-resume.webp'],
  ['book-reviews/hero.webp', 'assets/hero-images-of-modules/ari-reviews.webp'],
  ['aris-books/hero.webp', 'assets/hero-images-of-modules/aris-books.webp'],
  ['aris-shelf/hero.webp', 'assets/hero-images-of-modules/ari-wins.webp'],
  ['ariyin-kavithaigal/hero.webp', 'assets/hero-images-of-modules/ari-kavithai.webp'],
  ['skillset/hero.webp', 'assets/hero-images-of-modules/aris-skills.webp'],
]);

const PREFIX_ALIASES = [
  ['aris-books/', 'ari-books/'],
  ['books-read/', 'ari-reads/'],
  ['careers/', 'ari-career/'],
  ['experiments/', 'ari-xperiments/'],
  ['guest-lectures/', 'ari-guest-lectures/'],
  ['mini-projects/', 'ari-mini-projects/'],
  ['projects/', 'ari-projects/'],
  ['aris-shelf/', 'ari-shelf/'],
];

function getSupabaseBaseUrl() {
  return (
    String(process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_BASE_URL)
      .trim()
      .replace(/\/+$/, '')
  );
}

function getSupabaseBucket() {
  return String(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || DEFAULT_SUPABASE_BUCKET).trim() || DEFAULT_SUPABASE_BUCKET;
}

function canonicalizeStoragePath(pathname) {
  let clean = toCleanPath(pathname);
  if (!clean) return '';

  const alias = PATH_ALIASES.get(clean);
  if (alias) clean = alias;

  for (const [from, to] of PREFIX_ALIASES) {
    if (clean.startsWith(from)) {
      clean = clean.replace(from, to);
      break;
    }
  }

  if (clean.startsWith('clay-play/')) {
    clean = clean.replace(/^clay-play\//, 'ari-clay/');
  }

  if (clean.startsWith('guest-lectures/')) {
    clean = clean.replace(/^guest-lectures\//, 'ari-guest-lectures/');
  }

  if (clean.startsWith('mini-projects/')) {
    clean = clean.replace(/^mini-projects\//, 'ari-mini-projects/');
  }

  if (clean.startsWith('projects/company-photos/')) {
    clean = clean.replace(/^projects\/company-photos\//, 'ari-projects/');
  }

  if (clean.startsWith('projects/company-logos/')) {
    clean = clean.replace(/^projects\/company-logos\//, 'ari-projects/');
  }

  if (clean.startsWith('careers/company-photos/')) {
    clean = clean.replace(/^careers\/company-photos\//, 'ari-career/');
  }

  if (clean.startsWith('careers/company-logos/')) {
    clean = clean.replace(/^careers\/company-logos\//, 'ari-career/');
  }

  if (clean.startsWith('aris-books/book-covers/')) {
    clean = clean.replace(/^aris-books\/book-covers\//, 'ari-books/');
  }

  if (clean.startsWith('books-read/')) {
    clean = clean.replace(/^books-read\//, 'ari-reads/');
  }

  if (clean.startsWith('experiments/')) {
    clean = clean.replace(/^experiments\//, 'ari-xperiments/');
  }

  if (clean.startsWith('aris-shelf/')) {
    clean = clean.replace(/^aris-shelf\//, 'ari-shelf/');
  }

  if (clean.startsWith('ari-mini-projects/')) {
    clean = clean.replace(/\.(png|jpe?g)$/i, '.webp');
  }

  if (/\.(png|jpe?g)$/i.test(clean)) {
    clean = clean.replace(/\.(png|jpe?g)$/i, '.webp');
  }

  return clean;
}

function normalizeSupabasePublicUrl(url) {
  const input = String(url || '').trim();
  if (!input) return '';

  try {
    const parsed = new URL(input);
    const bucket = getSupabaseBucket();
    const publicPrefix = `/storage/v1/object/public/${bucket}/`;
    if (parsed.pathname.startsWith(publicPrefix)) {
      const storagePath = parsed.pathname.slice(publicPrefix.length);
      const nextPath = canonicalizeStoragePath(storagePath);
      if (nextPath) {
        parsed.pathname = `${publicPrefix}${nextPath}`;
      }
    }
    return parsed.toString();
  } catch (_error) {
    return input;
  }
}

function toCleanPath(value) {
  const input = String(value || '').trim();
  if (!input) return '';

  const stripped = input.split('?')[0].split('#')[0];
  const withoutLeadingSlash = stripped.replace(/^\/+/, '');
  if (!withoutLeadingSlash) return '';

  const segments = withoutLeadingSlash.split('/').filter(Boolean);
  return segments
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch (_error) {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
}

function isLegacyBlobUrl(value) {
  const input = String(value || '').trim();
  return /https?:\/\/[^/]*blob\.vercel-storage\.com\//i.test(input);
}

function buildSupabasePublicUrl(pathname) {
  const baseUrl = getSupabaseBaseUrl();
  const bucket = getSupabaseBucket();
  const cleanPath = canonicalizeStoragePath(pathname);
  if (!baseUrl || !cleanPath) return '';
  return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

export function toPublicStorageUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';

  if (isLegacyBlobUrl(input)) {
    try {
      const parsed = new URL(input);
      return buildSupabasePublicUrl(parsed.pathname);
    } catch (_error) {
      return '';
    }
  }

  if (input.startsWith('/')) {
    return buildSupabasePublicUrl(input);
  }

  if (/^https?:\/\//i.test(input)) {
    try {
      const parsed = new URL(input);
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    } catch (_error) {
      return input;
    }
  }

  return buildSupabasePublicUrl(input);
}

export function normalizeStorageValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeStorageValue(item));
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = normalizeStorageValue(entry);
    }
    return out;
  }

  if (typeof value === 'string') {
    const input = value.trim();
    if (!input) return '';
    if (isLegacyBlobUrl(input) || input.startsWith('/')) {
      return toPublicStorageUrl(input);
    }
    if (input.includes('blob.vercel-storage.com')) {
      return input.replace(/https?:\/\/[^/]*blob\.vercel-storage\.com\/[^\s'"`]+/gi, (match) => toPublicStorageUrl(match));
    }
    if (/^https?:\/\//i.test(input)) {
      return normalizeSupabasePublicUrl(input);
    }
    return input;
  }

  return value;
}

export function getPublicStorageBucket() {
  return getSupabaseBucket();
}

export const HOME_HERO_IMAGE_URL = toPublicStorageUrl('assets/hero.webp');
