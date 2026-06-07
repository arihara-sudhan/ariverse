import { listProjectEntries } from '../lib/adminData';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ariverse.in').replace(/\/+$/, '');

const STATIC_ROUTES = [
  '/',
  '/ai-with-ari',
  '/ari-career',
  '/ari-read-books',
  '/ari-resume',
  '/aris-books',
  '/aris-shelf',
  '/aris-xperiments',
  '/ariyin-kavithaigal',
  '/binomial-names',
  '/book-reviews',
  '/clay-play',
  '/for-ai',
  '/guest-lectures',
  '/mini-projects',
  '/projects',
  '/skillset',
];

function slugify(input) {
  return (
    String(input || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  );
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toAbsoluteUrl(pathname) {
  if (!pathname) return SITE_URL;
  if (/^https?:\/\//i.test(pathname)) return pathname;
  return `${SITE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function buildSitemapXml(urls) {
  const lastmod = new Date().toISOString();
  const entries = urls
    .map((url) => {
      const loc = escapeXml(toAbsoluteUrl(url));
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export async function getServerSideProps({ res }) {
  let projectRoutes = [];

  try {
    const projects = await listProjectEntries();
    projectRoutes = Array.isArray(projects)
      ? projects
          .map((project) => `/projects/${slugify(project.title)}`)
          .filter(Boolean)
      : [];
  } catch (_error) {
    projectRoutes = [];
  }

  const urls = Array.from(new Set([...STATIC_ROUTES, ...projectRoutes]));
  const xml = buildSitemapXml(urls);

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SitemapXml() {
  return null;
}
