import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import ShelfCard from '../src/components/ShelfCard';
import { getProfileLinkByLabel, getSectionHero, listShelfEntries } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';

async function resolveShelfHero() {
  const shelfLink = await getProfileLinkByLabel('Shelf');
  const shelfHero = shelfLink ? await getSectionHero(shelfLink.id, 'Shelf') : null;
  const booksLink = await getProfileLinkByLabel('My Books');
  const booksHero = booksLink ? await getSectionHero(booksLink.id, 'My Books') : null;

  const hasShelfHero = Boolean(
    shelfHero && (shelfHero.imageUrl || shelfHero.description || shelfHero.quote || String(shelfHero.heading || '').trim()),
  );

  if (hasShelfHero) {
    return {
      heading: shelfHero?.heading || 'Shelf',
      description: shelfHero?.description || '',
      imageUrl: shelfHero?.imageUrl || '',
      quote: shelfHero?.quote || '',
    };
  }

  return {
    heading: 'Shelf',
    description: booksHero?.description || '',
    imageUrl: booksHero?.imageUrl || '',
    quote: booksHero?.quote || '',
  };
}

export async function getStaticProps() {
  const [hero, items] = await Promise.all([resolveShelfHero(), listShelfEntries()]);

  return {
    props: {
      hero,
      items,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function ArisShelfPage({ hero, items }) {
  const shelfItems = Array.isArray(items) ? items : [];

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="aris-shelf-title">
          <SectionHero
            heading={hero?.heading || 'Shelf'}
            description={hero?.description || ''}
            imageUrl={hero?.imageUrl || ''}
            fallbackHeading="Shelf"
          />
          <h1 id="aris-shelf-title" style={{ display: 'none' }}>
            Shelf
          </h1>
        </section>

        <section className="aris-shelf-grid-wrap" aria-label="Ari shelf items">
          {shelfItems.length === 0 ? (
            <p className="contact-note">No shelf items yet. Add them from the Shelf admin section.</p>
          ) : (
            <div className="aris-shelf-grid">
              {shelfItems.map((item) => (
                <ShelfCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
