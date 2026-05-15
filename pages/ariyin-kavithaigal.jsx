import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { listKavithaiEntries } from '../lib/adminData';

export async function getServerSideProps({ query }) {
  const poems = await listKavithaiEntries();
  const showAll = query?.view === 'all';

  if (poems.length === 0) {
    return { props: { poems: [], selectedPoem: null, selectedIndex: -1, showAll } };
  }

  const requestedId = Number(query?.id);
  const requestedPoem = Number.isInteger(requestedId)
    ? poems.find((poem) => poem.id === requestedId)
    : null;

  const selectedPoem =
    requestedPoem || poems[Math.floor(Math.random() * poems.length)] || poems[0];
  const selectedIndex = poems.findIndex((poem) => poem.id === selectedPoem?.id);

  return {
    props: {
      poems,
      selectedPoem,
      selectedIndex,
      showAll,
    },
  };
}

export default function AriyinKavithaigalPage({ poems, selectedPoem, selectedIndex, showAll }) {
  const panelRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const [hidePoemNavIcons, setHidePoemNavIcons] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (showAll || !selectedPoem) return undefined;
    setHidePoemNavIcons(false);
    lastScrollTopRef.current = 0;

    const onScroll = () => {
      const isMobileView = window.matchMedia('(max-width: 860px)').matches;
      const scrollTop = isMobileView
        ? window.scrollY || window.pageYOffset || 0
        : (panel?.scrollTop || 0);
      const maxScroll = isMobileView
        ? (document.documentElement.scrollHeight - window.innerHeight)
        : ((panel?.scrollHeight || 0) - (panel?.clientHeight || 0));
      const scrollRatio = maxScroll > 0 ? scrollTop / maxScroll : 0;
      const isScrollingUp = scrollTop < lastScrollTopRef.current;
      const hideThreshold = isMobileView ? 0.05 : 0.01;

      if (isScrollingUp) {
        setHidePoemNavIcons(false);
      } else if (scrollRatio >= hideThreshold) {
        setHidePoemNavIcons(true);
      } else {
        setHidePoemNavIcons(false);
      }

      lastScrollTopRef.current = scrollTop;
    };

    onScroll();
    if (window.matchMedia('(max-width: 860px)').matches) {
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    if (panel) {
      panel.addEventListener('scroll', onScroll, { passive: true });
      return () => panel.removeEventListener('scroll', onScroll);
    }

    return undefined;
  }, [showAll, selectedPoem]);

  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < poems.length - 1;
  const prevPoem = hasPrev ? poems[selectedIndex - 1] : null;
  const nextPoem = hasNext ? poems[selectedIndex + 1] : null;
  const allToggleHref = showAll
    ? (selectedPoem ? `/ariyin-kavithaigal?id=${selectedPoem.id}` : '/ariyin-kavithaigal')
    : `/ariyin-kavithaigal?view=all${selectedPoem ? `&id=${selectedPoem.id}` : ''}`;

  return (
    <main className="kavithai-stage">
      {showAll ? (
        <>
          <nav className="kavithai-top-nav" aria-label="Poem navigation">
            <Link href="/" aria-label="Home">
              <span className="material-symbols-outlined" aria-hidden="true">home</span>
            </Link>
            <Link href={allToggleHref} aria-label="All poems">
              <span className="material-symbols-outlined" aria-hidden="true">list</span>
            </Link>
          </nav>
          <section className="kavithai-all-list tamil-text" lang="ta">
            {poems.map((poem, index) => (
              <Link key={poem.id} href={`/ariyin-kavithaigal?id=${poem.id}`}>
                {index + 1}. {poem.kavithaiName}
              </Link>
            ))}
          </section>
        </>
      ) : selectedPoem ? (
        <>
          <section className="kavithai-media">
            {selectedPoem.imageUrl ? (
              <img className="kavithai-hero" src={selectedPoem.imageUrl} alt={selectedPoem.kavithaiName} />
            ) : (
              <div className="kavithai-media-empty" />
            )}
            <nav
              className={`kavithai-top-nav${hidePoemNavIcons ? ' is-hidden' : ''}`}
              aria-label="Poem navigation"
            >
              <Link href="/" aria-label="Home">
                <span className="material-symbols-outlined" aria-hidden="true">home</span>
              </Link>
              <Link href={allToggleHref} aria-label="All poems">
                <span className="material-symbols-outlined" aria-hidden="true">list</span>
              </Link>
              {hasPrev ? (
                <Link href={`/ariyin-kavithaigal?id=${prevPoem.id}`} aria-label="Previous poem">
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                </Link>
              ) : null}
              {hasNext ? (
                <Link href={`/ariyin-kavithaigal?id=${nextPoem.id}`} aria-label="Next poem">
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </Link>
              ) : null}
            </nav>
          </section>
          <section ref={panelRef} className="kavithai-panel">
            <h1 className="kavithai-title tamil-text" lang="ta">
              {`${selectedIndex + 1}. ${selectedPoem.kavithaiName}`}
            </h1>
            <div className="kavithai-markdown tamil-text" lang="ta">
              <ReactMarkdown>{(selectedPoem.markdownText || '').replace(/\n/g, '  \n')}</ReactMarkdown>
            </div>
          </section>
        </>
      ) : (
        <section className="kavithai-panel">
          <p className="contact-note">No poems yet.</p>
        </section>
      )}
    </main>
  );
}

