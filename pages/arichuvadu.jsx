import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';

const DEFAULT_DESCRIPTION =
  'A passional corner for notes, sketches, fragments, and ideas that want a page of their own.';

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Arichuvadu');
  const hero = link
    ? await getSectionHero(link.id, 'Arichuvadu')
    : { heading: 'Arichuvadu', description: '', imageUrl: '' };

  return {
    props: { hero },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function ArichuvaduPage({ hero }) {
  const heroDescription = String(hero?.description || '').trim() || DEFAULT_DESCRIPTION;

  return (
    <main
      className="arichuvadu-page"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'start center',
        padding: '4.5rem 1.25rem 2rem',
      }}
    >
      <section
        aria-labelledby="arichuvadu-title"
        style={{
          width: 'min(720px, 100%)',
          textAlign: 'center',
          display: 'grid',
          gap: '0.9rem',
          justifyItems: 'center',
        }}
      >
        <h1
          id="arichuvadu-title"
          style={{
            margin: 0,
            fontSize: 'clamp(2.4rem, 6vw, 5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.04em',
          }}
        >
          {hero?.heading || 'Arichuvadu'}
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: '38rem',
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            lineHeight: 1.7,
            opacity: 0.88,
          }}
        >
          {heroDescription}
        </p>
      </section>
    </main>
  );
}
