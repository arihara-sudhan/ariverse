import Head from 'next/head';
import { ArichuvadiAboutView } from '../../src/components/ArichuvadiBlog';
import { ARICHUVADI_SITE_LOGO_URL } from '../../lib/arichuvadiAssets';

export default function ArichuvadiAboutPage() {
  return (
    <>
      <Head>
        <title>அரிச்சுவடி | பற்றி</title>
        <meta name="description" content="அரிச்சுவடியைப் பற்றி." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
        <link rel="icon" href={ARICHUVADI_SITE_LOGO_URL} />
        <link rel="apple-touch-icon" href={ARICHUVADI_SITE_LOGO_URL} />
      </Head>
      <ArichuvadiAboutView />
    </>
  );
}
