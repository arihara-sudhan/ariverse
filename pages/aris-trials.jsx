import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';

export async function getServerSideProps() {
  const link = await getProfileLinkByLabel('Experiments');
  const hero = link ? await getSectionHero(link.id, 'Experiments') : { heading: 'Experiments', description: '', imageUrl: '' };
  return { props: { hero } };
}

export default function ArisTrialsPage({ hero }) {
  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="aris-trials-title">
          <SectionHero heading={hero?.heading} description={hero?.description} imageUrl={hero?.imageUrl} fallbackHeading="Experiments" />
          <h1 id="aris-trials-title" style={{ display: 'none' }}>Experiments</h1>
        </section>
      </main>
    </div>
  );
}
