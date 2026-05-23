import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Projects');
  const hero = link ? await getSectionHero(link.id, 'Projects') : { heading: 'Projects', description: '', imageUrl: '' };
  return { props: { hero } };
}

export default function ProjectsPage({ hero }) {
  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="projects-title">
          <SectionHero heading={hero?.heading} description={hero?.description} imageUrl={hero?.imageUrl} fallbackHeading="Projects" />
          <h1 id="projects-title" style={{ display: 'none' }}>Projects</h1>
        </section>
      </main>
    </div>
  );
}
