import Link from 'next/link';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import DiscussionThread from '../src/components/DiscussionThread';
import { getProfileLinkByLabel, getSectionHero, listContentComments, listExperimentsEntries } from '../lib/adminData';

export async function getServerSideProps({ query }) {
  const link = await getProfileLinkByLabel('Experiments');
  const hero = link ? await getSectionHero(link.id, 'Experiments') : { heading: 'Experiments', description: '', imageUrl: '' };
  const experiments = await listExperimentsEntries();
  const requestedId = Number(query?.id);
  const selectedTrial = Number.isInteger(requestedId) ? experiments.find((item) => item.id === requestedId) || null : null;
  const selectedIndex = selectedTrial ? experiments.findIndex((item) => item.id === selectedTrial.id) : -1;
  const initialComments = selectedTrial
    ? await listContentComments({ sectionKey: 'xperiments', entryId: selectedTrial.id })
    : [];
  const showAll = query?.view === 'all';
  return { props: { hero, selectedTrial, selectedIndex, showAll, experiments, initialComments } };
}

export default function ArisTrialsPage({ hero, selectedTrial, selectedIndex, showAll, experiments, initialComments }) {
  const safeExperiments = Array.isArray(experiments) ? experiments : [];
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < safeExperiments.length - 1;
  const prevItem = hasPrev ? safeExperiments[selectedIndex - 1] : null;
  const nextItem = hasNext ? safeExperiments[selectedIndex + 1] : null;

  if (selectedTrial) {
    return (
      <main className="kavithai-stage xperiment-detail-stage">
        <section className="kavithai-media">
          {selectedTrial.imageUrl ? (
            <img loading="lazy" decoding="async" className="kavithai-hero" src={selectedTrial.imageUrl} alt={selectedTrial.title} />
          ) : (
            <div className="kavithai-media-empty" />
          )}
          <nav className="kavithai-top-nav" aria-label="Experiment navigation">
            <Link href="/" aria-label="Home">
              <span className="material-symbols-outlined" aria-hidden="true">home</span>
            </Link>
            <Link href="/aris-xperiments?view=all" aria-label="All experiments">
              <span className="material-symbols-outlined" aria-hidden="true">list</span>
            </Link>
            {hasPrev ? (
              <Link href={`/aris-xperiments?id=${prevItem?.id}`} aria-label="Previous experiment">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              </Link>
            ) : null}
            {hasNext ? (
              <Link href={`/aris-xperiments?id=${nextItem?.id}`} aria-label="Next experiment">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </Link>
            ) : null}
          </nav>
        </section>
        <section className="kavithai-panel">
          <h1 className="kavithai-title">{`${selectedIndex + 1}. ${selectedTrial.title}`}</h1>
          <div className="kavithai-markdown">
            <p>{selectedTrial.description}</p>
          </div>
          <DiscussionThread
            title="Comments"
            endpoint="/api/content/comments"
            itemId={selectedTrial.id}
            itemIdField="entryId"
            extraPayload={{ section: 'xperiments' }}
            initialComments={initialComments}
          />
        </section>
      </main>
    );
  }

  if (showAll) {
    return (
      <main className="kavithai-stage">
        <nav className="kavithai-top-nav" aria-label="Experiment navigation">
          <Link href="/" aria-label="Home">
            <span className="material-symbols-outlined" aria-hidden="true">home</span>
          </Link>
          <Link href="/aris-xperiments" aria-label="Grid view">
            <span className="material-symbols-outlined" aria-hidden="true">grid_view</span>
          </Link>
        </nav>
        <section className="kavithai-all-list">
          {safeExperiments.map((trial, index) => (
            <Link key={trial.id} href={`/aris-xperiments?id=${trial.id}`}>
              {index + 1}. {trial.title}
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
        <section aria-labelledby="aris-trials-title">
          <SectionHero heading={hero?.heading} description={hero?.description} imageUrl={hero?.imageUrl} fallbackHeading="Experiments">
            {hero?.quote ? <p className="clay-play-quote">"{hero.quote}"</p> : null}
          </SectionHero>
          <h1 id="aris-trials-title" style={{ display: 'none' }}>Experiments</h1>
        </section>

        <section className="trials-list" aria-label="Experiments list">
          {safeExperiments.map((item) => (
            <article key={item.id} className="trial-row">
              <img className="trial-row-image" src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" />
              <div className="trial-row-content">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <a className="trial-read-more-btn" href={item.readMoreUrl || '#'}>READ MORE</a>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
