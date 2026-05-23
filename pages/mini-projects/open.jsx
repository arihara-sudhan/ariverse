import Header from '../../src/components/Header';
import { useEffect } from 'react';

function isSafeExternalUrl(value) {
  if (typeof value !== 'string') return false;
  const input = value.trim();
  if (!input) return false;
  try {
    const parsed = new URL(input);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (_error) {
    return false;
  }
}

export async function getServerSideProps({ query }) {
  const rawUrl = typeof query?.url === 'string' ? query.url : '';
  const title = typeof query?.title === 'string' ? query.title : 'Mini Project';
  const embedUrl = isSafeExternalUrl(rawUrl) ? rawUrl : '';

  return {
    props: {
      embedUrl,
      title,
    },
  };
}

export default function MiniProjectOpenPage({ embedUrl, title }) {
  useEffect(() => {
    document.body.classList.add('mini-project-open-body');
    return () => {
      document.body.classList.remove('mini-project-open-body');
    };
  }, []);

  return (
    <div className="site">
      <Header subPage />
      <main className="content">
        <section className="for-ai" aria-label={title || 'Mini Project'}>
          {!embedUrl ? (
            <p className="contact-note">Invalid project link.</p>
          ) : (
            <div className="mini-project-embed-shell">
              <iframe
                src={embedUrl}
                title={title || 'Mini Project'}
                loading="eager"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
