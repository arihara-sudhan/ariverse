import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import LikeButton from '../src/components/LikeButton';
import DiscussionThread from '../src/components/DiscussionThread';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import {
  getKavithaiEntryById,
  getProfileLinkByHref,
  getProfileLinkByLabel,
  getSectionHero,
  listContentComments,
  listContentEntryReactions,
  listKavithaiEntries,
  listKavithaiSummaries,
} from '../lib/adminData';

export async function getServerSideProps({ query }) {
  const requestedId = Number(query?.id);
  const showAll = query?.view === 'all';
  const poems = showAll || Number.isInteger(requestedId) ? await listKavithaiSummaries() : await listKavithaiEntries();
  const likesByEntry = await listContentEntryReactions({
    sectionKey: 'kavithaigal',
    entryIds: poems.map((poem) => poem.id),
  });
  const selectedPoem = Number.isInteger(requestedId) ? await getKavithaiEntryById(requestedId) : null;
  const selectedIndex = selectedPoem ? poems.findIndex((poem) => poem.id === selectedPoem.id) : -1;
  const initialComments = selectedPoem
    ? await listContentComments({ sectionKey: 'kavithaigal', entryId: selectedPoem.id })
    : [];
  const hero = selectedPoem || showAll
    ? null
    : await (async () => {
        const kavithaiLink =
          (await getProfileLinkByHref('/ariyin-kavithaigal')) ||
          (await getProfileLinkByLabel('அரியின் கவிதைகள்')) ||
          (await getProfileLinkByLabel('Ariyin Kavithaigal')) ||
          (await getProfileLinkByLabel('Kavithaigal'));
        return kavithaiLink
          ? getSectionHero(kavithaiLink.id, 'அரியின் கவிதைகள்')
          : { heading: 'அரியின் கவிதைகள்', description: '', imageUrl: '' };
      })();

  return {
    props: {
      poems,
      hero,
      selectedPoem,
      selectedIndex,
      initialComments,
      showAll,
      likesByEntry,
    },
  };
}

