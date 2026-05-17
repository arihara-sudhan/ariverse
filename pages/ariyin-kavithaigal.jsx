import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero, listKavithaiEntries } from '../lib/adminData';

export async function getServerSideProps({ query }) {
  const poems = await listKavithaiEntries();
  const kavithaiLink = (await getProfileLinkByLabel('Ariyin Kavithaigal')) || (await getProfileLinkByLabel('Kavithaigal'));
  const hero = kavithaiLink
    ? await getSectionHero(kavithaiLink.id, 'Ariyin Kavithaigal')
    : { heading: 'Ariyin Kavithaigal', description: '', imageUrl: '' };

  const requestedId = Number(query?.id);
  const selectedPoem = Number.isInteger(requestedId) ? poems.find((poem) => poem.id === requestedId) || null : null;
  const selectedIndex = selectedPoem ? poems.findIndex((poem) => poem.id === selectedPoem.id) : -1;
  const showAll = query?.view === 'all';

  return {
    props: {
      poems,
      hero,
      selectedPoem,
      selectedIndex,
      showAll,
    },
  };
}

export default function AriyinKavithaigalPage({ poems, hero, selectedPoem, selectedIndex, showAll }) {
  const hasPoems = Array.isArray(poems) && poems.length > 0;
  const headingText = String(hero?.heading || 'அரியின் கவிதைகள்').trim();
  const headingParts = headingText.split(/\s+/).filter(Boolean);
  const headingSmall = headingParts[0] || 'அரியின்';
  const headingBig = headingParts.slice(1).join(' ') || 'கவிதைகள்';

  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < poems.length - 1;
  const prevPoem = hasPrev ? poems[selectedIndex - 1] : null;
  const nextPoem = hasNext ? poems[selectedIndex + 1] : null;

  if (selectedPoem) {
    return (
      <main className="kavithai-stage">
        <section className="kavithai-media">
          {selectedPoem.imageUrl ? (
            <img className="kavithai-hero" src={selectedPoem.imageUrl} alt={selectedPoem.kavithaiName} />
          ) : (
            <div className="kavithai-media-empty" />
          )}
          <nav className="kavithai-top-nav" aria-label="Poem navigation">
            <Link href="/ariyin-kavithaigal" aria-label="Home">
              <span className="material-symbols-outlined" aria-hidden="true">home</span>
            </Link>
            <Link href="/ariyin-kavithaigal?view=all" aria-label="All poems">
              <span className="material-symbols-outlined" aria-hidden="true">list</span>
            </Link>
            {hasPrev ? (
              <Link href={`/ariyin-kavithaigal?id=${prevPoem.id}`} aria-label="Previous poem">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              </Link>
            ) : null}
            {hasNext ? (
              <Link href={`/ariyin-kavithaigal?id=${nextPoem.id}`} aria-label="Next poem">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </Link>
            ) : null}
          </nav>
        </section>
        <section className="kavithai-panel">
          <h1 className="kavithai-title tamil-text" lang="ta">
            {`${selectedIndex + 1}. ${selectedPoem.kavithaiName}`}
          </h1>
          <div className="kavithai-markdown tamil-text" lang="ta">
            <ReactMarkdown>{(selectedPoem.markdownText || '').replace(/\n/g, '  \n')}</ReactMarkdown>
          </div>
        </section>
      </main>
    );
  }

  if (showAll) {
    return (
      <main className="kavithai-stage">
        <nav className="kavithai-top-nav" aria-label="Poem navigation">
          <Link href="/ariyin-kavithaigal" aria-label="Home">
            <span className="material-symbols-outlined" aria-hidden="true">home</span>
          </Link>
          <Link href="/ariyin-kavithaigal" aria-label="Grid view">
            <span className="material-symbols-outlined" aria-hidden="true">grid_view</span>
          </Link>
        </nav>
        <section className="kavithai-all-list tamil-text" lang="ta">
          {poems.map((poem, index) => (
            <Link key={poem.id} href={`/ariyin-kavithaigal?id=${poem.id}`}>
              {index + 1}. {poem.kavithaiName}
            </Link>
          ))}
        </section>
      </main>
    );
  }

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="ariyin-kavithaigal-title">
          <SectionHero
            heading={hero?.heading}
            headingContent={
              <span className="ariyin-hero-heading">
                <span className="ariyin-hero-small tamil-text" lang="ta">{headingSmall}</span>
                <span className="ariyin-hero-big tamil-text" lang="ta">{headingBig}</span>
              </span>
            }
            description={hero?.description}
            imageUrl={hero?.imageUrl}
            fallbackHeading="Ariyin Kavithaigal"
            descriptionAfterImageOnMobile
          />
          <h1 id="ariyin-kavithaigal-title" style={{ display: 'none' }}>Ariyin Kavithaigal</h1>

          {!hasPoems ? (
            <p className="contact-note">No poems yet.</p>
          ) : (
            <div className="ariyin-poems-list">
              {poems.map((poem, index) => (
                <Link key={poem.id} href={`/ariyin-kavithaigal?id=${poem.id}`} className="ariyin-poem-entry-link">
                  <article className="ariyin-poem-entry tamil-text" lang="ta">
                    {poem.imageUrl ? (
                      <figure className="ariyin-poem-image-wrap">
                        <img className="ariyin-poem-image" src={poem.imageUrl} alt={poem.kavithaiName || 'Poem image'} />
                      </figure>
                    ) : null}
                    <h2>{`${index + 1}. ${poem.kavithaiName}`}</h2>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
