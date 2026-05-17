import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';

export async function getServerSideProps() {
  const link = await getProfileLinkByLabel('Guest Lectures');
  const hero = link ? await getSectionHero(link.id, 'Guest Lectures') : { heading: 'Guest Lectures', description: '', imageUrl: '' };
  return { props: { hero } };
}

export default function GuestLecturesPage({ hero }) {
  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="guest-lectures-title">
          <SectionHero heading={hero?.heading} description={hero?.description} imageUrl={hero?.imageUrl} fallbackHeading="Guest Lectures" />
          <h1 id="guest-lectures-title" style={{ display: 'none' }}>Guest Lectures</h1>
        </section>
      </main>
    </div>
  );
}