export default function AriyinKavithaigalPage({ poems, hero, selectedPoem, selectedIndex, initialComments, showAll, likesByEntry }) {
  const panelRef = useRef(null);
  const [hideTopNav, setHideTopNav] = useState(false);
  const hasPoems = Array.isArray(poems) && poems.length > 0;
  const headingText = String(hero?.heading || 'அரியின் கவிதைகள்').trim();
  const headingParts = headingText.split(/\s+/).filter(Boolean);
  const headingSmall = headingParts[0] || 'அரியின்';
  const headingBig = headingParts.slice(1).join(' ') || 'கவிதைகள்';

  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < poems.length - 1;
  const prevPoem = hasPrev ? poems[selectedIndex - 1] : null;
  const nextPoem = hasNext ? poems[selectedIndex + 1] : null;

  useEffect(() => {
    if (!selectedPoem) return;
    const panelEl = panelRef.current;

    const updateVisibility = () => {
      const panelScrollable = panelEl && panelEl.scrollHeight > panelEl.clientHeight + 4;
      let progress = 0;
      if (panelScrollable) {
        const maxScroll = Math.max(1, panelEl.scrollHeight - panelEl.clientHeight);
        progress = panelEl.scrollTop / maxScroll;
      } else if (typeof window !== 'undefined') {
        const doc = document.documentElement;
        const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
        progress = maxScroll > 1 ? window.scrollY / maxScroll : 0;
      }
      setHideTopNav(progress > 0.02);
    };

    updateVisibility();
    if (panelEl) panelEl.addEventListener('scroll', updateVisibility, { passive: true });
    if (typeof window !== 'undefined') window.addEventListener('scroll', updateVisibility, { passive: true });
    if (typeof window !== 'undefined') window.addEventListener('resize', updateVisibility);
    return () => {
      if (panelEl) panelEl.removeEventListener('scroll', updateVisibility);
      if (typeof window !== 'undefined') window.removeEventListener('scroll', updateVisibility);
      if (typeof window !== 'undefined') window.removeEventListener('resize', updateVisibility);
    };
  }, [selectedPoem]);

  if (selectedPoem) {
    return (
      <>
        <main className="kavithai-stage kavithai-detail-stage">
          <section className="kavithai-media">
            {selectedPoem.imageUrl ? (
              <img loading="lazy" decoding="async" className="kavithai-hero" src={selectedPoem.imageUrl} alt={selectedPoem.kavithaiName} />
            ) : (
              <div className="kavithai-media-empty" />
            )}
            <nav className={`kavithai-top-nav${hideTopNav ? ' is-hidden' : ''}`} aria-label="Poem navigation">
              <Link href="/ariyin-kavithaigal" aria-label="Home">
                <span className="material-symbols-outlined" aria-hidden="true">home</span>
              </Link>
              <Link href="/ariyin-kavithaigal?view=all" aria-label="All poems">
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
            <LikeButton
              endpoint="/api/content/reactions"
              entryId={selectedPoem.id}
              initialCount={likesByEntry?.[selectedPoem.id]?.likesCount || 0}
              storageNamespace="kavithaigal"
              className="kavithai-like"
            />
            <div className="ariyin-comments-block">
              <DiscussionThread
                title="கருத்துகள்"
                endpoint="/api/content/comments"
                itemId={selectedPoem.id}
                itemIdField="entryId"
                extraPayload={{ section: 'kavithaigal' }}
                initialComments={initialComments}
                namePlaceholder="பெயர் (விருப்பமானால்)"
                commentPlaceholder="உங்கள் எண்ணங்களை பகிரவும்"
                submitLabel="கருத்தை பதிவிடவும்"
              />
            </div>
          </section>
        </main>
      </>
    );
  }

  if (showAll) {
    return (
      <>
        <main className="kavithai-stage">
          <nav className="kavithai-top-nav" aria-label="Poem navigation">
            <Link href="/ariyin-kavithaigal" aria-label="Home">
              <span className="material-symbols-outlined" aria-hidden="true">home</span>
            </Link>
            <Link href="/ariyin-kavithaigal" aria-label="Grid view">
              <span className="material-symbols-outlined" aria-hidden="true">grid_view</span>
            </Link>
          </nav>
          <section className="kavithai-all-list tamil-text" lang="ta">
            {poems.map((poem, index) => (
              <Link key={poem.id} href={`/ariyin-kavithaigal?id=${poem.id}`}>
                {index + 1}. {poem.kavithaiName}
              </Link>
            ))}
          </section>
        </main>
      </>
    );
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="ariyin-kavithaigal-title">
          <SectionHero
            heading={hero?.heading}
            headingContent={(
              <span className="ariyin-hero-heading">
                <span className="ariyin-hero-small tamil-text" lang="ta">{headingSmall}</span>
                <span className="ariyin-hero-big tamil-text" lang="ta">{headingBig}</span>
              </span>
            )}
            description={hero?.description}
            imageUrl={hero?.imageUrl}
            fallbackHeading="அரியின் கவிதைகள்"
            descriptionAfterImageOnMobile
          />
          <h1 id="ariyin-kavithaigal-title" style={{ display: 'none' }}>அரியின் கவிதைகள்</h1>

          {!hasPoems ? (
            <p className="contact-note">No poems yet.</p>
          ) : (
            <div className="ariyin-poems-list">
              {poems.map((poem, index) => (
                <Link key={poem.id} href={`/ariyin-kavithaigal?id=${poem.id}`} className="ariyin-poem-entry-link">
                  <article className="ariyin-poem-entry tamil-text" lang="ta">
                    {poem.imageUrl ? (
                      <figure className="ariyin-poem-image-wrap">
                        <img loading="lazy" decoding="async" className="ariyin-poem-image" src={poem.imageUrl} alt={poem.kavithaiName || 'Poem image'} />
                      </figure>
                    ) : null}
                    <h2>{`${index + 1}. ${poem.kavithaiName}`}</h2>
                    <LikeButton
                      endpoint="/api/content/reactions"
                      entryId={poem.id}
                      initialCount={likesByEntry?.[poem.id]?.likesCount || 0}
                      storageNamespace="kavithaigal"
                      className="ariyin-poem-like"
                    />
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
