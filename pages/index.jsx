import { listFeatureImages, listVisibleProfileLinks } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';
import { HOME_HERO_IMAGE_URL, toPublicStorageUrl } from '../lib/storage';
import Header from '../src/components/Header';
import { useEffect, useRef, useState } from 'react';
const HERO_FLOWER_URL = toPublicStorageUrl('assets/glory-lily.jpg');
const AALKAATTI_URL = toPublicStorageUrl('assets/aalkaatti.png');
const CYNODON_BLOB_URL = 'https://qbghhenrxoupaykgnxyj.supabase.co/storage/v1/object/public/ariverse/assets/cynodon-testimonial-image.webp';
const DEFAULT_FEATURE_IMAGES = [
  { src: HERO_FLOWER_URL, alt: 'Glory lily flower' },
  { src: AALKAATTI_URL, alt: 'Aalkaatti artwork' },
];
const FIXED_TESTIMONIAL = {
  testimonial: 'Be Nothing! Everything!',
  name: 'ARISTOTLE',
  relation: '',
};

function renderFixedTestimonialText() {
  return (
    <>
      Be <span className="quote-panel-strike">Nothing!</span>{' '}
      <span className="quote-panel-everything">Everything!</span>
    </>
  );
}

function renderFixedAuthor() {
  return (
    <>
      ARI<span className="quote-panel-strike">STOTLE</span>
    </>
  );
}

function renderTestimonialAuthor(slide, index) {
  return index === 0 ? renderFixedAuthor() : slide?.name || 'anonymous';
}

function renderTestimonialRole(slide, index) {
  if (index === 0) return '';
  return formatTestimonialRole(slide?.relation || '');
}

function formatTestimonialRole(role) {
  const cleanRole = String(role || '').trim();
  if (!cleanRole) return '';
  return cleanRole.startsWith("Ari's ") ? cleanRole : `Ari's ${cleanRole}`;
}
const WELCOME_MESSAGES = [
  { lang: 'en', text: 'Welcome to ARIVERSE...' },
  { lang: 'ta', text: 'அரிவெர்சுக்கு வரவேற்கிறோம்...' }
];

const HOME_FALLBACK_LINKS = [
  { id: 'f-career', label: 'Career', href: '/ari-career', category: 'PROFESSIONAL' },
  { id: 'f-projects', label: 'Projects', href: '/projects', category: 'PROFESSIONAL' },
  { id: 'f-skillset', label: 'Skillset', href: '/skillset', category: 'PROFESSIONAL' },
  { id: 'f-resume', label: 'Resume', href: '/ari-resume', category: 'PROFESSIONAL' },
  { id: 'f-youtube', label: 'AI with ARI (YouTube)', href: '/ai-with-ari', category: 'PASSIONAL' },
  { id: 'f-experiments', label: 'Experiments', href: '/aris-xperiments', category: 'PASSIONAL' },
  { id: 'f-mini-projects', label: 'Mini-Projects', href: '/mini-projects', category: 'PROFESSIONAL' },
  { id: 'f-my-books', label: 'My Books', href: '/aris-books', category: 'PASSIONAL' },
  { id: 'f-shelf', label: 'Shelf', href: '/aris-shelf', category: 'PASSIONAL' },
  { id: 'f-blog', label: 'Arichuvadi', href: '/arichuvadi', category: 'HOBBYAL' },
  { id: 'f-thirukkural', label: 'திருக்குறள்', href: 'https://arihara-sudhan.github.io/uyir-kural/', category: 'PASSIONAL' },
  { id: 'f-guest', label: 'Guest Lectures', href: '/guest-lectures', category: 'PASSIONAL' },
  { id: 'f-clay', label: 'Clay Play', href: '/clay-play', category: 'HOBBYAL' },
  { id: 'f-kavithaigal', label: 'My Poems', href: '/arichuvadi?category=kavithaigal', category: 'HOBBYAL' },
  { id: 'f-books-read', label: 'Books Read', href: '/ari-read-books', category: 'HOBBYAL' },
  { id: 'f-reviews', label: 'Book Reviews', href: '/book-reviews', category: 'HOBBYAL' },
  { id: 'f-binomial', label: 'Binomial Names', href: '/binomial-names', category: 'HOBBYAL' },
];

