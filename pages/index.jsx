import { listVisibleProfileLinks } from '../lib/adminData';
import Header from '../src/components/Header';
import { useEffect, useState } from 'react';
const HERO_ARI_URL = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/ari.png';
const HERO_FLOWER_URL = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/glory-lily.jpg';
const WELCOME_MESSAGES = [
  { lang: 'en', text: 'Welcome to ARIVERSE...' },
  { lang: 'ta', text: 'அரிவெர்சுக்கு வரவேற்கிறோம்...' }
];

const HOME_FALLBACK_LINKS = [
  { id: 'f-career', label: 'Career', href: '/ari_career', category: 'PROFESSIONAL' },
  { id: 'f-projects', label: 'Projects', href: '/projects', category: 'PROFESSIONAL' },
  { id: 'f-skillset', label: 'Skillset', href: '/skillset', category: 'PROFESSIONAL' },
  { id: 'f-resume', label: 'Resume', href: '/ari-resume', category: 'PROFESSIONAL' },
  { id: 'f-youtube', label: 'AI with ARI (YouTube)', href: '/ai-with-ari', category: 'PASSIONAL' },
  { id: 'f-experiments', label: 'Experiments', href: '/aris-xperiments', category: 'PASSIONAL' },
  { id: 'f-mini-projects', label: 'Mini-Projects', href: '/mini-projects', category: 'PROFESSIONAL' },
  { id: 'f-my-books', label: 'My Books', href: '/aris-books', category: 'PASSIONAL' },
  { id: 'f-blog', label: 'AriZone (Blog)', href: 'https://arihara-sudhan.github.io/blog/', category: 'HOBBYAL' },
  { id: 'f-thirukkural', label: 'திருக்குறள்', href: 'https://arihara-sudhan.github.io/uyir-kural/', category: 'PASSIONAL' },
  { id: 'f-guest', label: 'Guest Lectures', href: '/guest-lectures', category: 'PASSIONAL' },
  { id: 'f-clay', label: 'Clay Play', href: '/clay-play', category: 'HOBBYAL' },
  { id: 'f-kavithaigal', label: 'அரியின் கவிதைகள்', href: '/ariyin-kavithaigal', category: 'HOBBYAL' },
  { id: 'f-books-read', label: 'Books Read', href: '/ari-read-books', category: 'HOBBYAL' },
  { id: 'f-reviews', label: 'Book Reviews', href: '/book-reviews', category: 'HOBBYAL' },
  { id: 'f-binomial', label: 'Binomial Names', href: '/binomial-names', category: 'HOBBYAL' },
];

export async function getServerSideProps() {
  let profileLinks = [];

  try {
    profileLinks = await listVisibleProfileLinks();
  } catch (_error) {
    profileLinks = [];
  }

  return {
    props: {
      profileLinks,
    },
  };
}

