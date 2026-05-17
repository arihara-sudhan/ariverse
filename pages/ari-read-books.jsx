import { useMemo, useState } from 'react';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero, listBooksReadEntries } from '../lib/adminData';

export async function getServerSideProps() {
  let entries = [];
  let hero = { heading: 'Books Read', imageUrl: '' };
  try {
    const booksReadLink = await getProfileLinkByLabel('Books Read');
    if (booksReadLink) {
      hero = await getSectionHero(booksReadLink.id, 'Books Read');
    }
    entries = await listBooksReadEntries();
  } catch (_error) {
    entries = [];
  }

  return {
    props: {
      entries,
      hero,
    },
  };
}

function toParagraphs(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function AriReadBooksPage({ entries, hero }) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState('');

  const categoryCounts = useMemo(() => {
    const counts = { ENGLISH: 0, TAMIL: 0 };
    for (const book of safeEntries) {
      const category = (book.category || 'ENGLISH').toUpperCase();
      if (category === 'TAMIL') counts.TAMIL += 1;
      else counts.ENGLISH += 1;
    }
    return counts;
  }, [safeEntries]);

  const subcategoryCounts = useMemo(() => {
    const counts = {
      ENGLISH: { FICTION: 0, NON_FICTION: 0 },
      TAMIL: { 'புனைவு': 0, 'புனைவிலி': 0 },
    };
    for (const book of safeEntries) {
      const category = (book.category || 'ENGLISH').toUpperCase() === 'TAMIL' ? 'TAMIL' : 'ENGLISH';
      const subcategory = book.subcategory || (category === 'TAMIL' ? 'புனைவு' : 'FICTION');
      if (category === 'TAMIL') {
        if (subcategory === 'புனைவிலி') counts.TAMIL['புனைவிலி'] += 1;
        else counts.TAMIL['புனைவு'] += 1;
      } else if (subcategory === 'NON_FICTION') {
        counts.ENGLISH.NON_FICTION += 1;
      } else {
        counts.ENGLISH.FICTION += 1;
      }
    }
    return counts;
  }, [safeEntries]);

  const filteredEntries = useMemo(() => {
    if (!activeCategory) return safeEntries;
    return safeEntries.filter((book) => {
      const category = (book.category || 'ENGLISH').toUpperCase() === 'TAMIL' ? 'TAMIL' : 'ENGLISH';
      if (category !== activeCategory) return false;
      if (!activeSubcategory) return true;
      const subcategory = book.subcategory || (category === 'TAMIL' ? 'புனைவு' : 'FICTION');
      return subcategory === activeSubcategory;
    });
  }, [activeCategory, activeSubcategory, safeEntries]);

  const activeSubcategoryOptions =
    activeCategory === 'TAMIL'
      ? [
          { value: 'புனைவு', label: 'புனைவு', count: subcategoryCounts.TAMIL['புனைவு'] },
          { value: 'புனைவிலி', label: 'புனைவிலி', count: subcategoryCounts.TAMIL['புனைவிலி'] },
        ]
      : [
          { value: 'FICTION', label: 'Fiction', count: subcategoryCounts.ENGLISH.FICTION },
          { value: 'NON_FICTION', label: 'Non Fiction', count: subcategoryCounts.ENGLISH.NON_FICTION },
        ];

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
              setActiveSubcategory('');
            }}
          >
            English ({categoryCounts.ENGLISH})
          </button>
          <button
            type="button"
            className={`books-filter-btn${activeCategory === 'TAMIL' ? ' is-active' : ''}`}
            onClick={() => {
              setActiveCategory((prev) => (prev === 'TAMIL' ? '' : 'TAMIL'));
              setActiveSubcategory('');
            }}
          >
            Tamil ({categoryCounts.TAMIL})
          </button>
        </div>

        {activeCategory ? (
          <div className="books-read-subfilters" aria-label="Books read subfilters">
            {activeSubcategoryOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`books-subfilter-btn${activeSubcategory === option.value ? ' is-active' : ''}`}
                onClick={() => setActiveSubcategory((prev) => (prev === option.value ? '' : option.value))}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        ) : null}
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
            {filteredEntries.map((book, index) => (
              <article key={book.id} className="books-read-card">
                <figure className="books-read-cover">
                  <img src={book.imageUrl} alt={book.title || 'Book cover'} />
                </figure>
                <div className="books-read-copy">
                  <h3>{`${index + 1}. ${book.title}`}</h3>
                  <div className="books-read-caption">
                    {toParagraphs(book.markdownText).map((line, idx) => (
                      <p key={`${book.id}-${idx}`}>{line}</p>
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
