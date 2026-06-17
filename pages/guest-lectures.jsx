import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import DiscussionThread from '../src/components/DiscussionThread';
import LikeButton from '../src/components/LikeButton';
import { getProfileLinkByLabel, getSectionHero, listContentComments, listContentEntryReactions, listLinkItems } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';
import { useRef, useState } from 'react';

const DEFAULT_GUEST_LECTURES_QUOTE =
  'Learning grows when ideas are shared with curiosity and care.';

function prioritizePosterImages(imageUrls) {
  const urls = Array.isArray(imageUrls) ? imageUrls.map((url) => String(url || '').trim()).filter(Boolean) : [];
  const posterUrls = urls.filter((url) => /poster/i.test(url));
  const otherUrls = urls.filter((url) => !/poster/i.test(url));
  return [...posterUrls, ...otherUrls];
}

function getGuestLectureImages(entry) {
  const primaryImage = String(entry?.imageUrl || '').trim();
  const galleryImages = Array.isArray(entry?.imageUrls) ? entry.imageUrls.map((url) => String(url || '').trim()).filter(Boolean) : [];
  return prioritizePosterImages(Array.from(new Set(primaryImage ? [primaryImage, ...galleryImages] : galleryImages)));
}

function chunkImages(imageUrls, chunkSize = 3) {
  const urls = Array.isArray(imageUrls) ? imageUrls : [];
  const chunks = [];

  for (let index = 0; index < urls.length; index += chunkSize) {
    chunks.push(urls.slice(index, index + chunkSize));
  }

  return chunks;
}

function normalizeCommentRow(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ''),
  };
}

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Guest Lectures');
  if (!link) {
    return {
      props: { entries: [], hero: { heading: 'Guest Lectures', imageUrl: '' }, initialCommentsByEntry: {} },
      revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
    };
  }

  const entries = (await listLinkItems(link.id)).filter(
    (item) => String(item.kavithaiFrom || '').trim() && String(item.markdownText || '').trim(),
  );
  const hero = await getSectionHero(link.id, 'Guest Lectures');
  const likesByEntry = await listContentEntryReactions({
    sectionKey: 'guest-lectures',
    entryIds: entries.map((entry) => entry.id),
  });
  const commentsRows = await Promise.all(
    entries.map(async (entry) => ({
      entryId: entry.id,
      comments: await listContentComments({ sectionKey: 'guest-lectures', entryId: entry.id }),
    })),
  );
  const initialCommentsByEntry = commentsRows.reduce((acc, row) => {
    acc[row.entryId] = Array.isArray(row.comments) ? row.comments.map(normalizeCommentRow) : [];
    return acc;
  }, {});

  return { props: { entries, hero, initialCommentsByEntry, likesByEntry }, revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS };
}

export default function GuestLecturesPage({ entries, hero, initialCommentsByEntry, likesByEntry }) {
  const imageMetricsRef = useRef({});
  const [galleryHeightByEntry, setGalleryHeightByEntry] = useState({});
  const heroQuote = String(hero?.quote || '').trim() || DEFAULT_GUEST_LECTURES_QUOTE;

  const handleImageLoad = (entryId, index, event) => {
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
        <section className="guest-lectures-page" aria-labelledby="guest-lectures-title">
          <SectionHero
            heading={hero?.heading}
            description={hero?.description}
            imageUrl={hero?.imageUrl}
            fallbackHeading="Guest Lectures"
          >
            <p className="clay-play-quote">"{heroQuote}"</p>
          </SectionHero>
          <h1 id="guest-lectures-title" style={{ display: 'none' }}>Guest Lectures</h1>
          {entries.length === 0 ? <p className="contact-note">No guest lecture write-ups yet.</p> : null}

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
                {getGuestLectureImages(entry).length > 0 ? (
                  <div className="guest-lectures-gallery">
                    {chunkImages(getGuestLectureImages(entry), 3).map((row, rowIndex) => (
                      <div key={`${entry.id}-row-${rowIndex}`} className="clay-play-gallery guest-lectures-gallery-row">
                        {row.map((url, index) => {
                          const imageIndex = rowIndex * 3 + index;

                          return (
                            <a
                              key={`${entry.id}-${url}-${imageIndex}`}
                              className="clay-play-image-link"
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${entry.kavithaiFrom || 'Guest lecture'} image ${imageIndex + 1}`}
                              style={
                                galleryHeightByEntry[entry.id]
                                  ? { height: `${galleryHeightByEntry[entry.id]}px` }
                                  : undefined
                              }
                            >
                              <img
                                className="clay-play-image"
                                src={url}
                                alt={`${entry.kavithaiFrom || 'Guest lecture image'} ${imageIndex + 1}`}
                                loading="lazy"
                                decoding="async"
                                onLoad={(event) => handleImageLoad(entry.id, imageIndex, event)}
                              />
                            </a>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : null}
                <LikeButton
                  endpoint="/api/content/reactions"
                  entryId={entry.id}
                  initialCount={likesByEntry?.[entry.id]?.likesCount || 0}
                  storageNamespace="guest-lectures"
                  className="guest-lectures-like"
                />
                <DiscussionThread
                  title="Were you there?"
                  endpoint="/api/content/comments"
                  itemId={entry.id}
                  itemIdField="entryId"
                  extraPayload={{ section: 'guest-lectures' }}
                  initialComments={initialCommentsByEntry?.[entry.id] || []}
                  namePlaceholder="Name"
                  commentPlaceholder="How was your experience under Ari's session?"
                />
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
