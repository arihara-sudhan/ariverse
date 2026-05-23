import { useMemo, useState } from 'react';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';
import { MINI_PROJECT_CATEGORIES, miniProjects } from '../data/miniProjects';

export async function getServerSideProps() {
  const link = await getProfileLinkByLabel('Mini-Projects');
  const hero = link ? await getSectionHero(link.id, 'Mini-Projects') : { heading: 'Mini-Projects', description: '', imageUrl: '' };
  return { props: { hero } };
}

function isExternalLink(url = '') {
  return url.startsWith('http');
}

export default function MiniProjectsPage({ hero }) {
  const [activeCategory, setActiveCategory] = useState('ALL');

  const filteredProjects = useMemo(() => {
    if (activeCategory === 'ALL') return miniProjects;
    return miniProjects.filter((project) => project.category === activeCategory);
  }, [activeCategory]);

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
          />
          <h1 id="mini-projects-title" style={{ display: 'none' }}>Mini-Projects</h1>

          <div className="books-read-filters" aria-label="Mini project categories">
            <button
              type="button"
              className={`books-filter-btn${activeCategory === 'ALL' ? ' is-active' : ''}`}
              onClick={() => setActiveCategory('ALL')}
            >
              All ({miniProjects.length})
            </button>
            {MINI_PROJECT_CATEGORIES.map((category) => {
              const count = miniProjects.filter((item) => item.category === category).length;
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
              const external = isExternalLink(project.embedLink);
              return (
                <article key={project.title} className="mini-project-card">
                  <img loading="lazy" decoding="async" src={project.logo} alt={project.title} />
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.caption || project.category}</p>
                    <div className="mini-project-actions">
                      <a
                        href={project.embedLink}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noreferrer' : undefined}
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
