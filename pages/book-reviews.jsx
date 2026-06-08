import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import LikeButton from '../src/components/LikeButton';
import { useMemo, useState } from 'react';
import { getProfileLinkByLabel, getSectionHero, listBookReviewEntryReactions, listLinkItems } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';
import { isInstagramUrl } from '../lib/security';

const DEFAULT_BOOK_REVIEW_QUOTE = 'A good book stays with you long after the final page.';

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Book Reviews');
  if (!link) {
    return {
      props: { entries: [], hero: { heading: 'Book Reviews', imageUrl: '' }, likesByEntry: {} },
      revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
    };
  }

  const entries = (await listLinkItems(link.id)).filter(
    (item) => String(item.kavithaiFrom || '').trim() && String(item.markdownText || '').trim(),
  );
  const hero = await getSectionHero(link.id, 'Book Reviews');
  const reactions = await listBookReviewEntryReactions(entries.map((entry) => entry.id));

  return {
    props: {
      entries,
      hero,
      likesByEntry: reactions,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

function toParagraphs(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getBookReviewLinkLabel(url) {
  return isInstagramUrl(url) ? 'Open Instagram post for' : 'Open YouTube video for';
}

function renderBookReviewLinkIcon(url) {
  if (isInstagramUrl(url)) {
    return (
      <svg className="book-review-youtube-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8zm5.35-2.15a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg className="book-review-youtube-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M21.6 7.4c-.2-.8-.8-1.4-1.6-1.6C18.6 5.5 12 5.5 12 5.5s-6.6 0-8 .3c-.8.2-1.4.8-1.6 1.6C2 8.8 2 12 2 12s0 3.2.4 4.6c.2.8.8 1.4 1.6 1.6 1.4.3 8 .3 8 .3s6.6 0 8-.3c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.6.4-4.6s0-3.2-.4-4.6Z"
        fill="#ff0000"
      />
      <path d="M10 15.3V8.7L15.8 12 10 15.3Z" fill="#fff" />
    </svg>
  );
}

export default function BookReviewsPage({ entries, hero, likesByEntry }) {
  const heroQuote = String(hero?.quote || '').trim() || DEFAULT_BOOK_REVIEW_QUOTE;
  const [activeCategory, setActiveCategory] = useState('');

  const categoryCounts = useMemo(() => {
    const counts = { TAMIL: 0, ENGLISH: 0 };
    for (const entry of Array.isArray(entries) ? entries : []) {
      const category = String(entry?.category || 'TAMIL').trim().toUpperCase() === 'ENGLISH' ? 'ENGLISH' : 'TAMIL';
      counts[category] += 1;
    }
    return counts;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!activeCategory) return Array.isArray(entries) ? entries : [];
    return (Array.isArray(entries) ? entries : []).filter((entry) => {
      const category = String(entry?.category || 'TAMIL').trim().toUpperCase() === 'ENGLISH' ? 'ENGLISH' : 'TAMIL';
      return category === activeCategory;
    });
  }, [activeCategory, entries]);

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="book-reviews-page" aria-labelledby="book-reviews-title">
          <SectionHero
            heading={hero?.heading}
            description={hero?.description}
            imageUrl={hero?.imageUrl}
            fallbackHeading="Book Reviews"
          >
            <p className="clay-play-quote">"{heroQuote}"</p>
          </SectionHero>
          <h1 id="book-reviews-title" style={{ display: 'none' }}>Book Reviews</h1>
          <div className="book-reviews-filters" aria-label="Book review filters">
            <button
              type="button"
              className={`book-reviews-filter-btn${activeCategory === 'TAMIL' ? ' is-active' : ''}`}
              onClick={() => setActiveCategory((prev) => (prev === 'TAMIL' ? '' : 'TAMIL'))}
            >
              TAMIL ({categoryCounts.TAMIL})
            </button>
            <button
              type="button"
              className={`book-reviews-filter-btn${activeCategory === 'ENGLISH' ? ' is-active' : ''}`}
              onClick={() => setActiveCategory((prev) => (prev === 'ENGLISH' ? '' : 'ENGLISH'))}
            >
              ENGLISH ({categoryCounts.ENGLISH})
            </button>
          </div>
          {entries.length === 0 ? (
            <p className="contact-note">No book reviews yet.</p>
          ) : filteredEntries.length === 0 ? (
            <p className="contact-note">No book reviews in this language yet.</p>
          ) : null}

          <div className="book-reviews-list">
            {filteredEntries.map((entry, entryIndex) => {
              const coverUrl = entry.imageUrl || (Array.isArray(entry.imageUrls) ? entry.imageUrls[0] : '');
              const youtubeUrl = String(entry.youtubeUrl || '').trim();
              const initialCount = Number(likesByEntry?.[entry.id]?.likesCount || 0);

              return (
                <article key={entry.id} className="book-review-card">
                  <figure className="book-review-cover">
                    {coverUrl ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={coverUrl}
                        alt={entry.kavithaiFrom || 'Book review cover'}
                      />
                    ) : (
                      <div className="book-review-cover-empty" />
                    )}
                  </figure>

                  <div className="book-review-copy">
                    <h2>{`${entryIndex + 1}. ${entry.kavithaiFrom}`}</h2>
                    <div className="book-review-text">
                      {toParagraphs(entry.markdownText).map((line, idx) => (
                        <p key={`${entry.id}-${idx}`}>{line}</p>
                      ))}
                    </div>

                    <div className="book-review-footer-row">
                      <LikeButton
                        endpoint="/api/book-reviews/reactions"
                        entryId={entry.id}
                        initialCount={initialCount}
                        storageNamespace="book-reviews"
                        className="book-review-like"
                      />

                      {youtubeUrl ? (
                        <a
                          className={`book-review-youtube-link${isInstagramUrl(youtubeUrl) ? ' is-instagram' : ''}`}
                          href={youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={isInstagramUrl(youtubeUrl) ? { color: '#e1306c', borderColor: '#f1b4c9' } : undefined}
                          aria-label={`${getBookReviewLinkLabel(youtubeUrl)} ${entry.kavithaiFrom || 'this book review'}`}
                        >
                          {renderBookReviewLinkIcon(youtubeUrl)}
                          <span>காணவும்</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
