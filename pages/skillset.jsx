import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';
import { ICON_BRAND_COLORS, SKILL_ICONS, getSkillIconKey } from '../src/data/skillsetIcons';

const SKILL_CATEGORIES = [
  {
    name: 'Machine Learning Foundations',
    eyebrow: 'Core stack',
    description:
      'Python-first experimentation workflow for notebooks, numerical computing, environment management, and model prototyping.',
    skills: ['Python Core', 'Anaconda', 'NumPy', 'Jupyter'],
  },
  {
    name: 'Deep Learning',
    eyebrow: 'Neural systems',
    description:
      'Building and iterating on neural networks with tensor-based training loops and practical experimentation discipline.',
    skills: ['PyTorch'],
  },
  {
    name: 'Generative AI',
    eyebrow: 'LLM orchestration',
    description:
      'Composing prompt-driven applications, chaining model calls, and shaping agent-style workflows for intelligent products.',
    skills: ['LangChain'],
  },
  {
    name: 'Computer Vision',
    eyebrow: 'Perception',
    description:
      'Image understanding and visual processing pipelines for detection, analysis, and camera-facing AI experiences.',
    skills: ['OpenCV'],
  },
  {
    name: 'Programming Foundations',
    eyebrow: 'Core engineering',
    description:
      'Strong base across systems and application programming, supporting problem solving from low-level logic to typed web code.',
    skills: ['C Programming', 'Core Java', 'Vanilla JS', 'TypeScript'],
  },
  {
    name: 'Frontend Engineering',
    eyebrow: 'Interface systems',
    description:
      'Crafting responsive interfaces and component-driven applications with modern styling and state management patterns.',
    skills: ['HTML', 'CSS', 'Bootstrap', 'Tailwind CSS', 'ReactJS', 'Redux'],
  },
  {
    name: 'Backend & APIs',
    eyebrow: 'Service layer',
    description:
      'Designing server-side applications and API layers across JavaScript and Python frameworks for product and data workflows.',
    skills: ['Node JS', 'ExpressJS', 'FastAPI', 'Flask', 'Django'],
  },
  {
    name: 'Data & Persistence',
    eyebrow: 'Storage layer',
    description:
      'Working with relational and document databases to support application state, querying, and structured data management.',
    skills: ['MySQL', 'MongoDB'],
  },
  {
    name: 'Cloud, DevOps & Collaboration',
    eyebrow: 'Delivery',
    description:
      'Versioning, containerization, cloud deployment, and team workflows that keep software reliable and shippable.',
    skills: ['Docker', 'Git', 'GitHub', 'GitLab', 'AWS', 'Azure'],
  },
  {
    name: 'Automation & Creative Tech',
    eyebrow: 'Extended toolkit',
    description:
      'Workflow automation and visual production tools that expand software work into robotics, 3D, and post-production.',
    skills: ['UIPath', 'Blender', 'Davinci Resolve'],
  },
];

const DEFAULT_SKILLSET_DESCRIPTION =
  'A category-led map of my technical stack across AI, software engineering, data systems, delivery, and creative tooling.';
const DEFAULT_SKILLSET_QUOTE = 'The more I learn, the more I can create';

export async function getStaticProps() {
  const link = await getProfileLinkByLabel('Skillset');
  const hero = link
    ? await getSectionHero(link.id, '#AriSkills')
    : { heading: '#AriSkills', description: '', imageUrl: '' };
  return { props: { hero }, revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS };
}