export async function getStaticProps() {
  const [profileLinksResult, featureImagesResult] = await Promise.allSettled([
    listVisibleProfileLinks(),
    listFeatureImages(),
  ]);
  const profileLinks = profileLinksResult.status === 'fulfilled' ? profileLinksResult.value : [];
  const featureImages = featureImagesResult.status === 'fulfilled' ? featureImagesResult.value : [];

  return {
    props: {
      profileLinks,
      featureImages,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function HomePage({ profileLinks, featureImages }) {
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [welcomeOutgoingIndex, setWelcomeOutgoingIndex] = useState(null);
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isQuotePaused, setIsQuotePaused] = useState(false);
  const [quoteOutgoingIndex, setQuoteOutgoingIndex] = useState(null);
  const [isQuoteTextVisible, setIsQuoteTextVisible] = useState(true);
  const [quotePanelHeight, setQuotePanelHeight] = useState(null);
  const [publicTestimonials, setPublicTestimonials] = useState([]);
  const quoteSlides = [FIXED_TESTIMONIAL, ...publicTestimonials];
  const [contactIndex, setContactIndex] = useState(0);
  const [isContactPaused, setIsContactPaused] = useState(false);
  const [mailState, setMailState] = useState('idle');
  const [mailMessage, setMailMessage] = useState('');
  const [subscriptionState, setSubscriptionState] = useState('idle');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [testimonialState, setTestimonialState] = useState('idle');
  const [testimonialMessage, setTestimonialMessage] = useState('');
  const [isTypingPaused, setIsTypingPaused] = useState(false);
  const featureImagePool = Array.isArray(featureImages) && featureImages.length > 0
    ? featureImages.map((image) => ({
        src: String(image?.imageUrl || '').trim(),
        alt: 'Feature image',
      })).filter((image) => image.src)
    : DEFAULT_FEATURE_IMAGES;
  const [featureImage] = useState(() => (
    featureImagePool[Math.floor(Math.random() * featureImagePool.length)] || DEFAULT_FEATURE_IMAGES[0]
  ));
  const [isHomeReady, setIsHomeReady] = useState(false);
  const quotePanelRef = useRef(null);
  const quoteBlobRef = useRef(null);
  const quoteMeasureRefs = useRef([]);
  const quoteResumeTimerRef = useRef(null);
  const quoteTextShowTimerRef = useRef(null);
  const quoteTextClearTimerRef = useRef(null);
  const welcomeTransitionTimerRef = useRef(null);
  const contactResumeTimerRef = useRef(null);
  const mailResetTimerRef = useRef(null);
  const subscriptionResetTimerRef = useRef(null);
  const testimonialResetTimerRef = useRef(null);
  const CAROUSEL_RESUME_DELAY_MS = 5000;
  const WELCOME_CROSSFADE_DELAY_MS = 5000;
  const WELCOME_CROSSFADE_MS = 360;
  const QUOTE_PANEL_GAP_PX = 16;
  const TESTIMONIAL_SLIDE_INDEX = 2;
  const hasPublicTestimonials = publicTestimonials.length > 0;

  function clearCarouselResumeTimer(timerRef) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearQuoteTransitionTimers() {
    if (quoteTextShowTimerRef.current) {
      clearTimeout(quoteTextShowTimerRef.current);
      quoteTextShowTimerRef.current = null;
    }
    if (quoteTextClearTimerRef.current) {
      clearTimeout(quoteTextClearTimerRef.current);
      quoteTextClearTimerRef.current = null;
    }
  }

  function clearWelcomeTransitionTimer() {
    if (welcomeTransitionTimerRef.current) {
      clearTimeout(welcomeTransitionTimerRef.current);
      welcomeTransitionTimerRef.current = null;
    }
  }

  function transitionToWelcomeMessage(nextIndex) {
    if (nextIndex === welcomeIndex) return;

    clearWelcomeTransitionTimer();
    setWelcomeOutgoingIndex(welcomeIndex);
    setIsWelcomeVisible(false);
    setWelcomeIndex(nextIndex);

    welcomeTransitionTimerRef.current = setTimeout(() => {
      setIsWelcomeVisible(true);
      setWelcomeOutgoingIndex(null);
      welcomeTransitionTimerRef.current = null;
    }, WELCOME_CROSSFADE_MS);
  }

  function transitionToQuoteSlide(nextIndex) {
    if (nextIndex === quoteIndex) return;

    clearQuoteTransitionTimers();
    setQuoteOutgoingIndex(quoteIndex);
    setIsQuoteTextVisible(false);
    setQuoteIndex(nextIndex);

    quoteTextShowTimerRef.current = setTimeout(() => {
      setIsQuoteTextVisible(true);
      quoteTextShowTimerRef.current = null;
    }, 20);

    quoteTextClearTimerRef.current = setTimeout(() => {
      setQuoteOutgoingIndex(null);
      quoteTextClearTimerRef.current = null;
    }, 240);
  }

  function scheduleCarouselResume(setPaused, timerRef) {
    clearCarouselResumeTimer(timerRef);
    timerRef.current = setTimeout(() => {
      setPaused(false);
      timerRef.current = null;
    }, CAROUSEL_RESUME_DELAY_MS);
  }

  async function loadPublicTestimonials() {
    try {
      const response = await fetch('/api/testimonials');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load testimonials.');
      }
      const items = Array.isArray(payload.testimonials)
        ? payload.testimonials
            .map((item) => ({
              testimonial: String(item?.testimonial || '').trim(),
              name: String(item?.name || '').trim() || 'anonymous',
              relation: String(item?.relation || '').trim(),
            }))
            .filter((item) => item.testimonial)
        : [];
      setPublicTestimonials(items);
    } catch (_error) {
      setPublicTestimonials([]);
    }
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
    loadPublicTestimonials();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function preloadImage(src) {
      if (!src || typeof window === 'undefined') return;

      await new Promise((resolve) => {
        const image = new window.Image();
        image.decoding = 'async';
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = src;
      });
    }

    async function preloadHomepageAssets() {
      const sources = [
        HOME_HERO_IMAGE_URL,
        featureImage?.src,
        CYNODON_BLOB_URL,
      ].filter(Boolean);

      await Promise.allSettled(sources.map((src) => preloadImage(src)));

      if (!cancelled) {
        requestAnimationFrame(() => {
          if (!cancelled) {
            setIsHomeReady(true);
          }
        });
      }
    }

    preloadHomepageAssets();

    return () => {
      cancelled = true;
    };
  }, [featureImage?.src]);

  useEffect(() => {
    function updateQuotePanelHeight() {
      const panel = quotePanelRef.current;
      if (!panel) return;

      const panelStyles = window.getComputedStyle(panel);
      const paddingTop = Number.parseFloat(panelStyles.paddingTop) || 0;
      const textHeights = quoteMeasureRefs.current.reduce((maxHeight, element) => {
        if (!element) return maxHeight;
        return Math.max(maxHeight, element.getBoundingClientRect().height);
      }, 0);

      if (textHeights > 0) {
        setQuotePanelHeight(Math.ceil(paddingTop + textHeights + QUOTE_PANEL_GAP_PX));
      }
    }

    const raf = window.requestAnimationFrame(updateQuotePanelHeight);
    window.addEventListener('resize', updateQuotePanelHeight);

    const blob = quoteBlobRef.current;
    blob?.addEventListener('load', updateQuotePanelHeight);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateQuotePanelHeight);
      blob?.removeEventListener('load', updateQuotePanelHeight);
    };
  }, [quoteSlides.length]);

  useEffect(() => {
    setQuoteIndex(0);
    setQuoteOutgoingIndex(null);
    setIsQuoteTextVisible(true);
  }, [publicTestimonials.length]);

  useEffect(
    () => () => {
      if (welcomeTransitionTimerRef.current) clearTimeout(welcomeTransitionTimerRef.current);
      if (quoteResumeTimerRef.current) clearTimeout(quoteResumeTimerRef.current);
      if (quoteTextShowTimerRef.current) clearTimeout(quoteTextShowTimerRef.current);
      if (quoteTextClearTimerRef.current) clearTimeout(quoteTextClearTimerRef.current);
      if (contactResumeTimerRef.current) clearTimeout(contactResumeTimerRef.current);
      if (mailResetTimerRef.current) clearTimeout(mailResetTimerRef.current);
      if (subscriptionResetTimerRef.current) clearTimeout(subscriptionResetTimerRef.current);
      if (testimonialResetTimerRef.current) clearTimeout(testimonialResetTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setWelcomeIndex(0);
    setWelcomeOutgoingIndex(null);
    setIsWelcomeVisible(true);
  }, []);

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

  async function handleTestimonialSubmit(event) {
    event.preventDefault();
    if (testimonialState === 'sending') return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    setTestimonialState('sending');
    setTestimonialMessage('Sending your testimonial...');

    try {
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: String(formData.get('name') || '').trim(),
          relation: String(formData.get('relation') || '').trim(),
          testimonial: String(formData.get('testimonial') || '').trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to submit testimonial right now.');
      }

      form.reset();
      setTestimonialState('success');
      setTestimonialMessage(payload?.message || 'Testimonial submitted for approval.');
      await loadPublicTestimonials();

      if (testimonialResetTimerRef.current) clearTimeout(testimonialResetTimerRef.current);
      testimonialResetTimerRef.current = setTimeout(() => {
        setTestimonialState('idle');
        setTestimonialMessage('');
        testimonialResetTimerRef.current = null;
      }, 3500);
    } catch (_error) {
      setTestimonialState('error');
      setTestimonialMessage('Unable to submit right now. Please try again.');

      if (testimonialResetTimerRef.current) clearTimeout(testimonialResetTimerRef.current);
      testimonialResetTimerRef.current = setTimeout(() => {
        setTestimonialState('idle');
        setTestimonialMessage('');
        testimonialResetTimerRef.current = null;
      }, 4500);
    }
  }

  const contactSlides = [
    {
      eyebrow: 'leaf',
      title: 'Drop ARI a message',
      note: "Drop ARI a message and He'll get back to you!",
      body: (
        <form onSubmit={handleMailSubmit} onFocusCapture={handleTypingFocus} onBlurCapture={handleTypingBlur}>
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
            {mailState === 'sending' ? 'Sending...' : mailState === 'success' ? 'Sent \u2713' : 'Send Message'}
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
        <form onSubmit={handleSubscribeSubmit} onFocusCapture={handleTypingFocus} onBlurCapture={handleTypingBlur}>
          <label htmlFor="subscribe-email">Your Email</label>
          <input
            id="subscribe-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />

          <button type="submit" disabled={subscriptionState === 'sending' || subscriptionState === 'success'}>
            {subscriptionState === 'sending' ? 'Subscribing...' : subscriptionState === 'success' ? 'Subscribed \u2713' : 'Subscribe'}
          </button>
          {subscriptionMessage ? (
            <p className={`contact-status ${subscriptionState}`}>{subscriptionMessage}</p>
          ) : null}
        </form>
      ),
    },
    {
      eyebrow: 'petal',
      title: 'Share a testimonial for ARI',
      note: 'Tell ARI how you know him and what you feel about working, learning, or being with him.',
      body: (
        <form id="testimonial-form" onSubmit={handleTestimonialSubmit} onFocusCapture={handleTypingFocus} onBlurCapture={handleTypingBlur}>
          <label htmlFor="testimonial-name">Name</label>
          <input
            id="testimonial-name"
            name="name"
            type="text"
            placeholder="Your name"
            required
          />

          <label htmlFor="testimonial-relation">You are what to ARI?</label>
          <select
            id="testimonial-relation"
            className="testimonial-relation-select"
            name="relation"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Choose one
            </option>
            <option value="Class Mate">Class Mate</option>
            <option value="Friend">Friend</option>
            <option value="Colleague">Colleague</option>
            <option value="Manager">Manager</option>
            <option value="Let ARI infer">Let ARI infer</option>
          </select>

          <label htmlFor="testimonial-text">Testimonial</label>
          <textarea
            id="testimonial-text"
            name="testimonial"
            placeholder="Write your testimonial here..."
            rows="4"
            required
          />

          <button type="submit" disabled={testimonialState === 'sending' || testimonialState === 'success'}>
            {testimonialState === 'sending' ? 'Sending...' : testimonialState === 'success' ? 'Sent \u2713' : 'Submit'}
          </button>
          {testimonialMessage ? (
            <p className={`contact-status ${testimonialState}`}>{testimonialMessage}</p>
          ) : null}
        </form>
      ),
    },
  ];

  useEffect(() => {
    if (WELCOME_MESSAGES.length <= 1) return undefined;

    const timer = setInterval(() => {
      transitionToWelcomeMessage((welcomeIndex + 1) % WELCOME_MESSAGES.length);
    }, WELCOME_CROSSFADE_DELAY_MS);

    return () => clearInterval(timer);
  }, [welcomeIndex]);

  useEffect(() => {
    if (isContactPaused || isTypingPaused || contactSlides.length <= 1) return undefined;

    const timer = setInterval(() => {
      setContactIndex((prev) => (prev + 1) % contactSlides.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [contactSlides.length, isContactPaused, isTypingPaused]);

  useEffect(() => {
    if (isQuotePaused || isTypingPaused || quoteSlides.length <= 1) return undefined;

    const timer = setInterval(() => {
      transitionToQuoteSlide((quoteIndex + 1) % quoteSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isQuotePaused, isTypingPaused, quoteIndex, quoteSlides.length]);

  function handleQuoteCardClick() {
    setIsQuotePaused(true);
    scheduleCarouselResume(setIsQuotePaused, quoteResumeTimerRef);
  }

  function handleQuoteMouseEnter() {
    setIsQuotePaused(true);
    clearCarouselResumeTimer(quoteResumeTimerRef);
  }

  function handleQuoteMouseLeave() {
    if (!isQuotePaused) return;
    scheduleCarouselResume(setIsQuotePaused, quoteResumeTimerRef);
  }

  function goToQuoteSlide(nextIndex) {
    transitionToQuoteSlide(nextIndex);
    setIsQuotePaused(true);
    scheduleCarouselResume(setIsQuotePaused, quoteResumeTimerRef);
  }

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

  function isTypingField(target) {
    return Boolean(target && target.closest && target.closest('input, textarea, select'));
  }

  function handleTypingFocus(event) {
    if (isTypingField(event.target)) {
      setIsTypingPaused(true);
    }
  }

  function handleTypingBlur(event) {
    if (isTypingField(event.relatedTarget)) return;
    setIsTypingPaused(false);
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
  const visibleLinks = normalizedLinks.filter((link) => String(link.label || '').trim() !== 'Arichuvadu');
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
    'Shelf',
    'Arichuvadi',
    'திருக்குறள்',
    'Thirukkural',
    'Clay Play',
    'My Poems',
    'Books Read',
    'Book Reviews',
    'Binomial Names',
  ];
  const orderIndex = new Map(preferredOrder.map((label, idx) => [label, idx]));

  const groupedLinks = ['PROFESSIONAL', 'PASSIONAL', 'HOBBYAL'].map((category) => {
    const items = visibleLinks
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
      {!isHomeReady ? (
        <div className="home-loading-screen" aria-label="Loading ARIVERSE">
          <div className="home-loading-screen__title">ARIVERSE</div>
        </div>
      ) : null}
      <Header />

      <main className={`content${isHomeReady ? '' : ' is-hidden-until-ready'}`}>
        <section className="hero" id="about">
          <section className="intro">
            <h1>
              <span className="intro-title-main">I am ARI</span>
              <span className="intro-title-sub">
                An ever young boy hails from the South, aiming beyond The Sky! Each day, I
                reach the buds of knowledge in this vast universe, waiting for my touch and I widen Ariverse with the things I learn, love, and build. I take from the Universe and I make it in Ariverse.
              </span>
            </h1>
            <p className="intro-title-note intro-title-note--swap" aria-live="polite">
              {welcomeOutgoingIndex !== null ? (
                <span
                  className={`intro-title-note__message is-outgoing${isWelcomeVisible ? '' : ' is-fading-out'}`}
                  aria-hidden="true"
                  lang={WELCOME_MESSAGES[welcomeOutgoingIndex].lang}
                >
                  {WELCOME_MESSAGES[welcomeOutgoingIndex].text}
                </span>
              ) : null}
              <span
                className={`intro-title-note__message${isWelcomeVisible ? ' is-visible' : ''}`}
                lang={WELCOME_MESSAGES[welcomeIndex].lang}
              >
                {WELCOME_MESSAGES[welcomeIndex].text}
              </span>
            </p>
          </section>

          <figure className="photo-block">
            <img loading="eager" fetchPriority="high" decoding="async" draggable={false} src={HOME_HERO_IMAGE_URL} alt="Portrait of Ari" />
          </figure>
        </section>

        <div
          ref={quotePanelRef}
          className={`quote-panel ${isQuotePaused ? 'is-paused' : ''}`}
          aria-label="Timeless quotes"
          onMouseEnter={handleQuoteMouseEnter}
          onMouseLeave={handleQuoteMouseLeave}
          onClick={handleQuoteCardClick}
          role="button"
          tabIndex={0}
          aria-pressed={isQuotePaused}
          onKeyDown={(event) => {
            if (shouldIgnoreCarouselKey(event)) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleQuoteCardClick();
            }
          }}
          style={quotePanelHeight ? { height: `${quotePanelHeight}px` } : undefined}
        >
          {quoteOutgoingIndex !== null ? (
            <div
              className={`quote-panel-copy quote-panel-copy-outgoing${quoteOutgoingIndex === 0 ? ' quote-panel-copy-featured' : ''}`}
              aria-hidden="true"
            >
              <p className="quote-panel-text">
                {quoteOutgoingIndex === 0 ? renderFixedTestimonialText() : quoteSlides[quoteOutgoingIndex]?.testimonial}
              </p>
              <p className="quote-panel-author">
                - {renderTestimonialAuthor(quoteSlides[quoteOutgoingIndex], quoteOutgoingIndex)}
                {renderTestimonialRole(quoteSlides[quoteOutgoingIndex], quoteOutgoingIndex) ? (
                  <span className="quote-panel-role">, {renderTestimonialRole(quoteSlides[quoteOutgoingIndex], quoteOutgoingIndex)}</span>
                ) : null}
              </p>
            </div>
          ) : null}
          <div
            className={`quote-panel-copy ${isQuoteTextVisible ? 'is-visible' : ''}${quoteIndex === 0 ? ' quote-panel-copy-featured' : ''}`}
          >
            <p className="quote-panel-text">
              {quoteIndex === 0 ? renderFixedTestimonialText() : quoteSlides[quoteIndex]?.testimonial}
            </p>
            <p className="quote-panel-author">
              - {renderTestimonialAuthor(quoteSlides[quoteIndex], quoteIndex)}
              {renderTestimonialRole(quoteSlides[quoteIndex], quoteIndex) ? (
                <span className="quote-panel-role">, {renderTestimonialRole(quoteSlides[quoteIndex], quoteIndex)}</span>
              ) : null}
            </p>
          </div>
          <img
            ref={quoteBlobRef}
            className="quote-panel-blob"
            loading="lazy"
            decoding="async"
            draggable={false}
            src={CYNODON_BLOB_URL}
            alt=""
            aria-hidden="true"
          />
          <div className="quote-panel-measure" aria-hidden="true">
            {quoteSlides.map((slide, index) => (
              <article
                key={`${slide.name || 'testimonial'}-${index}`}
                ref={(element) => {
                  quoteMeasureRefs.current[index] = element;
                }}
                className={`quote-panel-measure-item${index === 0 ? ' quote-panel-copy-featured' : ''}`}
              >
                <p className="quote-panel-text">{index === 0 ? renderFixedTestimonialText() : slide.testimonial}</p>
                <p className="quote-panel-author">
                  - {renderTestimonialAuthor(slide, index)}
                  {renderTestimonialRole(slide, index) ? (
                    <span className="quote-panel-role">, {renderTestimonialRole(slide, index)}</span>
                  ) : null}
                </p>
              </article>
            ))}
          </div>

          <div className={`quote-panel-controls ${isQuotePaused ? 'is-visible' : ''}`} aria-label="Quote navigation">
            {quoteIndex > 0 ? (
              <button
                type="button"
                className="contact-carousel-arrow quote-panel-arrow"
                aria-label="Previous quote"
                onClick={(event) => {
                  event.stopPropagation();
                  goToQuoteSlide(quoteIndex - 1);
                }}
              >
                <span aria-hidden="true">←</span>
              </button>
            ) : null}
            {hasPublicTestimonials ? (
              <span className="contact-carousel-count" aria-live="polite">
                {quoteIndex + 1}/{quoteSlides.length}
              </span>
            ) : null}
            {quoteIndex < quoteSlides.length - 1 ? (
              <button
                type="button"
                className="contact-carousel-arrow quote-panel-arrow"
                aria-label="Next quote"
                onClick={(event) => {
                  event.stopPropagation();
                  goToQuoteSlide(quoteIndex + 1);
                }}
              >
                <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className={`quote-panel-write-btn ${isQuotePaused ? 'is-visible' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              goToContactSlide(TESTIMONIAL_SLIDE_INDEX);
              const target = document.getElementById('testimonial-form');
              target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            aria-label="Write about ARI"
          >
            Write about ARI
          </button>
        </div>

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
                        className="category-link-shimmer"
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

        <section className="feature" id="testimonials">
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



