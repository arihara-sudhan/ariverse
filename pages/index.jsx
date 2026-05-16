import { listVisibleProfileLinks } from '../lib/adminData';
import Header from '../src/components/Header';
import { useEffect, useState } from 'react';
const HERO_ARI_URL = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/hero/ari.png';
const HERO_FLOWER_URL = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/hero/glory-lily.jpg';
const WELCOME_MESSAGES = [
  { lang: 'en', text: 'Welcome to ARIVERSE...' },
  { lang: 'ta', text: 'அரிவெர்சுக்கு வரவேற்கிறோம்...' }
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

  const safeLinks = Array.isArray(profileLinks) ? profileLinks : [];
  const preferredOrder = [
    'Works',
    'Projects',
    'Resume',
    'Guest Lectures',
    'AI with ARI (YouTube)',
    'Experiments',
    'Learnings',
    'Books Written',
    'AriZone (Blog)',
    'Thirukkural',
    'Clay Play',
    'Ariyin Kavithaigal',
    'Books Read',
    'Book Reviews',
    'Binomial Names',
  ];
  const orderIndex = new Map(preferredOrder.map((label, idx) => [label, idx]));

  const groupedLinks = ['PROFESSIONAL', 'PASSIONAL', 'HOBBYAL'].map((category) => {
    const items = safeLinks
      .filter((link) => {
        const normalizedCategory =
          link.label === 'Experiments' ? 'PROFESSIONAL' : (link.category || 'PASSIONAL').toUpperCase();
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
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    PASSIONAL:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    HOBBYAL:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
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
            <img src={HERO_ARI_URL} alt="Portrait of Ari" />
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
                      link.label === 'Resume'
                        ? 'https://arihara-sudhan.github.io/resume/resume.pdf'
                        : link.label === 'Thirukkural'
                          ? 'https://arihara-sudhan.github.io/uyir-kural/'
                        : link.href;
                    const isExternal = resolvedHref.startsWith('http');

                    return (
                      <a
                        key={link.id}
                        href={resolvedHref}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noreferrer' : undefined}
                      >
                        {link.label}
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
            <img src={HERO_FLOWER_URL} alt="Glory lily flower" />
          </figure>
          <section className="feature-copy">
            <div className="contact-card">
              <p className="eyebrow">leaf</p>
              <h2>Get in Touch</h2>
              <p className="contact-note">Drop ARI a message and He&apos;ll get back to you!</p>

              <label htmlFor="contact-email">Your Email</label>
              <input id="contact-email" type="email" placeholder="you@example.com" />

              <label htmlFor="contact-message">Your Message</label>
              <textarea id="contact-message" placeholder="Write your message here..." rows="4" />

              <button type="button">Send Message</button>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
