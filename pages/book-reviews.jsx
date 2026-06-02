import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Book Reviews');
  const hero = link ? await getSectionHero(link.id, 'Book Reviews') : { heading: 'Book Reviews', description: '', imageUrl: '' };
  return { props: { hero }, revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS };
}

export default function BookReviewsPage({ hero }) {
  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="book-reviews-title">
          <SectionHero heading={hero?.heading} description={hero?.description} imageUrl={hero?.imageUrl} fallbackHeading="Book Reviews" />
          <h1 id="book-reviews-title" style={{ display: 'none' }}>Book Reviews</h1>
        </section>
      </main>
    </div>
  );
}
