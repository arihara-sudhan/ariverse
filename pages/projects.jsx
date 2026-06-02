import { useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero, listProjectEntries } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Projects');
  const hero = link ? await getSectionHero(link.id, "#Ari'sProjects") : { heading: "#Ari'sProjects", description: '', quote: '', imageUrl: '' };
  const projects = await listProjectEntries();
  return { props: { hero, projects }, revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS };
}

export default function ProjectsPage({ hero, projects }) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const heroHeading = String(hero?.heading || '').trim() || "#Ari'sProjects";
  const heroDescription = String(hero?.description || '').trim() || 'Lorem ipsum as description';
  const heroQuote = String(hero?.quote || '').trim() || 'lorm ipsum for hero text';
  const normalizedProjects = useMemo(
    () => (Array.isArray(projects) ? projects : []).map((project) => ({ ...project, category: String(project?.category || '').trim() })),
    [projects],
  );
  const categories = useMemo(
    () => Array.from(new Set(normalizedProjects.map((project) => project.category).filter(Boolean))),
    [normalizedProjects],
  );
  const filteredProjects = useMemo(() => {
    if (activeCategory === 'ALL') return normalizedProjects;
    return normalizedProjects.filter((project) => project.category === activeCategory);
  }, [activeCategory, normalizedProjects]);
  const slugify = (input) =>
    String(input || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project';

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-labelledby="projects-title">
          <SectionHero
            heading={heroHeading}
            description={heroDescription}
            imageUrl={hero?.imageUrl}
            fallbackHeading="#Ari'sProjects"
          >
            {heroQuote ? <p className="clay-play-quote">"{heroQuote}"</p> : null}
          </SectionHero>
          <h1 id="projects-title" style={{ display: 'none' }}>#Ari&apos;sProjects</h1>

          <div className="books-read-filters" aria-label="Project categories">
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

          <div className="projects-list" aria-live="polite">
            {filteredProjects.length === 0 ? (
              <article className="projects-card">
                <div>
                  <h3>Projects Coming Soon</h3>
                  <p>Project cards and images will appear here once uploaded.</p>
                </div>
              </article>
            ) : (
              filteredProjects.map((project) => (
                <article key={project.title} className="projects-card">
                  <Link className="projects-card-link" href={`/projects/${slugify(project.title)}`}>
                    <div className="projects-card-top">
                      <div className="projects-card-left">
                        {project.logo ? (
                          <img src={project.logo} alt={project.title || 'Project image'} />
                        ) : (
                          <div className="projects-card-image-placeholder" aria-hidden="true">No Image</div>
                        )}
                      </div>
                      <div className="projects-card-right">
                        <h3>{project.title || 'Project'}</h3>
                        <p>{project.caption || project.category || 'Project description'}</p>
                        {Array.isArray(project.projectTags) && project.projectTags.length > 0 ? (
                          <div className="projects-skill-tags" aria-label="Skills used">
                            {project.projectTags.map((tag) => (
                              <span key={`${project.title}-${tag}`} className="projects-skill-tag">{tag}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
