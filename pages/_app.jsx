import '../src/styles.css';
import Head from 'next/head';
import { useEffect } from 'react';

const SITE_TITLE = 'AriVerse';
const SITE_IMAGE = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/ari.webp';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const isDevtoolsShortcut = (event) => {
      const key = String(event.key || '').toLowerCase();
      return (
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (event.ctrlKey && key === 'u') ||
        (event.ctrlKey && key === 's') ||
        (event.metaKey && event.altKey && key === 'i')
      );
    };

    const blockContextMenu = (event) => {
      event.preventDefault();
    };

    const blockDrag = (event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement || target instanceof HTMLAnchorElement) {
        event.preventDefault();
      }
    };

    const blockSelect = (event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement) {
        event.preventDefault();
      }
    };

    const blockKeys = (event) => {
      if (isDevtoolsShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', blockContextMenu, true);
    document.addEventListener('dragstart', blockDrag, true);
    document.addEventListener('selectstart', blockSelect, true);
    document.addEventListener('keydown', blockKeys, true);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu, true);
      document.removeEventListener('dragstart', blockDrag, true);
      document.removeEventListener('selectstart', blockSelect, true);
      document.removeEventListener('keydown', blockKeys, true);
    };
  }, []);

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
