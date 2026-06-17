import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import LikeButton from '../src/components/LikeButton';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import DiscussionThread from '../src/components/DiscussionThread';
import { getProfileLinkByLabel, getSectionHero, listContentComments, listContentEntryReactions, listExperimentsEntries } from '../lib/adminData';
import { toPublicStorageUrl } from '../lib/storage';

const COLLAGE_HELP_DETAIL_HERO_URL = toPublicStorageUrl('ari-xperiments/collage-helps-hero.webp');

function parseExperimentReadme(rawText) {
  const lines = String(rawText || '').split('\n');
  const imageUrlByName = new Map();
  const tokenRegex = /^\[ARIVERSE_IMAGE\]\s+(.+?)\s*$/;
  const mapRegex = /^\[ARIVERSE_IMAGE_URL\]\s+(.+?)\s*::\s*(.+?)\s*$/;
  const markdownImageRegex = /^!\[(.*?)\]\((.+?)\)\s*$/;
  const plainImageUrlRegex = /^https?:\/\/\S+\.(?:png|jpe?g|webp|gif)(?:\?\S*)?$/i;
  const blocks = [];
  let paragraphLines = [];
  let anchorIndex = 0;

  function flushParagraph() {
    if (paragraphLines.length === 0) return;
    blocks.push({ type: 'markdown', text: paragraphLines.join('\n') });
    paragraphLines = [];
  }

  for (const line of lines) {
    const mapMatch = line.match(mapRegex);
    if (mapMatch) {
      imageUrlByName.set(String(mapMatch[1] || '').trim(), String(mapMatch[2] || '').trim());
      continue;
    }

    const tokenMatch = line.match(tokenRegex);
    if (tokenMatch) {
      flushParagraph();
      const name = String(tokenMatch[1] || '').trim();
      blocks.push({ type: 'anchor', name, anchorId: `exp-anchor-${anchorIndex}` });
      anchorIndex += 1;
      continue;
    }

    const markdownImageMatch = line.match(markdownImageRegex);
    if (markdownImageMatch) {
      flushParagraph();
      blocks.push({
        type: 'image',
        name: String(markdownImageMatch[1] || '').trim(),
        imageUrl: String(markdownImageMatch[2] || '').trim(),
      });
      continue;
    }

    if (plainImageUrlRegex.test(line.trim())) {
      flushParagraph();
      blocks.push({
        type: 'image',
        name: '',
        imageUrl: line.trim(),
      });
      continue;
    }

    paragraphLines.push(line);
  }
  flushParagraph();

  return blocks.map((block) =>
    block.type === 'anchor'
      ? {
          ...block,
          imageUrl: normalizeExperimentImageUrl(imageUrlByName.get(block.name) || ''),
        }
      : block.type === 'image'
        ? {
            ...block,
            imageUrl: normalizeExperimentImageUrl(imageUrlByName.get(block.name) || block.imageUrl || ''),
          }
      : block,
  );
}

