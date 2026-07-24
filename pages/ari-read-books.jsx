import { useMemo, useState } from 'react';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import LikeButton from '../src/components/LikeButton';
import { getProfileLinkByLabel, getSectionHero, listBooksReadEntries, listContentEntryReactions } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';

const PAGE_SIZE = 10;

export async function getStaticProps() {
  let entries = [];
  let hero = { heading: 'Books Read', imageUrl: '' };
  let likesByEntry = {};
  try {
    const booksReadLink = await getProfileLinkByLabel('Books Read');
    if (booksReadLink) {
      hero = await getSectionHero(booksReadLink.id, 'Books Read');
    }
    entries = await listBooksReadEntries();
    likesByEntry = await listContentEntryReactions({
      sectionKey: 'books-read',
      entryIds: (Array.isArray(entries) ? entries : []).map((entry) => entry.id),
    });
  } catch (_error) {
    entries = [];
    likesByEntry = {};
  }

  return {
    props: {
      entries,
      hero,
      likesByEntry,
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

export default function AriReadBooksPage({ entries, hero, likesByEntry }) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const [activeCategory, setActiveCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const categories = useMemo(
    () => Array.from(new Set(safeEntries.map((book) => (book.category || 'ENGLISH').toUpperCase()))),
    [safeEntries],
  );
  const categoryCounts = useMemo(
    () =>
      categories.reduce((acc, category) => {
        acc[category] = safeEntries.filter((book) => (book.category || 'ENGLISH').toUpperCase() === category).length;
        return acc;
      }, {}),
    [categories, safeEntries],
  );

  const filteredEntries = useMemo(() => {
    if (!activeCategory) return safeEntries;
    return safeEntries.filter((book) => (book.category || 'ENGLISH').toUpperCase() === activeCategory);
  }, [activeCategory, safeEntries]);
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const pagedEntries = useMemo(
    () => filteredEntries.slice(pageStartIndex, pageStartIndex + PAGE_SIZE),
    [filteredEntries, pageStartIndex],
  );

  function goToPage(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  const booksReadMetaBlock = (
    <div className="books-read-hero-meta">
      <div className="books-read-stat-wrap">
        <div className="books-read-stat" aria-label={`${safeEntries.length} books so far`}>
          <span className="books-read-stat-number">{safeEntries.length}</span>
          <span className="books-read-stat-text">
            <span className="books-read-stat-top">SO FAR</span>
          </span>
        </div>
      </div>

      <div className="books-read-filter-panel">
        <div className="books-read-filters" aria-label="Books read filters">
          <button
            type="button"
            className={`books-filter-btn${activeCategory === 'ENGLISH' ? ' is-active' : ''}`}
            onClick={() => {
              setActiveCategory((prev) => (prev === 'ENGLISH' ? '' : 'ENGLISH'));
              setCurrentPage(1);
            }}
          >
            English ({categoryCounts.ENGLISH || 0})
          </button>
          <button
            type="button"
            className={`books-filter-btn${activeCategory === 'TAMIL' ? ' is-active' : ''}`}
            onClick={() => {
              setActiveCategory((prev) => (prev === 'TAMIL' ? '' : 'TAMIL'));
              setCurrentPage(1);
            }}
          >
            Tamil ({categoryCounts.TAMIL || 0})
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="ari-read-books-title">
          <SectionHero
            heading={hero?.heading}
            description={hero?.description}
            imageUrl={hero?.imageUrl}
            fallbackHeading="Books Read"
          >
            <div className="books-read-meta-desktop">{booksReadMetaBlock}</div>
          </SectionHero>
          <h2 id="ari-read-books-title" style={{ display: 'none' }}>Books Read</h2>

          <div className="books-read-meta-mobile">{booksReadMetaBlock}</div>

          <div className="books-read-list">
            {pagedEntries.map((book, index) => (
              <article key={book.id} className="books-read-card">
                <figure className="books-read-cover">
                  <img loading="lazy" decoding="async" src={book.imageUrl} alt={book.title || 'Book cover'} />
                </figure>
                <div className="books-read-copy">
                  <h3>{`${pageStartIndex + index + 1}. ${book.title}`}</h3>
                  <div className="books-read-caption">
                    {toParagraphs(book.markdownText).map((line, idx) => (
                      <p key={`${book.id}-${idx}`}>{line}</p>
                    ))}
                  </div>
                  <LikeButton
                    endpoint="/api/content/reactions"
                    entryId={book.id}
                    initialCount={likesByEntry?.[book.id]?.likesCount || 0}
                    storageNamespace="books-read"
                    className="books-read-like"
                  />
                </div>
              </article>
            ))}
          </div>

          {filteredEntries.length > PAGE_SIZE ? (
            <div className="books-read-pagination" aria-label="Books read pagination">
              <button
                type="button"
                className="books-read-pagination-btn"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
              >
                Previous
              </button>
              <p className="books-read-pagination-status">
                Page {safeCurrentPage} of {totalPages}
              </p>
              <button
                type="button"
                className="books-read-pagination-btn"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
              >
                Next
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
