import { useMemo, useState } from 'react';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero, listArisBooksEntries } from '../lib/adminData';

function toWorkingBookUrl(url) {
  const input = typeof url === 'string' ? url.trim() : '';
  if (!input) return '';
  if (input.includes('github.com/arihara-sudhan/aris-books/')) {
    return input.replace('github.com/arihara-sudhan/aris-books/', 'github.com/arihara-sudhan/my-books/');
  }
  return input;
}

function prettyCategoryLabel(category) {
  const key = String(category || '').trim().toLowerCase();
  if (key === 'all') return 'All';
  if (key === 'machine-learning') return 'Deep Learning';
  if (key === 'web') return 'Web Technology';
  if (key === 'biology') return 'Biology';
  if (key === 'general') return 'General';
  if (key === 'python') return 'Python';
  if (key === 'tamizh') return 'Tamil';
  return category;
}

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('My Books');
  const hero = link ? await getSectionHero(link.id, 'My Books') : { heading: 'Aris Books', description: '', imageUrl: '' };
  const books = await listArisBooksEntries();
  return { props: { hero, books } };
}

export default function ArisBooksPage({ hero, books }) {
  const safeBooks = Array.isArray(books) ? books : [];
  const categories = useMemo(() => {
    const unique = Array.from(new Set(safeBooks.map((book) => (book?.tag || '').trim()).filter(Boolean)));
    return ['all', ...unique];
  }, [safeBooks]);
  const [activeCategory, setActiveCategory] = useState('all');
  const filteredBooks = useMemo(() => {
    if (activeCategory === 'all') return safeBooks;
    return safeBooks.filter((book) => (book?.tag || '').trim() === activeCategory);
  }, [safeBooks, activeCategory]);
  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="aris-books-title">
          <SectionHero heading={hero?.heading} description={hero?.description} imageUrl={hero?.imageUrl} fallbackHeading="Aris Books" />
          <h1 id="aris-books-title" style={{ display: 'none' }}>Aris Books</h1>
        </section>
        <section className="aris-books-grid-wrap" aria-label="Aris books">
          <div className="books-read-filters" aria-label="Book category filters">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`books-filter-btn${activeCategory === category ? ' is-active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {prettyCategoryLabel(category)}
              </button>
            ))}
          </div>
          <div className="aris-books-grid">
            {filteredBooks.map((book) => (
              <article key={book.id} className="aris-books-card">
                <a
                  href={toWorkingBookUrl(book.bookUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="aris-books-link"
                  aria-label={`Open ${book.name || 'book'} in new tab`}
                >
                  <img src={book.coverUrl} alt={book.name || 'Book cover'} loading="lazy" decoding="async" />
                </a>
                <h3>{book.name || 'Untitled Book'}</h3>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
