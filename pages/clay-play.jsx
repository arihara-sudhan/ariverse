import Header from '../src/components/Header';
import { getProfileLinkByLabel, listLinkItems } from '../lib/adminData';

export async function getServerSideProps() {
  const clayLink = await getProfileLinkByLabel('Clay Play');
  if (!clayLink) {
    return { props: { entries: [] } };
  }

  const entries = (await listLinkItems(clayLink.id)).filter(
    (item) => String(item.kavithaiFrom || '').trim() && String(item.markdownText || '').trim(),
  );

  return {
    props: {
      entries,
    },
  };
}

export default function ClayPlayPage({ entries }) {
  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section aria-labelledby="clay-play-title">
          <h1 id="clay-play-title">Clay Play</h1>
          {entries.length === 0 ? <p className="contact-note">No clay play write-ups yet.</p> : null}

          <div className="clay-play-list">
            {entries.map((entry, entryIndex) => (
              <article key={entry.id} className="clay-play-entry">
                <h2>{`${entryIndex + 1}. ${entry.kavithaiFrom}`}</h2>
                {(entry.markdownText || '')
                  .split('\n')
                  .filter((line) => line.trim())
                  .map((line, idx) => (
                    <p key={`${entry.id}-${idx}`}>{line}</p>
                  ))}
                {(Array.isArray(entry.imageUrls) ? entry.imageUrls : []).length > 0 ? (
                  <div className="clay-play-gallery">
                    {(Array.isArray(entry.imageUrls) ? entry.imageUrls : []).map((url, index) => (
                      <img
                        key={`${entry.id}-${url}-${index}`}
                        className="clay-play-image"
                        src={url}
                        alt={`${entry.kavithaiFrom || 'Clay Play image'} ${index + 1}`}
                      />
                    ))}
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
