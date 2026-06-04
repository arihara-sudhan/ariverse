import { useMemo, useState } from 'react';
import LikeButton from '../src/components/LikeButton';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero, listContentEntryReactions, listMiniProjectEntries } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Mini-Projects');
  const hero = link ? await getSectionHero(link.id, 'Mini-Projects') : { heading: 'Mini-Projects', description: '', imageUrl: '' };
  const miniProjects = await listMiniProjectEntries();
  const likesByEntry = await listContentEntryReactions({
    sectionKey: 'mini-projects',
    entryIds: (Array.isArray(miniProjects) ? miniProjects : []).map((project) => project.id),
  });
  return { props: { hero, miniProjects, likesByEntry }, revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS };
}

export default function MiniProjectsPage({ hero, miniProjects, likesByEntry }) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [brokenImageByTitle, setBrokenImageByTitle] = useState({});
  const heroQuote = String(hero?.quote || '').trim();
  const normalizedProjects = useMemo(() => miniProjects || [], [miniProjects]);
  const categories = useMemo(
    () => Array.from(new Set(normalizedProjects.map((project) => project.category).filter(Boolean))),
    [normalizedProjects],
  );

  const filteredProjects = useMemo(() => {
    if (activeCategory === 'ALL') return normalizedProjects;
    return normalizedProjects.filter((project) => project.category === activeCategory);
  }, [activeCategory, normalizedProjects]);

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="mini-projects-title">
          <SectionHero
            heading={hero?.heading}
            description={hero?.description || 'A categorized archive of my LinkedIn mini-projects across AI, CV, web, games, and creative building.'}
            imageUrl={hero?.imageUrl}
            fallbackHeading="Mini-Projects"
          >
            {heroQuote ? <p className="clay-play-quote">"{heroQuote}"</p> : null}
          </SectionHero>
          <h1 id="mini-projects-title" style={{ display: 'none' }}>Mini-Projects</h1>

          <div className="books-read-filters" aria-label="Mini project categories">
            <button
              type="button"
              className={`books-filter-btn${activeCategory === 'ALL' ? ' is-active' : ''}`}
              onClick={() => setActiveCategory('ALL')}
            >
              All ({normalizedProjects.length})
            </button>
            {categories.map((category) => {
              const count = normalizedProjects.filter((item) => item.category === category).length;
              return (
                <button
                  key={category}
                  type="button"
                  className={`books-filter-btn${activeCategory === category ? ' is-active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>

          <div className="mini-project-grid">
            {filteredProjects.map((project) => {
              const viewerHref = `/mini-projects/open?url=${encodeURIComponent(project.embedLink || '')}&title=${encodeURIComponent(project.title || 'Mini Project')}`;
              const isBroken = Boolean(brokenImageByTitle[project.title]);
              return (
                <article key={project.title} className="mini-project-card">
                  {!isBroken && project.logo ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={project.logo}
                      alt={project.title}
                      onError={() =>
                        setBrokenImageByTitle((prev) => ({ ...prev, [project.title]: true }))
                      }
                    />
                  ) : (
                    <div className="projects-card-image-placeholder" aria-hidden="true">No Image</div>
                  )}
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.caption || project.category}</p>
                    <LikeButton
                      endpoint="/api/content/reactions"
                      entryId={project.id}
                      initialCount={likesByEntry?.[project.id]?.likesCount || 0}
                      storageNamespace="mini-projects"
                      className="mini-project-like"
                    />
                    <div className="mini-project-actions">
                      <a
                        href={viewerHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
