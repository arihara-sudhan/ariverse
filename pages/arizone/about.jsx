import Head from 'next/head';
import { AriZoneAboutView } from '../../src/components/AriZoneBlog';
import { ARIZONE_SITE_LOGO_URL } from '../../lib/arizoneAssets';

export default function AriZoneAboutPage() {
  return (
    <>
      <Head>
        <title>About | AriZone</title>
        <meta name="description" content="About AriZone." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
        <link rel="icon" href={ARIZONE_SITE_LOGO_URL} />
        <link rel="apple-touch-icon" href={ARIZONE_SITE_LOGO_URL} />
      </Head>
      <AriZoneAboutView />
    </>
  );
}
