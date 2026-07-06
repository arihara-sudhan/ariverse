import Head from 'next/head';
import { ArichuvadiAboutView } from '../../src/components/ArichuvadiBlog';
import { ARICHUVADI_SITE_LOGO_URL } from '../../lib/arichuvadiAssets';

export default function ArichuvadiAboutPage() {
  return (
    <>
      <Head>
        <title>அரிச்சுவடி | பற்றி</title>
        <meta name="description" content="அரிச்சுவடியைப் பற்றி." />
        <link rel="icon" href={ARICHUVADI_SITE_LOGO_URL} />
        <link rel="apple-touch-icon" href={ARICHUVADI_SITE_LOGO_URL} />
      </Head>
      <ArichuvadiAboutView />
    </>
  );
}
