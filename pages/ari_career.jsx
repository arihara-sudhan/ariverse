import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import { getProfileLinkByLabel, getSectionHero, listCareerEntries } from '../lib/adminData';

function renderParagraphs(text) {
  const value = typeof text === 'string' ? text.trim() : '';
  if (!value) return null;
  return value.split('\n').filter(Boolean).map((line, index) => (
    <p key={`${line}-${index}`}>{line}</p>
  ));
}

function formatCareerDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function getCareerDateLabel(item) {
  const custom = typeof item?.dateText === 'string' ? item.dateText.trim() : '';
  if (custom) return custom;
  return formatCareerDate(item?.createdAt);
}

export async function getStaticProps() {
  const link = (await getProfileLinkByLabel('Career')) || (await getProfileLinkByLabel('Works'));
  const hero = link
    ? await getSectionHero(link.id, 'Career')
    : { heading: 'Career', description: '', quote: '', imageUrl: '' };
  const items = ((await listCareerEntries()) || []).map((item) => ({
    ...item,
    createdAt: item?.createdAt instanceof Date ? item.createdAt.toISOString() : String(item?.createdAt || ''),
  }));
  return {
    props: {
      hero,
      items,
    },
  };
}

export default function CareerPage({ hero, items }) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="site career-page">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="career-title">
          <SectionHero
            heading={hero?.heading || 'Career'}
            description={hero?.description}
            imageUrl={hero?.imageUrl}
            fallbackHeading="Career"
          >
            {hero?.quote ? <p className="clay-play-quote">"{hero.quote}"</p> : null}
          </SectionHero>
          <h1 id="career-title" style={{ display: 'none' }}>Career</h1>
        </section>

        <section className="career-posts" aria-label="Career posts">
          <div className="career-posts-list">
            {safeItems.map((item) => (
              <article key={item.id} className="career-post">
                <div className="career-post-left">
                  {item.imageUrl ? (
                    <figure className="career-post-image-wrap">
                      <img className="career-post-image" src={item.imageUrl} alt={item.kavithaiFrom || 'Career post'} />
                    </figure>
                  ) : null}
                </div>
                <div className="career-post-right">
                  <div className="career-post-head">
                    <div className="career-post-head-left">
                      <h2>{item.kavithaiFrom || 'Career Post'}</h2>
                      {item.subtitle ? <p className="career-post-subtitle">{item.subtitle}</p> : null}
                    </div>
                    <div className="career-post-head-center">
                      {item.companyLogoUrl ? (
                        <img className="career-post-company-logo" src={item.companyLogoUrl} alt={`${item.kavithaiFrom || 'Company'} logo`} />
                      ) : null}
                    </div>
                  </div>
                  <div className="career-post-desc">{renderParagraphs(item.markdownText)}</div>
                </div>
                {getCareerDateLabel(item) ? (
                  <div className="career-post-date-corner">
                    <span className="career-post-date">{getCareerDateLabel(item)}</span>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
