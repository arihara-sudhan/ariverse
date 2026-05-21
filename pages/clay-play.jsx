import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero, listLinkItems } from '../lib/adminData';
import { listClayPlayEntryReactions } from '../lib/adminData';
import { useEffect, useRef, useState } from 'react';

const DEFAULT_CLAY_QUOTE = 'Clay can be dirt in the wrong hands, but clay can be art in the right hands.';

export async function getServerSideProps() {
  const clayLink = await getProfileLinkByLabel('Clay Play');
  if (!clayLink) {
    return { props: { entries: [], hero: { heading: 'Clay Play', imageUrl: '' } } };
  }

  const entries = (await listLinkItems(clayLink.id)).filter(
    (item) => String(item.kavithaiFrom || '').trim() && String(item.markdownText || '').trim(),
  );
  const hero = await getSectionHero(clayLink.id, 'Clay Play');
  const reactionMap = await listClayPlayEntryReactions(entries.map((entry) => entry.id));

  return {
    props: {
      entries,
      hero,
      reactionMap,
    },
  };
}

export default function ClayPlayPage({ entries, hero, reactionMap }) {
  const imageMetricsRef = useRef({});
  const pendingActionsRef = useRef([]);
  const flushingRef = useRef(false);
  const [galleryHeightByEntry, setGalleryHeightByEntry] = useState({});
  const [nameByEntry, setNameByEntry] = useState({});
  const [commentByEntry, setCommentByEntry] = useState({});
  const [likedByEntry, setLikedByEntry] = useState({});
  const [errorByEntry, setErrorByEntry] = useState({});
  const [reactionsByEntry, setReactionsByEntry] = useState(reactionMap || {});
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

  const flushQueuedActions = async ({ keepalive = false } = {}) => {
    if (flushingRef.current) return;
    const events = pendingActionsRef.current;
    if (!events || events.length === 0) return;

    flushingRef.current = true;
    pendingActionsRef.current = [];
    try {
      await fetch('/api/clay-play/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', events }),
        keepalive,
      });
    } catch (_error) {
      pendingActionsRef.current = [...events, ...pendingActionsRef.current];
    } finally {
      flushingRef.current = false;
    }
  };

  useEffect(() => {
    const onPageHide = () => {
      flushQueuedActions({ keepalive: true });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushQueuedActions({ keepalive: true });
      }
    };

    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      flushQueuedActions({ keepalive: true });
    };
  }, []);

  const submitLike = async (entryId) => {
    if (likedByEntry[entryId]) return;
    const name = String(nameByEntry[entryId] || '').trim();
    setErrorByEntry((current) => ({ ...current, [entryId]: '' }));
    setReactionsByEntry((current) => {
      const existing = current[entryId] || { likesCount: 0, comments: [] };
      return {
        ...current,
        [entryId]: {
          ...existing,
          likesCount: (existing.likesCount || 0) + 1,
        },
      };
    });
    pendingActionsRef.current.push({
      action: 'like',
      entryId,
      name: name || '',
    });
    setLikedByEntry((current) => ({ ...current, [entryId]: true }));
  };

  const submitComment = async (entryId) => {
    const name = String(nameByEntry[entryId] || '').trim();
    const comment = String(commentByEntry[entryId] || '').trim();
    if (!comment) {
      setErrorByEntry((current) => ({ ...current, [entryId]: 'Please write a comment.' }));
      return;
    }

    setErrorByEntry((current) => ({ ...current, [entryId]: '' }));
    const tempComment = {
      id: `tmp-${Date.now()}-${Math.random()}`,
      name: name || 'anonymous',
      comment,
      createdAt: new Date().toISOString(),
    };
    setReactionsByEntry((current) => {
      const existing = current[entryId] || { likesCount: 0, comments: [] };
      return {
        ...current,
        [entryId]: {
          ...existing,
          comments: [tempComment, ...(existing.comments || [])],
        },
      };
    });
    pendingActionsRef.current.push({
      action: 'comment',
      entryId,
      name: name || '',
      comment,
    });
    setCommentByEntry((current) => ({ ...current, [entryId]: '' }));
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
                  <div className="clay-play-reaction-inline">
                    <button
                      type="button"
                      className="clay-heart-btn"
                      onClick={() => submitLike(entry.id)}
                      aria-pressed={Boolean(likedByEntry[entry.id])}
                      disabled={Boolean(likedByEntry[entry.id])}
                      aria-label="Like this post"
                      title="Like"
                    >
                      {likedByEntry[entry.id] ? '♥' : '♡'}
                    </button>
                    <span className="clay-like-count">{reactionsByEntry?.[entry.id]?.likesCount || 0}</span>
                    <input
                      className="clay-name-input"
                      id={`clay-name-${entry.id}`}
                      type="text"
                      value={nameByEntry[entry.id] || ''}
                      onChange={(event) => setNameByEntry((current) => ({ ...current, [entry.id]: event.target.value }))}
                      placeholder="name (optional)"
                    />
                    <input
                      className="clay-comment-input"
                      id={`clay-comment-${entry.id}`}
                      type="text"
                      value={commentByEntry[entry.id] || ''}
                      onChange={(event) => setCommentByEntry((current) => ({ ...current, [entry.id]: event.target.value }))}
                      placeholder="write a comment"
                    />
                    <button
                      type="button"
                      className="clay-comment-send"
                      onClick={() => submitComment(entry.id)}
                    >
                      Post
                    </button>
                  </div>
                  {errorByEntry[entry.id] ? <p className="clay-play-reaction-error">{errorByEntry[entry.id]}</p> : null}
                  <div className="clay-play-comments">
                    {(reactionsByEntry?.[entry.id]?.comments || []).map((item) => (
                      <p key={`${entry.id}-${item.id}`}>
                        <strong>{item.name}:</strong> {item.comment}
                      </p>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
