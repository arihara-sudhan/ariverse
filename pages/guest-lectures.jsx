import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import DiscussionThread from '../src/components/DiscussionThread';
import { getProfileLinkByLabel, getSectionHero, listContentComments, listLinkItems } from '../lib/adminData';
import { useRef, useState } from 'react';

const DEFAULT_GUEST_LECTURES_QUOTE =
  'Learning grows when ideas are shared with curiosity and care.';

export async function getServerSideProps() {
  const link = await getProfileLinkByLabel('Guest Lectures');
  if (!link) {
    return { props: { entries: [], hero: { heading: 'Guest Lectures', imageUrl: '' }, initialCommentsByEntry: {} } };
  }

  const entries = (await listLinkItems(link.id)).filter(
    (item) => String(item.kavithaiFrom || '').trim() && String(item.markdownText || '').trim(),
  );
  const hero = await getSectionHero(link.id, 'Guest Lectures');
  const commentsRows = await Promise.all(
    entries.map(async (entry) => ({
      entryId: entry.id,
      comments: await listContentComments({ sectionKey: 'guest-lectures', entryId: entry.id }),
    })),
  );
  const initialCommentsByEntry = commentsRows.reduce((acc, row) => {
    acc[row.entryId] = Array.isArray(row.comments) ? row.comments : [];
    return acc;
  }, {});

  return { props: { entries, hero, initialCommentsByEntry } };
}

export default function GuestLecturesPage({ entries, hero, initialCommentsByEntry }) {
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
                {(Array.isArray(entry.imageUrls) ? entry.imageUrls : []).length > 0 ? (
                  <div className="clay-play-gallery">
                    {(Array.isArray(entry.imageUrls) ? entry.imageUrls : []).map((url, index) => (
                      <a
                        key={`${entry.id}-${url}-${index}`}
                        className="clay-play-image-link"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${entry.kavithaiFrom || 'Guest lecture'} image ${index + 1}`}
                        style={
                          galleryHeightByEntry[entry.id]
                            ? { height: `${galleryHeightByEntry[entry.id]}px` }
                            : undefined
                        }
                      >
                        <img
                          className="clay-play-image"
                          src={url}
                          alt={`${entry.kavithaiFrom || 'Guest lecture image'} ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          onLoad={(event) => handleImageLoad(entry.id, index, event)}
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
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
