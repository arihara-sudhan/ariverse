import { listContentComments, listVisibleProfileLinks } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';
import Header from '../src/components/Header';
import { useEffect, useRef, useState } from 'react';
const HERO_ARI_URL = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/ari.webp';
const HERO_FLOWER_URL = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/glory-lily.webp';
const AALKAATTI_URL = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/aalkaatti.webp';
const TIGER_URL = '/assets/tiger.png';
const FEATURE_IMAGES = [
  { src: HERO_FLOWER_URL, alt: 'Glory lily flower' },
  { src: AALKAATTI_URL, alt: 'Aalkaatti artwork' },
  { src: TIGER_URL, alt: 'Tiger illustration' },
];
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

export async function getStaticProps() {
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
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function HomePage({ profileLinks }) {
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [contactIndex, setContactIndex] = useState(0);
  const [isContactPaused, setIsContactPaused] = useState(false);
  const [mailState, setMailState] = useState('idle');
  const [mailMessage, setMailMessage] = useState('');
  const [subscriptionState, setSubscriptionState] = useState('idle');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [featureImage, setFeatureImage] = useState(FEATURE_IMAGES[0]);
  const contactResumeTimerRef = useRef(null);
  const mailResetTimerRef = useRef(null);
  const subscriptionResetTimerRef = useRef(null);
  const CAROUSEL_RESUME_DELAY_MS = 5000;

  function clearCarouselResumeTimer(timerRef) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleCarouselResume(setPaused, timerRef) {
    clearCarouselResumeTimer(timerRef);
    timerRef.current = setTimeout(() => {
      setPaused(false);
      timerRef.current = null;
    }, CAROUSEL_RESUME_DELAY_MS);
  }

  async function handleMailSubmit(event) {
    event.preventDefault();
    if (mailState === 'sending') return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    setMailState('sending');
    setMailMessage('Sending your message...');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: String(formData.get('name') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          subject: 'Message from Ariverse',
          message: String(formData.get('message') || '').trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to send your message right now.');
      }

      form.reset();
      setMailState('success');
      setMailMessage(payload?.message || 'Message sent. ARI will get back to you soon.');

      if (mailResetTimerRef.current) clearTimeout(mailResetTimerRef.current);
      mailResetTimerRef.current = setTimeout(() => {
        setMailState('idle');
        setMailMessage('');
        mailResetTimerRef.current = null;
      }, 3500);
    } catch (_error) {
      setMailState('error');
      setMailMessage('Unable to send right now. Please try again.');

      if (mailResetTimerRef.current) clearTimeout(mailResetTimerRef.current);
      mailResetTimerRef.current = setTimeout(() => {
        setMailState('idle');
        setMailMessage('');
        mailResetTimerRef.current = null;
      }, 4500);
    }
  }

  useEffect(() => {
    setFeatureImage(FEATURE_IMAGES[Math.floor(Math.random() * FEATURE_IMAGES.length)]);
  }, []);

  useEffect(
    () => () => {
      if (contactResumeTimerRef.current) clearTimeout(contactResumeTimerRef.current);
      if (mailResetTimerRef.current) clearTimeout(mailResetTimerRef.current);
      if (subscriptionResetTimerRef.current) clearTimeout(subscriptionResetTimerRef.current);
    },
    [],
  );

  async function handleSubscribeSubmit(event) {
    event.preventDefault();
    if (subscriptionState === 'sending') return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubscriptionState('sending');
    setSubscriptionMessage('Subscribing you to Ariverse...');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: String(formData.get('email') || '').trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to subscribe right now.');
      }

      form.reset();
      setSubscriptionState('success');
      setSubscriptionMessage(payload?.message || 'Subscribed! You will receive Ariverse updates.');

      if (subscriptionResetTimerRef.current) clearTimeout(subscriptionResetTimerRef.current);
      subscriptionResetTimerRef.current = setTimeout(() => {
        setSubscriptionState('idle');
        setSubscriptionMessage('');
        subscriptionResetTimerRef.current = null;
      }, 3500);
    } catch (_error) {
      setSubscriptionState('error');
      setSubscriptionMessage('Unable to subscribe right now. Please try again.');

      if (subscriptionResetTimerRef.current) clearTimeout(subscriptionResetTimerRef.current);
      subscriptionResetTimerRef.current = setTimeout(() => {
        setSubscriptionState('idle');
        setSubscriptionMessage('');
        subscriptionResetTimerRef.current = null;
      }, 4500);
    }
  }

  const contactSlides = [
    {
      eyebrow: 'leaf',
      title: 'Drop ARI a message',
      note: "Drop ARI a message and He'll get back to you!",
      body: (
        <form onSubmit={handleMailSubmit}>
          <label htmlFor="contact-name">Your Name</label>
          <input
            id="contact-name"
            name="name"
            type="text"
            placeholder="Your name"
            required
          />

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

          <button type="submit" disabled={mailState === 'sending' || mailState === 'success'}>
            {mailState === 'sending' ? 'Sending...' : mailState === 'success' ? 'Sent ✓' : 'Send Message'}
          </button>
          {mailMessage ? (
            <p className={`contact-status ${mailState}`}>{mailMessage}</p>
          ) : null}
        </form>
      ),
    },
    {
      eyebrow: 'ember',
      title: 'Subscribe to Ariverse',
      note: 'Get updates when new career posts, projects, experiments, lectures, books, clay play, and books read entries are added.',
      body: (
        <form onSubmit={handleSubscribeSubmit}>
          <label htmlFor="subscribe-email">Your Email</label>
          <input
            id="subscribe-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />

          <button type="submit" disabled={subscriptionState === 'sending' || subscriptionState === 'success'}>
            {subscriptionState === 'sending' ? 'Subscribing...' : subscriptionState === 'success' ? 'Subscribed ✓' : 'Subscribe'}
          </button>
          {subscriptionMessage ? (
            <p className={`contact-status ${subscriptionState}`}>{subscriptionMessage}</p>
          ) : null}
        </form>
      ),
    },
  ];

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

  useEffect(() => {
    if (isContactPaused || contactSlides.length <= 1) return undefined;

    const timer = setInterval(() => {
      setContactIndex((prev) => (prev + 1) % contactSlides.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [contactSlides.length, isContactPaused]);

  function handleContactCardClick() {
    setIsContactPaused(true);
    scheduleCarouselResume(setIsContactPaused, contactResumeTimerRef);
  }

  function shouldIgnoreCarouselKey(event) {
    const target = event.target;
    return Boolean(
      target &&
      target.closest &&
      target.closest('input, textarea, select, button, a, [contenteditable="true"]')
    );
  }

  function handleContactMouseEnter() {
    setIsContactPaused(true);
    clearCarouselResumeTimer(contactResumeTimerRef);
  }

  function handleContactMouseLeave() {
    if (!isContactPaused) return;
    scheduleCarouselResume(setIsContactPaused, contactResumeTimerRef);
  }

  function goToContactSlide(nextIndex) {
    setContactIndex(nextIndex);
    setIsContactPaused(true);
    scheduleCarouselResume(setIsContactPaused, contactResumeTimerRef);
  }

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
      'Beyond formal work, these are the things I pursue with heart: lectures, experiments, trophies, writing, and timeless wisdom. This section reflects how I learn, share, and grow through ideas that truly move me.',
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
                    const safeHref = typeof resolvedHref === 'string' && (resolvedHref === '#' || resolvedHref.startsWith('/') || resolvedHref.startsWith('https://'))
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
            <img
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              src={featureImage.src}
              alt={featureImage.alt}
            />
          </figure>
          <section className="feature-copy">
            <div
              className="contact-carousel"
              onMouseEnter={handleContactMouseEnter}
              onMouseLeave={handleContactMouseLeave}
              onClick={handleContactCardClick}
              role="button"
              tabIndex={0}
              aria-pressed={isContactPaused}
              aria-label="Contact card carousel"
              onKeyDown={(event) => {
                if (shouldIgnoreCarouselKey(event)) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleContactCardClick();
                }
              }}
            >
              <div className="contact-carousel-viewport">
                <div className="contact-carousel-track">
                  {contactSlides.map((slide, index) => (
                    <article
                      className={`contact-card contact-carousel-panel ${index === contactIndex ? 'is-active' : ''}`}
                      key={slide.title}
                      aria-hidden={index !== contactIndex}
                    >
                      <p className="eyebrow">{slide.eyebrow}</p>
                      <h2>{slide.title}</h2>
                      <p className="contact-note">{slide.note}</p>
                      {slide.body}
                    </article>
                  ))}
                </div>
              </div>
              {isContactPaused ? (
                <div className="contact-carousel-controls" aria-label="Contact navigation">
                  {contactIndex > 0 ? (
                    <button
                      type="button"
                      className="contact-carousel-arrow"
                      aria-label="Previous contact card"
                      onClick={(event) => {
                        event.stopPropagation();
                        goToContactSlide(contactIndex - 1);
                      }}
                    >
                      <span aria-hidden="true">{"\u2190"}</span>
                    </button>
                  ) : null}
                  <span className="contact-carousel-count" aria-live="polite">
                    {contactIndex + 1}/{contactSlides.length}
                  </span>
                  {contactIndex < contactSlides.length - 1 ? (
                    <button
                      type="button"
                      className="contact-carousel-arrow"
                      aria-label="Next contact card"
                      onClick={(event) => {
                        event.stopPropagation();
                        goToContactSlide(contactIndex + 1);
                      }}
                    >
                      <span aria-hidden="true">{"\u2192"}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        </section>

      </main>
    </div>
  );
}