function normalizeExperimentImageUrl(url) {
  const input = String(url || '').trim();
  if (!input) return '';

  try {
    const parsed = new URL(input);
    const pathname = parsed.pathname.replace(/\/uploads\/uploads\/experiment-inline\//, '/');
    parsed.pathname = pathname.replace(/\.[^/.]+$/, '.webp');
    return parsed.toString();
  } catch (_error) {
    if (input.startsWith('/')) {
      return input.replace(/\/uploads\/uploads\/experiment-inline\//, '/').replace(/\.[^/.]+$/, '.webp');
    }
    return input;
  }
}

export async function getServerSideProps({ query }) {
  const link = await getProfileLinkByLabel('Experiments');
  const hero = link ? await getSectionHero(link.id, 'Experiments') : { heading: 'Experiments', description: '', imageUrl: '' };
  const experiments = await listExperimentsEntries();
  const likesByEntry = await listContentEntryReactions({
    sectionKey: 'xperiments',
    entryIds: experiments.map((item) => item.id),
  });
  const requestedId = Number(query?.id);
  const selectedTrial = Number.isInteger(requestedId) ? experiments.find((item) => item.id === requestedId) || null : null;
  const selectedIndex = selectedTrial ? experiments.findIndex((item) => item.id === selectedTrial.id) : -1;
  const initialComments = selectedTrial
    ? await listContentComments({ sectionKey: 'xperiments', entryId: selectedTrial.id })
    : [];
  const showAll = query?.view === 'all';
  return { props: { hero, selectedTrial, selectedIndex, showAll, experiments, initialComments, likesByEntry } };
}

export default function ArisTrialsPage({ hero, selectedTrial, selectedIndex, showAll, experiments, initialComments, likesByEntry }) {
  const safeExperiments = Array.isArray(experiments) ? experiments : [];
  const panelRef = useRef(null);
  const [hideTopNav, setHideTopNav] = useState(false);
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < safeExperiments.length - 1;
  const prevItem = hasPrev ? safeExperiments[selectedIndex - 1] : null;
  const nextItem = hasNext ? safeExperiments[selectedIndex + 1] : null;
  const readmeBlocks = useMemo(
    () => (selectedTrial ? parseExperimentReadme(selectedTrial.fullDescription || selectedTrial.description || '') : []),
    [selectedTrial],
  );
  const selectedTrialHeroUrl =
    selectedTrial && /collages instead of single images|fed collages/i.test(String(selectedTrial.title || ''))
      ? COLLAGE_HELP_DETAIL_HERO_URL
      : String(selectedTrial?.imageUrl || '').trim();

  useEffect(() => {
    if (!selectedTrial) return;
    const panelEl = panelRef.current;

    const updateVisibility = () => {
      const panelScrollable = panelEl && panelEl.scrollHeight > panelEl.clientHeight + 4;
      let progress = 0;
      if (panelScrollable) {
        const maxScroll = Math.max(1, panelEl.scrollHeight - panelEl.clientHeight);
        progress = panelEl.scrollTop / maxScroll;
      } else if (typeof window !== 'undefined') {
        const doc = document.documentElement;
        const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
        progress = maxScroll > 1 ? window.scrollY / maxScroll : 0;
      }
      setHideTopNav(progress > 0.02);
    };

    updateVisibility();
    if (panelEl) panelEl.addEventListener('scroll', updateVisibility, { passive: true });
    if (typeof window !== 'undefined') window.addEventListener('scroll', updateVisibility, { passive: true });
    if (typeof window !== 'undefined') window.addEventListener('resize', updateVisibility);
    return () => {
      if (panelEl) panelEl.removeEventListener('scroll', updateVisibility);
      if (typeof window !== 'undefined') window.removeEventListener('scroll', updateVisibility);
      if (typeof window !== 'undefined') window.removeEventListener('resize', updateVisibility);
    };
  }, [selectedTrial]);

  if (selectedTrial) {
    return (
      <>
      <main className="kavithai-stage xperiment-detail-stage">
        <section className="kavithai-media">
          {selectedTrialHeroUrl ? (
            <img loading="lazy" decoding="async" className="kavithai-hero" src={selectedTrialHeroUrl} alt={selectedTrial.title} />
          ) : (
            <div className="kavithai-media-empty" />
          )}
          <nav className={`kavithai-top-nav${hideTopNav ? ' is-hidden' : ''}`} aria-label="Experiment navigation">
            <Link href="/aris-xperiments" aria-label="Home">
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
        <section ref={panelRef} className="kavithai-panel">
          <h1 className="kavithai-title">{`${selectedIndex + 1}. ${selectedTrial.title}`}</h1>
          <div className="kavithai-markdown">
            {readmeBlocks.map((block, index) => {
              if (block.type === 'markdown') {
                return (
                  <ReactMarkdown key={`md-${index}`}>
                    {String(block.text || '').replace(/\n/g, '  \n')}
                  </ReactMarkdown>
                );
              }
              if (block.type === 'image') {
                return (
                  <figure key={`img-${index}`} className="ariverse-image-anchor">
                    {block.imageUrl ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        className="ariverse-inline-anchor-image"
                        src={block.imageUrl}
                        alt={block.name || selectedTrial.title}
                      />
                    ) : null}
                  </figure>
                );
              }
              return (
                <div
                  key={block.anchorId}
                  className="ariverse-image-anchor"
                >
                  {block.imageUrl ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      className="ariverse-inline-anchor-image"
                      src={block.imageUrl}
                      alt={block.name || selectedTrial.title}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <LikeButton
            endpoint="/api/content/reactions"
            entryId={selectedTrial.id}
            initialCount={likesByEntry?.[selectedTrial.id]?.likesCount || 0}
            storageNamespace="xperiments"
            className="kavithai-like"
          />
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
      </>
    );
  }

  if (showAll) {
    return (
      <>
      <main className="kavithai-stage">
        <nav className="kavithai-top-nav" aria-label="Experiment navigation">
          <Link href="/aris-xperiments" aria-label="Home">
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
      </>
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
              <div className="trial-row-actions">
                <LikeButton
                  endpoint="/api/content/reactions"
                  entryId={item.id}
                  initialCount={likesByEntry?.[item.id]?.likesCount || 0}
                  storageNamespace="xperiments"
                  className="trial-row-like"
                />
                <a className="trial-read-more-btn" href={item.readMoreUrl || `/aris-xperiments?id=${item.id}`}>READ MORE</a>
              </div>
            </div>
          </article>
        ))}
        </section>
      </main>
    </div>
  );
}
