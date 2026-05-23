import { useEffect, useMemo, useState } from 'react';
import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero } from '../lib/adminData';
import { SKILL_ICONS, ICON_BRAND_COLORS, getSkillIconKey, getSnakeOrder } from '../src/data/skillsetIcons';

const SKILL_CATEGORIES = [
  {
    name: 'AI & Machine Learning',
    imageUrl: 'https://images.unsplash.com/photo-1677442135968-6f3f5d6f4c96?auto=format&fit=crop&w=1200&q=80',
    skills: ['Python Core', 'Anaconda', 'NumPy', 'Jupyter', 'PyTorch', 'OpenCV', 'LangChain'],
  },
  {
    name: 'Programming Foundations',
    imageUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
    skills: ['C Programming', 'Core Java', 'Vanilla JS', 'TypeScript'],
  },
  {
    name: 'Frontend Development',
    imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
    skills: ['HTML', 'CSS', 'Bootstrap', 'Tailwind CSS', 'ReactJS', 'Redux'],
  },
  {
    name: 'Backend & APIs',
    imageUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80',
    skills: ['Node JS', 'ExpressJS', 'FastAPI', 'Flask', 'Django'],
  },
  {
    name: 'Data Layer',
    imageUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80',
    skills: ['MySQL', 'MongoDB'],
  },
  {
    name: 'DevOps & Collaboration',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    skills: ['Docker', 'Git', 'GitHub', 'GitLab', 'AWS'],
  },
  {
    name: 'Automation & Creative',
    imageUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=1200&q=80',
    skills: ['UIPath', 'Blender', 'Davinci Resolve'],
  },
];
const DEFAULT_SKILLSET_DESCRIPTION =
  'A focused map of my technical stack across AI, engineering foundations, web systems, data, DevOps, and creative tooling.';

export async function getServerSideProps() {
  const link = await getProfileLinkByLabel('Skillset');
  const hero = link
    ? await getSectionHero(link.id, '#AriSkills')
    : { heading: '#AriSkills', description: '', imageUrl: '' };
  return { props: { hero } };
}

export default function SkillsetPage({ hero }) {
  const skillItems = useMemo(
    () =>
      SKILL_CATEGORIES.flatMap((category) =>
        category.skills.map((skill) => ({
          id: `${category.name}-${skill}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          skill,
          category: category.name,
          imageUrl: category.imageUrl,
        }))
      ),
    []
  );

  const [activeId, setActiveId] = useState(skillItems[0]?.id || '');
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('[data-skill-id]'));
    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActiveId(String(visible[0].target.getAttribute('data-skill-id') || ''));
        }
      },
      { rootMargin: '-20% 0px -45% 0px', threshold: [0.2, 0.45, 0.7] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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
          />
          <h1 id="skillset-title" style={{ display: 'none' }}>#AriSkills</h1>
        </section>
        <section className="skillset-left">
          <div className="skill-list">
            {skillItems.map((item, idx) => {
              const isActive = activeId === item.id;
              const iconKey = getSkillIconKey(item.skill);
              const icon = iconKey ? SKILL_ICONS[iconKey] : null;
              const brandColor = iconKey ? ICON_BRAND_COLORS[iconKey] || '#191919' : '#191919';
              const snakeOrder = getSnakeOrder(idx, 5);
              return (
                <article
                  key={item.id}
                  data-skill-id={item.id}
                  className={`skill-row${isActive ? ' active' : ''}`}
                  style={{ '--wave-delay': `${snakeOrder * 0.16}s`, '--brand-color': brandColor }}
                >
                  <span className={`skill-icon${icon ? '' : ' fallback'}`} aria-hidden="true">
                    {icon ? (
                      <svg viewBox="0 0 24 24" role="img">
                        <title>{icon.title}</title>
                        <path d={icon.path} />
                      </svg>
                    ) : (
                      <strong>{item.skill.split(' ').map((part) => part[0]).join('').slice(0, 2)}</strong>
                    )}
                  </span>
                  <p>{item.skill}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <style jsx>{`
        .skillset-site {
          width: min(90vw, 1400px);
          max-width: none;
          margin: 0 auto;
        }
        .skillset-layout {
          display: block;
          margin-top: 2rem;
        }
        .skillset-left {
          display: grid;
          gap: 2rem;
          padding-bottom: 3rem;
        }
        .skill-list {
          display: grid;
          gap: 0.75rem;
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }
        .skill-row {
          border: 1px solid #111111;
          border-radius: 12px;
          background: #fff;
          padding: 0.9rem;
          aspect-ratio: 1 / 1;
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 0.55rem;
          text-align: center;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }
        .skill-icon {
          width: 108px;
          height: 108px;
          border-radius: 12px;
          background: #f6f6f6;
          border: 1px solid #e7e7e7;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }
        .skill-icon svg {
          width: 82px;
          height: 82px;
          fill: #191919;
          animation: iconColorWave 12s ease-in-out infinite;
          animation-delay: var(--wave-delay, 0s);
        }
        .skill-icon.fallback strong {
          font-size: 0.95rem;
          letter-spacing: 0.05em;
          color: #3d3d3d;
        }
        .skill-row p {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          line-height: 1.2;
        }
        .skill-row.active {
          border-color: #111111;
          transform: none;
          box-shadow: none;
        }
        @media (max-width: 960px) {
          .skill-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 560px) {
          .skill-list {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .skill-icon {
            width: 112px;
            height: 112px;
          }
          .skill-icon svg {
            width: 88px;
            height: 88px;
          }
          .skill-row p {
            font-size: 0.9rem;
          }
        }
        @keyframes iconColorWave {
          0% {
            fill: #191919;
          }
          18% {
            fill: #191919;
          }
          38% {
            fill: var(--brand-color, #191919);
          }
          62% {
            fill: var(--brand-color, #191919);
          }
          82% {
            fill: #191919;
          }
          100% {
            fill: #191919;
          }
        }
      `}</style>
    </div>
  );
}
