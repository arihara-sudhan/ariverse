import Head from 'next/head';
import styles from '../src/ari-folio.module.css';

const selectedWork = [
  {
    number: '01',
    title: 'Production ML Systems',
    description: 'Models designed around real constraints, measurable outcomes, and reliable deployment.',
    detail: 'Machine Learning · MLOps',
  },
  {
    number: '02',
    title: 'Agentic Workflows',
    description: 'Tool-using agents and automations that turn multi-step work into dependable systems.',
    detail: 'Agents · Automation',
  },
  {
    number: '03',
    title: 'Applied Deep Learning',
    description: 'Focused experiments that move from model behavior to useful product capability.',
    detail: 'Deep Learning · Applied AI',
  },
];

const focusAreas = [
  ['Deep Learning', 'Training, adapting, and evaluating neural models for applied problems.'],
  ['Applied AI', 'Turning model capability into products people can use and trust.'],
  ['MLOps', 'Building repeatable paths from experiment to observable production system.'],
  ['Agentic Systems', 'Designing agents that reason with tools, context, and clear boundaries.'],
];

const buildSteps = [
  ['01', 'Understand', 'Define the real problem, constraints, and useful measure of success.'],
  ['02', 'Prototype', 'Build the smallest system that can test the important assumption.'],
  ['03', 'Measure', 'Evaluate behavior, failure modes, cost, and operational fit.'],
  ['04', 'Productionize', 'Make it reliable, observable, maintainable, and ready to improve.'],
];

function SectionTitle({ index, children }) {
  return (
    <div className={styles.sectionTitle}>
      <span>{index}</span>
      <h2>{children}</h2>
    </div>
  );
}

export default function AriFolioPage() {
  return (
    <>
      <Head>
        <title>Ariharasudhan S — AI Engineer</title>
        <meta
          name="description"
          content="Ariharasudhan S — AI Engineer building models, agents, and production ML systems."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main className={styles.page}>
        <section id="top" className={styles.hero} aria-labelledby="folio-title">
          <picture className={styles.backgroundWrap} aria-hidden="true">
            <source media="(max-width: 620px)" srcSet="/ari-folio/folio-bg-mobile.png" />
            <img className={styles.background} src="/ari-folio/folio-bg-system.png" alt="" />
          </picture>
          <div className={styles.shade} aria-hidden="true" />

          <div className={styles.intro}>
            <h1 id="folio-title">Ariharasudhan S</h1>
            <p className={styles.role}>
              AI Engineer building models, agents, and production ML systems.
            </p>

            <p className={styles.specialties}>
              Deep Learning <span>·</span> Applied AI <span>·</span> MLOps <span>·</span> Agentic Systems
            </p>

            <div className={styles.meta} aria-label="Career summary">
              <span>3+ years</span>
              <span>Zoho → Moative</span>
              <span>Chennai, India</span>
              <span>Open to global remote</span>
            </div>

            <div className={styles.socials} aria-label="Social profiles">
              <a href="/">
                AriVerse <span aria-hidden="true">↗</span>
              </a>
              <a href="https://github.com/arihara-sudhan" target="_blank" rel="noreferrer">
                GitHub <span aria-hidden="true">↗</span>
              </a>
              <a href="https://www.linkedin.com/in/arihara-sudhan/" target="_blank" rel="noreferrer">
                LinkedIn <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>

        <div className={styles.sections}>
          <section id="selected-work" className={styles.portfolioSection}>
            <SectionTitle index="01">Selected Work</SectionTitle>
            <div className={styles.workList}>
              {selectedWork.map((work) => (
                <a className={styles.workRow} href="/projects" key={work.number}>
                  <span className={styles.rowNumber}>{work.number}</span>
                  <div>
                    <h3>{work.title}</h3>
                    <p>{work.description}</p>
                  </div>
                  <span className={styles.rowDetail}>{work.detail}</span>
                  <span className={styles.rowArrow} aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </section>

          <section id="what-i-work-on" className={styles.portfolioSection}>
            <SectionTitle index="02">What I Work On</SectionTitle>
            <div className={styles.focusGrid}>
              {focusAreas.map(([title, description]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="experience" className={styles.portfolioSection}>
            <SectionTitle index="03">Experience</SectionTitle>
            <div className={styles.timeline}>
              <article>
                <p className={styles.timelineMeta}>Present · Chennai, India</p>
                <h3>AI Engineer · Moative</h3>
                <p>Building applied AI systems, model-driven products, and production workflows.</p>
              </article>
              <article>
                <p className={styles.timelineMeta}>Previously · Chennai, India</p>
                <h3>Engineer · Zoho</h3>
                <p>Worked on software systems where reliability, scale, and clear engineering mattered.</p>
              </article>
            </div>
          </section>

          <section id="research" className={styles.portfolioSection}>
            <SectionTitle index="04">Research &amp; Deeper Work</SectionTitle>
            <div className={styles.researchLayout}>
              <p className={styles.largeStatement}>
                Looking past the demo to understand why intelligent systems work,
                where they fail, and how they can become dependable.
              </p>
              <ul>
                <li>Model behavior and failure modes</li>
                <li>Evaluation before scale</li>
                <li>Reliable learning systems</li>
                <li>Human–AI collaboration</li>
              </ul>
            </div>
          </section>

          <section id="labs" className={styles.portfolioSection}>
            <SectionTitle index="05">Labs</SectionTitle>
            <a className={styles.featureLink} href="/aris-xperiments">
              <span>
                <small>Ongoing experiments</small>
                <strong>Small tests. Fast feedback. Working code.</strong>
              </span>
              <span aria-hidden="true">Explore Labs ↗</span>
            </a>
          </section>

          <section id="how-i-build" className={styles.portfolioSection}>
            <SectionTitle index="06">How I Build</SectionTitle>
            <div className={styles.buildGrid}>
              {buildSteps.map(([number, title, description]) => (
                <article key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="about-ari" className={styles.portfolioSection}>
            <SectionTitle index="07">About Ari</SectionTitle>
            <div className={styles.aboutLayout}>
              <p className={styles.largeStatement}>
                I’m Ariharasudhan, an AI engineer interested in the full path from
                learning systems to useful, production-ready software.
              </p>
              <p>
                I work across deep learning, applied AI, MLOps, and agentic systems.
                My approach is practical: understand the problem, test the core idea,
                measure what matters, and build for the real environment.
              </p>
            </div>
          </section>

          <section id="contact" className={`${styles.portfolioSection} ${styles.contactSection}`}>
            <SectionTitle index="08">Contact</SectionTitle>
            <div className={styles.contactLayout}>
              <h2>Have a difficult AI problem?</h2>
              <a className={styles.contactCta} href="/#contact">Let’s talk <span aria-hidden="true">↗</span></a>
            </div>
            <div className={styles.footerLinks}>
              <a href="/">AriVerse ↗</a>
              <a href="https://github.com/arihara-sudhan" target="_blank" rel="noreferrer">GitHub ↗</a>
              <a href="https://www.linkedin.com/in/arihara-sudhan/" target="_blank" rel="noreferrer">LinkedIn ↗</a>
              <a href="#top">Back to top ↑</a>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