export default function SkillsetPage({ hero }) {
  const heroQuote = String(hero?.quote || '').trim() || DEFAULT_SKILLSET_QUOTE;

  return (
    <div className="site skillset-site">
      <Header subPage />
      <main className="skillset-layout" aria-label="Skillset">
        <section aria-labelledby="skillset-title">
          <SectionHero
            heading={hero?.heading || '#AriSkills'}
            description={hero?.description || DEFAULT_SKILLSET_DESCRIPTION}
            imageUrl={hero?.imageUrl}
            fallbackHeading="#AriSkills"
          >
            {heroQuote ? <p className="clay-play-quote">{`"${heroQuote}"`}</p> : null}
          </SectionHero>
          <h1 id="skillset-title" style={{ display: 'none' }}>
            #AriSkills
          </h1>
        </section>

        <section className="skillset-bands" aria-label="Skill categories">
          {SKILL_CATEGORIES.map((category, index) => (
            <article
              key={category.name}
              className="skill-band"
              style={{ '--band-delay': `${index * 90}ms` }}
            >
              <div className="skill-band-copy">
                <p className="skill-band-eyebrow">{category.eyebrow}</p>
                <h2>{category.name}</h2>
                <p>{category.description}</p>
              </div>

              <div className="skill-band-meta">
                <div className="skill-band-skills">
                  {category.skills.map((skill) => {
                    const iconKey = getSkillIconKey(skill);
                    const icon = iconKey ? SKILL_ICONS[iconKey] : null;
                    const brandColor = iconKey ? ICON_BRAND_COLORS[iconKey] || '#191919' : '#191919';

                    return (
                      <span
                        key={skill}
                        className={`skill-pill${icon ? '' : ' skill-pill-fallback'}`}
                        aria-label={skill}
                        title={skill}
                        style={{ '--skill-brand': brandColor }}
                      >
                        {icon ? (
                          icon.imageUrl ? (
                            <img src={icon.imageUrl} alt={icon.title} loading="lazy" decoding="async" />
                          ) : (
                            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                              <path d={icon.path} />
                            </svg>
                          )
                        ) : (
                          <strong>{skill.split(' ').map((part) => part[0]).join('').slice(0, 2)}</strong>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

      <style jsx>{`
        .skillset-site {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
        }

        .skillset-layout {
          display: grid;
          gap: 1.4rem;
          margin-top: 2rem;
          padding-bottom: 3rem;
        }

        .skillset-bands {
          display: grid;
          gap: 0.85rem;
        }

        .skill-band {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.95fr);
          gap: 1.2rem;
          padding: 1.2rem 1.15rem;
          border: 1px solid #111111;
          border-radius: 18px;
          background: #ffffff;
          overflow: hidden;
          animation: bandRise 540ms ease both;
          animation-delay: var(--band-delay, 0ms);
        }

        .skill-band::before {
          content: '';
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: #111111;
        }

        .skill-band-copy,
        .skill-band-meta,
        .skill-band-skills {
          background: transparent;
        }

        .skill-band-copy {
          padding-left: 0.3rem;
        }

        .skill-band-eyebrow {
          margin: 0 0 0.4rem;
          color: #5f5f5f;
          font-family: "Manrope", "Segoe UI", sans-serif;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .skill-band-copy h2 {
          margin: 0;
          font-size: clamp(1.15rem, 2vw, 1.55rem);
          line-height: 1.15;
          letter-spacing: -0.03em;
        }

        .skill-band-copy p:last-child {
          margin: 0.65rem 0 0;
          max-width: 46ch;
          color: #4c4c4c;
          font-size: 0.95rem;
          line-height: 1.65;
        }

        .skill-band-meta {
          display: grid;
          align-content: start;
          gap: 0.75rem;
          justify-items: start;
        }

        .skill-band-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }

        .skill-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 2.35rem;
          min-width: 2.35rem;
          padding: 0.45rem;
          border-radius: 12px;
          border: 1px solid #d7d7d7;
          background: #ffffff;
          color: #191919;
          transition: transform 180ms ease, border-color 180ms ease;
        }

        .skill-pill:hover {
          transform: translateY(-1px);
          border-color: #111111;
        }

        .skill-pill svg {
          width: 1.45rem;
          height: 1.45rem;
          fill: var(--skill-brand, #191919);
          display: block;
        }

        .skill-pill img {
          width: 1.45rem;
          height: 1.45rem;
          object-fit: contain;
          display: block;
        }

        .skill-pill-fallback strong {
          font-family: "Manrope", "Segoe UI", sans-serif;
          font-size: 0.74rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.06em;
        }

        @media (max-width: 760px) {
          .skill-band {
            grid-template-columns: 1fr;
            gap: 1rem;
            padding: 1rem 0.95rem 1rem 1rem;
          }

          .skill-band-copy p:last-child {
            max-width: none;
          }
        }

        @media (max-width: 520px) {
          .skillset-layout {
            gap: 1rem;
          }

          .skillset-bands {
            gap: 0.7rem;
          }

          .skill-band {
            border-radius: 14px;
            padding: 0.95rem 0.8rem 0.95rem 0.9rem;
          }

          .skill-band-copy h2 {
            font-size: 1.06rem;
          }

          .skill-band-copy p:last-child {
            font-size: 0.9rem;
            line-height: 1.58;
          }

          .skill-pill {
            min-height: 2.1rem;
            min-width: 2.1rem;
            padding: 0.38rem;
          }

          .skill-pill svg,
          .skill-pill img {
            width: 1.2rem;
            height: 1.2rem;
          }
        }

        @keyframes bandRise {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