export default function HomePage({ profileLinks }) {
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentMessage = WELCOME_MESSAGES[welcomeIndex].text;
    const isFullyTyped = typedText === currentMessage;
    const isFullyDeleted = typedText.length === 0;

    let delay = isDeleting ? 38 : 72;

    if (isFullyTyped && !isDeleting) {
      delay = 1100;
    }

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (isFullyTyped) {
          setIsDeleting(true);
          return;
        }

        setTypedText(currentMessage.slice(0, typedText.length + 1));
        return;
      }

      if (!isFullyDeleted) {
        setTypedText(currentMessage.slice(0, typedText.length - 1));
        return;
      }

      setIsDeleting(false);
      setWelcomeIndex((prev) => (prev + 1) % WELCOME_MESSAGES.length);
    }, delay);

    return () => clearTimeout(timer);
  }, [isDeleting, typedText, welcomeIndex]);

  const safeLinks = Array.isArray(profileLinks) && profileLinks.length > 0 ? profileLinks : HOME_FALLBACK_LINKS;
  const hasMiniProjects = safeLinks.some((link) => String(link.label).trim() === 'Mini-Projects');
  const normalizedLinks = hasMiniProjects
    ? safeLinks
    : [
        ...safeLinks,
        {
          id: 'fallback-mini-projects',
          label: 'Mini-Projects',
          href: '/mini-projects',
          category: 'PROFESSIONAL',
          sortOrder: Number.MAX_SAFE_INTEGER,
          isHidden: 0,
        },
      ];
  const preferredOrder = [
    'Career',
    'Works',
    'Experience',
    'Skillset',
    'Projects',
    'Mini-Projects',
    'Resume',
    'Experiments',
    'Guest Lectures',
    'AI with ARI (YouTube)',
    'My Books',
    'AriZone (Blog)',
    'திருக்குறள்',
    'Thirukkural',
    'Clay Play',
    'அரியின் கவிதைகள்',
    'Books Read',
    'Book Reviews',
    'Binomial Names',
  ];
  const orderIndex = new Map(preferredOrder.map((label, idx) => [label, idx]));

  const groupedLinks = ['PROFESSIONAL', 'PASSIONAL', 'HOBBYAL'].map((category) => {
    const items = normalizedLinks
      .filter((link) => {
        const normalizedCategory = (link.category || 'PASSIONAL').toUpperCase();
        return normalizedCategory === category;
      })
      .sort((a, b) => {
        const aIdx = orderIndex.has(a.label) ? orderIndex.get(a.label) : Number.MAX_SAFE_INTEGER;
        const bIdx = orderIndex.has(b.label) ? orderIndex.get(b.label) : Number.MAX_SAFE_INTEGER;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return String(a.label).localeCompare(String(b.label));
      });
    return { category, items };
  });
  const categoryCopy = {
    PROFESSIONAL:
      'This space holds my practical journey: real work, crafted projects, core skills, and lived experience. I focus on solving meaningful problems with consistent learning, clean execution, and long-term thinking.',
    PASSIONAL:
      'Beyond formal work, these are the things I pursue with heart: lectures, experiments, writing, and timeless wisdom. This section reflects how I learn, share, and grow through ideas that truly move me.',
    HOBBYAL:
      'Here live my creative and personal explorations - clay, poetry, reading trails, reflections, and scientific wonder. These are not side notes; they are the quiet roots that shape how I think and build.',
  };

  return (
    <div className="site" id="home">
      <Header />

      <main className="content">
        <section className="hero" id="about">
          <section className="intro">
            <h1>
              <span className="intro-title-main">I am ARI</span>
              <span className="intro-title-sub">
                A boy hails from the South, aiming beyond The Sky. Each day, I try
                reaching the buds of knowledge in this vast universe, waiting for my touch.
                With insatiable curiosity, I learn, love, live, and teach. This is my world, which I shape
                meticulously.
              </span>
            </h1>
            <p className="intro-title-note" aria-live="polite">
              <span lang={WELCOME_MESSAGES[welcomeIndex].lang}>{typedText}</span>
              <span className="type-caret" aria-hidden="true">
                |
              </span>
            </p>
          </section>

          <figure className="photo-block">
            <img loading="eager" fetchPriority="high" decoding="async" draggable={false} src={HERO_ARI_URL} alt="Portrait of Ari" />
          </figure>
        </section>

        <section className="quote-band" aria-label="Quote">
          <p className="quote-line">
            Be <span className="quote-strike">Nothing!</span> <span className="quote-everything">Everything!</span>
          </p>
          <p className="quote-author">
            - ARI<span className="quote-strike">STOTLE</span>
          </p>
        </section>

        <section className="category-sections" aria-label="Link categories">
          {groupedLinks.map((group, idx) => (
            <section key={group.category} className={`category-band category-band-${idx + 1}`}>
              <div className="category-content">
                <div className="category-copy">
                  <h2>{group.category}</h2>
                  <p>{categoryCopy[group.category]}</p>
                </div>
                <div className="category-links">
                  {group.items.map((link) => {
                    const resolvedHref =
                      link.label === 'Skillset'
                        ? '/skillset'
                      : link.label === 'Books Read'
                        ? '/ari-read-books'
                        : link.href;
                    const safeHref = typeof resolvedHref === 'string' && (resolvedHref.startsWith('/') || resolvedHref.startsWith('https://'))
                      ? resolvedHref
                      : '/';
                    const isExternal = safeHref.startsWith('http');

                    const displayLabel =
                      link.label === 'Works' || link.label === 'Experience'
                        ? 'Career'
                        : link.label;

                    return (
                      <a
                        key={link.id}
                        href={safeHref}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noreferrer' : undefined}
                      >
                        {displayLabel}
                      </a>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </section>

        <section className="feature" id="contact">
          <figure className="feature-image">
            <img loading="lazy" decoding="async" draggable={false} src={HERO_FLOWER_URL} alt="Glory lily flower" />
          </figure>
          <section className="feature-copy">
            <div className="contact-card">
              <p className="eyebrow">leaf</p>
              <h2>Get in Touch</h2>
              <p className="contact-note">Drop ARI a message and He&apos;ll get back to you!</p>
              <form action="https://formspree.io/f/xaqddpnz" method="POST">
                <label htmlFor="contact-email">Your Email</label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />

                <label htmlFor="contact-message">Your Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  placeholder="Write your message here..."
                  rows="4"
                  required
                />

                <button type="submit">Send Message</button>
              </form>
            </div>
          </section>
        </section>

      </main>
    </div>
  );
}
