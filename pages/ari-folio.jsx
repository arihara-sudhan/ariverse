import Head from 'next/head';
import folioData from '../public/ari-folio/data.json';
import styles from '../src/ari-folio.module.css';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ariverse.in').replace(/\/+$/, '');
const PROFILE_PATH = '/ari-folio';
const FALLBACK_IMAGE = `${SITE_URL}/assets/hero.png`;
const SEO_KEYWORDS = [
  'Ariharasudhan S',
  'AI Engineer',
  'AI ML Engineer',
  'Deep Learning Engineer',
  'Applied AI Engineer',
  'MLOps',
  'Agentic Systems',
  'Production ML',
  'Chennai AI Engineer',
];

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getInitials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getLinkEntries(links) {
  return Object.entries(links || {});
}

function getDegreeLines(degree) {
  const parts = String(degree || '')
    .split(',')
    .map((line) => line.trim())
    .filter(Boolean);

  return parts.map((line, index) => (index < parts.length - 1 ? `${line},` : line));
}

function isExternalLink(href) {
  return /^https?:\/\//i.test(href);
}

function toAbsoluteUrl(pathname) {
  if (!pathname) return SITE_URL;
  if (isExternalLink(pathname)) return pathname;
  return `${SITE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function toJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function Section({ label, children }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionLabel}>{label}</h2>
      {children}
    </section>
  );
}

export default function AriFolioPage() {
  const education = toArray(folioData.education);
  const linkEntries = getLinkEntries(folioData.links);
  const profileRole = folioData.role || folioData.experience?.[0]?.role || '';
  const pageTitle = 'Ari | AI/ML/Deep Learning Engineer';
  const canonicalUrl = toAbsoluteUrl(PROFILE_PATH);
  const profileImage = toAbsoluteUrl(folioData.dp || FALLBACK_IMAGE);
  const seoDescription = `${folioData.name} is an ${profileRole} in ${folioData.location}, building applied AI, deep learning, agentic systems, and production ML workflows.`;
  const sameAs = linkEntries
    .map(([, href]) => href)
    .filter(isExternalLink);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: pageTitle,
    url: canonicalUrl,
    description: seoDescription,
    image: profileImage,
    mainEntity: {
      '@type': 'Person',
      name: folioData.name,
      jobTitle: profileRole,
      image: profileImage,
      url: canonicalUrl,
      homeLocation: {
        '@type': 'Place',
        name: folioData.location,
      },
      sameAs,
      knowsAbout: [
        'Deep Learning',
        'Applied AI',
        'MLOps',
        'Agentic Systems',
        'Production ML Systems',
      ],
      worksFor: folioData.experience?.[0]?.company
        ? {
            '@type': 'Organization',
            name: folioData.experience[0].company,
          }
        : undefined,
      alumniOf: education
        .map((item) => item.collegename || item.school)
        .filter(Boolean)
        .map((name) => ({
          '@type': 'CollegeOrUniversity',
          name,
        })),
    },
    hasPart: [
      ...(folioData.selected_work || []).map((item) => ({
        '@type': 'CreativeWork',
        name: item.name,
        url: item.link || canonicalUrl,
        description: item.description || item.oneliner,
        dateCreated: item.year ? String(item.year) : undefined,
      })),
    ],
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={seoDescription}
          key="description"
        />
        <meta name="author" content={folioData.name} />
        <meta name="keywords" content={SEO_KEYWORDS.join(', ')} />
        <meta name="robots" content="index, follow, max-image-preview:large" key="robots" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="AriVerse" />
        <meta property="og:title" content={pageTitle} key="og:title" />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={profileImage} key="og:image" />
        <meta property="og:image:alt" content={`${folioData.name} profile photo`} />
        <meta property="profile:username" content="arihara-sudhan" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} key="twitter:title" />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={profileImage} key="twitter:image" />
        <meta name="twitter:image:alt" content={`${folioData.name} profile photo`} />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#0b111c" key="theme-color" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          html,
          body {
            scrollbar-width: thin;
            scrollbar-color: #2b3a4c #0b111c;
          }

          html::-webkit-scrollbar,
          body::-webkit-scrollbar {
            width: 4px;
            height: 4px;
          }

          html::-webkit-scrollbar-track,
          body::-webkit-scrollbar-track {
            background: #0b111c;
          }

          html::-webkit-scrollbar-thumb,
          body::-webkit-scrollbar-thumb {
            background: #2b3a4c;
            border-radius: 999px;
          }

          html::-webkit-scrollbar-thumb:hover,
          body::-webkit-scrollbar-thumb:hover {
            background: #3d4f65;
          }
        `}</style>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }}
        />
      </Head>

      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.columns}>
            <aside className={styles.sidebar}>
            {folioData.dp ? (
              <img className={styles.avatar} src={folioData.dp} alt={folioData.name} />
            ) : (
              <div className={styles.avatar} aria-hidden="true">
                {getInitials(folioData.name)}
              </div>
            )}

            <h1 className={styles.name}>{folioData.name}</h1>
            {profileRole ? <p className={styles.role}>{profileRole}</p> : null}
            <p className={styles.location}>{folioData.location}</p>

            {linkEntries.length > 0 ? (
              <nav className={styles.links} aria-label="Profile links">
                {linkEntries.map(([label, href]) => (
                  <a
                    href={href}
                    key={label}
                    target={isExternalLink(href) ? '_blank' : undefined}
                    rel={isExternalLink(href) ? 'noreferrer' : undefined}
                  >
                    {label}
                  </a>
                ))}
              </nav>
            ) : null}

            {education.length > 0 ? (
              <section className={styles.sideSection}>
                <h2>Education</h2>
                <div className={styles.educationList}>
                  {education.map((item) => (
                    <article className={styles.educationItem} key={item.collegename || item.school}>
                      <h3>{item.collegename || item.school}</h3>
                      {getDegreeLines(item.degree).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      {item.field ? <p>{item.field}</p> : null}
                      {item.cgpa ? <p>GPA: {item.cgpa}</p> : null}
                      <span>{item.daterange || item.date}</span>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>

          <div className={styles.content}>
            <Section label="About">
              <p className={styles.lead}>{folioData.about}</p>
              <p className={styles.callout}>{folioData.currently_looking_for}</p>
            </Section>

            {folioData.experience?.length > 0 ? (
              <Section label="Experience">
                <div className={styles.timeline}>
                  {folioData.experience.map((item) => (
                    <article className={styles.entry} key={item.company}>
                      <div className={styles.entryTop}>
                        <h3>{[item.role, item.company].filter(Boolean).join(', ')}</h3>
                        <span>{item.daterange}</span>
                      </div>
                      {item.description ? (
                        <p className={styles.companyDescription}>{item.description}</p>
                      ) : null}
                      {item.work?.length > 0 ? (
                        <ul className={styles.workList}>
                          {item.work.map((work) => (
                            <li key={work.workname}>
                              <strong>{work.workname}.</strong> {work.description}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              </Section>
            ) : null}

            {folioData.selected_work?.length > 0 ? (
              <Section label="Selected Work">
                <div className={styles.selectedWorkList}>
                  {folioData.selected_work.map((item) => (
                    <article className={styles.selectedWorkItem} key={item.name}>
                      <div className={styles.selectedWorkTop}>
                        <div className={styles.selectedWorkTitleLine}>
                          <h3>
                            {item.link ? (
                              <a
                                href={item.link}
                                target={isExternalLink(item.link) ? '_blank' : undefined}
                                rel={isExternalLink(item.link) ? 'noreferrer' : undefined}
                              >
                                {item.name}
                              </a>
                            ) : (
                              item.name
                            )}
                          </h3>
                          {item.oneliner ? (
                            <p>{item.oneliner}</p>
                          ) : null}
                        </div>
                        <span>{item.year}</span>
                      </div>
                      <p className={styles.selectedWorkDescription}>{item.description}</p>
                    </article>
                  ))}
                </div>
              </Section>
            ) : null}

            {folioData.research?.length > 0 ? (
              <Section label="Research">
                <div className={styles.timeline}>
                  {folioData.research.map((item) => (
                    <article className={styles.entry} key={item.name}>
                      <div className={styles.entryTop}>
                        <h3>{item.name}</h3>
                        <span>{item.daterange}</span>
                      </div>
                      <p className={styles.body}>{item.oneliner}</p>
                      <p className={styles.body}>{item.description}</p>
                    </article>
                  ))}
                </div>
              </Section>
            ) : null}
            </div>
          </div>

          <footer className={styles.footer}>
            <p>© 2026 Ariharasudhan, www.ariverse.in</p>
          </footer>
        </div>
      </main>
    </>
  );
}
