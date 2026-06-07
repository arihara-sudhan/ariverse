const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ariverse.in').replace(/\/+$/, '');

export async function getServerSideProps({ res }) {
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(robots);
  res.end();

  return { props: {} };
}

export default function RobotsTxt() {
  return null;
}
