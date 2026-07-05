import { useMemo, useState } from 'react';
import LikeButton from '../src/components/LikeButton';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero, listContentEntryReactions, listMiniProjectEntries } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';
import { toPublicStorageUrl } from '../lib/storage';

const MINI_PROJECTS_HERO_URL = toPublicStorageUrl('assets/hero-images-of-modules/ari-projects.webp');

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Mini-Projects');
  const hero = link ? await getSectionHero(link.id, 'Mini-Projects') : { heading: 'Mini-Projects', description: '', imageUrl: '' };
  const miniProjects = await listMiniProjectEntries();
  const likesByEntry = await listContentEntryReactions({
    sectionKey: 'mini-projects',
    entryIds: (Array.isArray(miniProjects) ? miniProjects : []).map((project) => project.id),
  });
  return {
    props: {
      hero: {
        ...hero,
        imageUrl: MINI_PROJECTS_HERO_URL,
      },
      miniProjects,
      likesByEntry,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function MiniProjectsPage({ hero, miniProjects, likesByEntry }) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [brokenImageByTitle, setBrokenImageByTitle] = useState({});
  const heroQuote = String(hero?.quote || '').trim();
  const normalizedProjects = useMemo(() => miniProjects || [], [miniProjects]);
  const categories = useMemo(
    () => Array.from(new Set(normalizedProjects.map((project) => project.category).filter(Boolean))),
    [normalizedProjects],
  );
  const pageSize = 12;

  const filteredProjects = useMemo(() => {
    if (activeCategory === 'ALL') return normalizedProjects;
    return normalizedProjects.filter((project) => project.category === activeCategory);
  }, [activeCategory, normalizedProjects]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedProjects = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredProjects.slice(startIndex, startIndex + pageSize);
  }, [filteredProjects, safeCurrentPage]);

  function goToPage(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

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
              onClick={() => {
                setActiveCategory('ALL');
                setCurrentPage(1);
              }}
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
                  onClick={() => {
                    setActiveCategory(category);
                    setCurrentPage(1);
                  }}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>

          <div className="mini-project-grid">
            {pagedProjects.map((project) => {
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
                    <div className="mini-project-actions">
                      <LikeButton
                        endpoint="/api/content/reactions"
                        entryId={project.id}
                        initialCount={likesByEntry?.[project.id]?.likesCount || 0}
                        storageNamespace="mini-projects"
                        className="mini-project-like"
                      />
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

          {filteredProjects.length > pageSize ? (
            <div className="mini-project-pagination" aria-label="Mini projects pagination">
              <button
                type="button"
                className="mini-project-pagination-btn"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
              >
                <span aria-hidden="true">←</span>
                <span>Previous</span>
              </button>
              <p className="mini-project-pagination-status">
                Page {safeCurrentPage} of {totalPages}
              </p>
              <button
                type="button"
                className="mini-project-pagination-btn"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
              >
                <span>Next</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
