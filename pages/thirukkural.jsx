import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Thirukkural');
  const hero = link ? await getSectionHero(link.id, 'Thirukkural') : { heading: 'Thirukkural', description: '', imageUrl: '' };
  return { props: { hero } };
}

export default function ThirukkuralPage({ hero }) {
  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="thirukkural-title">
          <SectionHero heading={hero?.heading} description={hero?.description} imageUrl={hero?.imageUrl} fallbackHeading="Thirukkural" />
          <h1 id="thirukkural-title" style={{ display: 'none' }}>Thirukkural</h1>
        </section>
      </main>
    </div>
  );
}
