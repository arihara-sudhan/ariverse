import '../src/styles.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { toPublicStorageUrl } from '../lib/storage';

const SITE_TITLE = 'AriVerse';
const SITE_IMAGE = toPublicStorageUrl('assets/hero.png');
const IS_INSPECTABLE = String(process.env.NEXT_PUBLIC_INSPECTABLE ?? '0').trim() !== '0';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const pathname = String(router.pathname || '');
  const isNoIndexRoute = pathname.startsWith('/admin');
  const [routeLoadingLabel, setRouteLoadingLabel] = useState('');
  const [routeLoadingMeta, setRouteLoadingMeta] = useState(null);

  useEffect(() => {
    const handleRouteStart = (url) => {
      const nextUrl = String(url || '');
      if (nextUrl.startsWith('/arichuvadi')) {
        setRouteLoadingLabel('ARICHUVADI');
        setRouteLoadingMeta(null);
        return;
      }

      if (nextUrl.startsWith('/projects/')) {
        let loaderMeta = null;
        if (typeof window !== 'undefined') {
          try {
            const raw = window.sessionStorage.getItem('ariverse:route-loader');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && parsed.type === 'project') {
                loaderMeta = {
                  type: 'project',
                  title: String(parsed.title || 'Project').trim() || 'Project',
                  imageUrl: String(parsed.imageUrl || '').trim(),
                };
              }
            }
          } catch (_error) {
            loaderMeta = null;
          }
        }
        setRouteLoadingLabel('PROJECT');
        setRouteLoadingMeta(loaderMeta);
      }
    };

    const handleRouteDone = () => {
      setRouteLoadingLabel('');
      setRouteLoadingMeta(null);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem('ariverse:route-loader');
        } catch (_error) {
          // ignore storage cleanup failures
        }
      }
    };

    router.events.on('routeChangeStart', handleRouteStart);
    router.events.on('routeChangeComplete', handleRouteDone);
    router.events.on('routeChangeError', handleRouteDone);

    return () => {
      router.events.off('routeChangeStart', handleRouteStart);
      router.events.off('routeChangeComplete', handleRouteDone);
      router.events.off('routeChangeError', handleRouteDone);
    };
  }, [router.events]);

  useEffect(() => {
    if (IS_INSPECTABLE) {
      return undefined;
    }

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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{SITE_TITLE}</title>
        <meta
          name="robots"
          content={isNoIndexRoute ? 'noindex, nofollow' : 'index, follow'}
        />
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
      {routeLoadingLabel ? (
        <div className="route-loading-screen" aria-live="polite" aria-label={`Loading ${routeLoadingLabel}`}>
          {routeLoadingMeta?.type === 'project' ? (
            <div className="route-loading-project">
              {routeLoadingMeta.imageUrl ? (
                <img
                  className="route-loading-project__image"
                  src={routeLoadingMeta.imageUrl}
                  alt={routeLoadingMeta.title || 'Project image'}
                />
              ) : (
                <div className="route-loading-project__placeholder" aria-hidden="true">No Image</div>
              )}
              <div className="route-loading-project__title">{routeLoadingMeta.title}</div>
              <div className="route-loading-project__status" aria-hidden="true">
                <span className="route-loading-project__dot" />
                <span>Loading project</span>
              </div>
            </div>
          ) : (
            <div className="route-loading-screen__title">{routeLoadingLabel}</div>
          )}
        </div>
      ) : null}
      <Component {...pageProps} />
    </>
  );
}
