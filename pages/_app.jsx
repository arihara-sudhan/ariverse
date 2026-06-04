import '../src/styles.css';
import Head from 'next/head';

const SITE_TITLE = 'AriVerse';
const SITE_IMAGE = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/ari.webp';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>{SITE_TITLE}</title>
        <meta name="application-name" content={SITE_TITLE} />
        <meta name="apple-mobile-web-app-title" content={SITE_TITLE} />
        <meta name="theme-color" content="#111111" />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:image" content={SITE_IMAGE} />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:image" content={SITE_IMAGE} />
        <link rel="icon" href={SITE_IMAGE} />
        <link rel="apple-touch-icon" href={SITE_IMAGE} />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
