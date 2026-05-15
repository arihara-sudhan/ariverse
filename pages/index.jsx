import { listVisibleProfileLinks } from '../lib/adminData';
import Header from '../src/components/Header';
const HERO_ARI_URL = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/hero/ari.png';
const HERO_FLOWER_URL = 'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/hero/glory-lily.png';

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
  const safeLinks = Array.isArray(profileLinks) ? profileLinks : [];

  return (
    <div className="site" id="home">
      <Header />

      <main className="content">
        <section className="hero" id="about">
          <section className="intro">
            <p className="eyebrow">Personal Space</p>
            <h1>
              I am Ari, a boy hails from The South, aiming beyond <span className="no-wrap">The Sky</span>
            </h1>
            <p className="summary">
              A minimal monochrome space for ideas, projects, and notes. Built with calm rhythm,
              balanced typography, and room to breathe.
            </p>
          </section>

          <figure className="photo-block">
            <img src={HERO_ARI_URL} alt="Portrait of Ari" />
          </figure>
        </section>

        <section className="closing" id="contact">
          <div className="link-group">
            {safeLinks.map((link) => {
              const isExternal = link.href.startsWith('http');

              return (
                <a
                  key={link.id}
                  href={link.href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noreferrer' : undefined}
                >
                  <span>{link.label}</span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="feature">
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

