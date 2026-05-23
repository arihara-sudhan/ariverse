import { useMemo, useState } from 'react';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero, listMiniProjectEntries } from '../lib/adminData';
import { MINI_PROJECT_CATEGORIES } from '../data/miniProjects';

export async function getServerSideProps() {
  const link = await getProfileLinkByLabel('Mini-Projects');
  const hero = link ? await getSectionHero(link.id, 'Mini-Projects') : { heading: 'Mini-Projects', description: '', imageUrl: '' };
  const miniProjects = await listMiniProjectEntries();
  return { props: { hero, miniProjects } };
}

export default function MiniProjectsPage({ hero, miniProjects }) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const heroQuote = String(hero?.quote || '').trim();
  const normalizedProjects = useMemo(() => {
    const categoryMap = new Map(MINI_PROJECT_CATEGORIES.map((item) => [item.toUpperCase(), item]));
    return (miniProjects || []).map((project) => {
      const raw = String(project?.category || '').trim();
      const normalizedCategory = categoryMap.get(raw.toUpperCase()) || raw;
      return {
        ...project,
        category: normalizedCategory,
      };
    });
  }, [miniProjects]);
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
              return (
                <article key={project.title} className="mini-project-card">
                  <img loading="lazy" decoding="async" src={project.logo} alt={project.title} />
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.caption || project.category}</p>
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
