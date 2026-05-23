import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Works');
  const hero = link ? await getSectionHero(link.id, 'Works') : { heading: 'Works', description: '', imageUrl: '' };
  return { props: { hero } };
}

export default function WorksPage({ hero }) {
  const heading = hero?.heading === 'Works' ? 'Experience' : hero?.heading;

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="works-title">
          <SectionHero heading={heading} description={hero?.description} imageUrl={hero?.imageUrl} fallbackHeading="Experience" />
          <h1 id="works-title" style={{ display: 'none' }}>Experience</h1>
        </section>
      </main>
    </div>
  );
}
