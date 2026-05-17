import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';

export async function getServerSideProps() {
  const link = await getProfileLinkByLabel('My Books');
  const hero = link ? await getSectionHero(link.id, 'My Books') : { heading: 'My Books', description: '', imageUrl: '' };
  return { props: { hero } };
}

export default function MyBooksPage({ hero }) {
  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="my-books-title">
          <SectionHero heading={hero?.heading} description={hero?.description} imageUrl={hero?.imageUrl} fallbackHeading="My Books" />
          <h1 id="my-books-title" style={{ display: 'none' }}>My Books</h1>
        </section>
      </main>
    </div>
  );
}
