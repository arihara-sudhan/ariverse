import Header from '../src/components/Header';
import { getProfileLinkByLabel, listLinkItems } from '../lib/adminData';

function toEmbedUrl(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';

  if (text.includes('youtube.com/embed/')) {
    return text;
  }

  const watchMatch = text.match(/[?&]v=([^&]+)/);
  if (watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  const shortMatch = text.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  return text;
}

export async function getServerSideProps({ query }) {
  const binomialLink = await getProfileLinkByLabel('Binomial Names');
  if (!binomialLink) {
    return { props: { selectedEntry: null } };
  }

  const entries = (await listLinkItems(binomialLink.id)).filter(
    (item) => String(item.youtubeUrl || '').trim() && String(item.kavithaiFrom || '').trim(),
  );

  if (entries.length === 0) {
    return { props: { selectedEntry: null } };
  }

  const requestedId = Number(query?.id);
  const requestedEntry = Number.isInteger(requestedId)
    ? entries.find((entry) => entry.id === requestedId)
    : null;

  return {
    props: {
      selectedEntry: requestedEntry || entries[0],
    },
  };
}

export default function BinomialNamesPage({ selectedEntry }) {
  if (!selectedEntry) {
    return (
      <div className="site">
        <Header subPage />
        <main className="content">
          <section className="binomial-layout">
            <article className="contact-card binomial-card">
              <p className="contact-note">No entries yet.</p>
            </article>
          </section>
        </main>
      </div>
    );
  }

  const embedBase = toEmbedUrl(selectedEntry.youtubeUrl);
  const embedSrc = `${embedBase}${embedBase.includes('?') ? '&' : '?'}controls=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1`;

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="binomial-layout" aria-labelledby="binomial-title">
          <article className="contact-card binomial-card">
            <div className="binomial-video-wrap">
              <iframe
                className="binomial-video"
                src={embedSrc}
                title={selectedEntry.kavithaiFrom || 'Binomial video'}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>

            <div className="binomial-copy">
              <p className="eyebrow">Binomial Names</p>
              <h2 id="binomial-title">{selectedEntry.kavithaiFrom}</h2>
              {selectedEntry.markdownText
                .split('\n')
                .filter((line) => line.trim())
                .map((line, idx) => (
                  <p key={`${selectedEntry.id}-${idx}`}>{line}</p>
                ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
