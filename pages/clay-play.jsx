import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import DiscussionThread from '../src/components/DiscussionThread';
import LikeButton from '../src/components/LikeButton';
import { getProfileLinkByLabel, getSectionHero, listClayPlayEntryReactions, listContentComments, listLinkItems } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';
import { useRef, useState } from 'react';

const DEFAULT_CLAY_QUOTE = 'Clay can be dirt in the wrong hands, but clay can be art in the right hands.';

function normalizeCommentRow(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ''),
  };
}

export async function getStaticProps() {
  const clayLink = await getProfileLinkByLabel('Clay Play');
  if (!clayLink) {
    return {
      props: { entries: [], hero: { heading: 'Clay Play', imageUrl: '' }, initialCommentsByEntry: {} },
      revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
    };
  }

  const entries = (await listLinkItems(clayLink.id)).filter(
    (item) => String(item.kavithaiFrom || '').trim() && String(item.markdownText || '').trim(),
  );
  const hero = await getSectionHero(clayLink.id, 'Clay Play');
  const reactions = await listClayPlayEntryReactions(entries.map((entry) => entry.id));

  const commentsRows = await Promise.all(
    entries.map(async (entry) => ({
      entryId: entry.id,
      comments: await listContentComments({ sectionKey: 'clay-play', entryId: entry.id }),
    })),
  );
  const initialCommentsByEntry = commentsRows.reduce((acc, row) => {
    acc[row.entryId] = Array.isArray(row.comments) ? row.comments.map(normalizeCommentRow) : [];
    return acc;
  }, {});

  return {
    props: {
      entries,
      hero,
      likesByEntry: reactions,
      initialCommentsByEntry,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function ClayPlayPage({ entries, hero, likesByEntry, initialCommentsByEntry }) {
  const imageMetricsRef = useRef({});
  const [galleryHeightByEntry, setGalleryHeightByEntry] = useState({});
  const heroQuote = String(hero?.quote || '').trim() || DEFAULT_CLAY_QUOTE;

  const handleClayImageLoad = (entryId, index, event) => {
    const img = event.currentTarget;
    const width = img.clientWidth;
    if (!width || !img.naturalWidth || !img.naturalHeight) return;

    if (!imageMetricsRef.current[entryId]) {
      imageMetricsRef.current[entryId] = {};
    }

    imageMetricsRef.current[entryId][index] = {
      renderedHeight: (width * img.naturalHeight) / img.naturalWidth,
    };

    const renderedHeights = Object.values(imageMetricsRef.current[entryId]).map(
      (metric) => metric.renderedHeight,
    );
    if (renderedHeights.length === 0) return;

    const minRenderedHeight = Math.floor(Math.min(...renderedHeights));
    setGalleryHeightByEntry((current) => {
      if (current[entryId] === minRenderedHeight) return current;
      return { ...current, [entryId]: minRenderedHeight };
    });
  };

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="clay-play-title">
          <SectionHero
            heading={hero?.heading}
            description={hero?.description}
            imageUrl={hero?.imageUrl}
            fallbackHeading="Clay Play"
          >
            <p className="clay-play-quote">"{heroQuote}"</p>
          </SectionHero>
          <h1 id="clay-play-title" style={{ display: 'none' }}>Clay Play</h1>
          {entries.length === 0 ? <p className="contact-note">No clay play write-ups yet.</p> : null}

          <div className="clay-play-list">
            {entries.map((entry, entryIndex) => (
              <article key={entry.id} className="clay-play-entry">
                <h2>{`${entryIndex + 1}. ${entry.kavithaiFrom}`}</h2>
                {(entry.markdownText || '')
                  .split('\n')
                  .filter((line) => line.trim())
                  .map((line, idx) => (
                    <p key={`${entry.id}-${idx}`}>{line}</p>
                  ))}
                {(Array.isArray(entry.imageUrls) ? entry.imageUrls : []).length > 0 ? (
                  <div className="clay-play-gallery">
                    {(Array.isArray(entry.imageUrls) ? entry.imageUrls : []).map((url, index) => (
                      <a
                        key={`${entry.id}-${url}-${index}`}
                        className="clay-play-image-link"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${entry.kavithaiFrom || 'Clay Play'} image ${index + 1}`}
                        style={
                          galleryHeightByEntry[entry.id]
                            ? { height: `${galleryHeightByEntry[entry.id]}px` }
                            : undefined
                        }
                      >
                        <img
                          className="clay-play-image"
                          src={url}
                          alt={`${entry.kavithaiFrom || 'Clay Play image'} ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          onLoad={(event) => handleClayImageLoad(entry.id, index, event)}
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
                <div className="clay-play-reactions">
                  <LikeButton
                    endpoint="/api/clay-play/reactions"
                    entryId={entry.id}
                    initialCount={likesByEntry?.[entry.id]?.likesCount || 0}
                    storageNamespace="clay-play"
                    className="clay-play-like"
                  />
                </div>
                <DiscussionThread
                  title="Comments"
                  endpoint="/api/content/comments"
                  itemId={entry.id}
                  itemIdField="entryId"
                  extraPayload={{ section: 'clay-play' }}
                  initialComments={initialCommentsByEntry?.[entry.id] || []}
                />
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
