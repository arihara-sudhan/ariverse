import Header from '../src/components/Header';
import SectionHero from '../src/components/SectionHero';
import LikeButton from '../src/components/LikeButton';
import { getProfileLinkByLabel, getSectionHero, listCareerEntries, listContentEntryReactions } from '../lib/adminData';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '../lib/pageCache';

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
  const likesByEntry = await listContentEntryReactions({
    sectionKey: 'career',
    entryIds: items.map((item) => item.id),
  });
  return {
    props: {
      hero,
      items,
      likesByEntry,
    },
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  };
}

export default function CareerPage({ hero, items, likesByEntry }) {
  const safeItems = Array.isArray(items) ? [...items].reverse() : [];

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
            {safeItems.map((item, index) => (
              <div key={item.id} className="career-post-stack-item">
                <article className="career-post">
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
                    <div className="career-post-meta-row">
                      {getCareerDateLabel(item) ? (
                        <span className="career-post-date">{getCareerDateLabel(item)}</span>
                      ) : null}
                      <LikeButton
                        endpoint="/api/content/reactions"
                        entryId={item.id}
                        initialCount={likesByEntry?.[item.id]?.likesCount || 0}
                        storageNamespace="career"
                        className="career-post-like"
                      />
                    </div>
                  </div>
                </article>
                {index < safeItems.length - 1 ? (
                  <div className="career-post-up-arrow" aria-hidden="true">↑</div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
