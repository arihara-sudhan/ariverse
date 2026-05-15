import Header from '../src/components/Header';
import { formatCompact, getAIWithARIData } from '../lib/youtube';

export async function getServerSideProps() {
  const data = await getAIWithARIData(
    process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY,
  );

  return {
    props: data,
  };
}

export default function AIWithARIPage({ status, message, channel, playlists }) {
  return (
    <div className="site">
      <Header subPage />

      <main className="content">
        <section className="ai-with-ari" id="ai-with-ari" aria-labelledby="ai-with-ari-title">
          {status === 'error' && (
            <div className="playlist-card">
              <h3>Channel API not connected</h3>
              <p>{message}</p>
            </div>
          )}

          {status === 'ready' && channel && (
            <>
              <div className="ai-channel-head">
                {channel.logo && (
                  <img
                    className="ai-channel-logo"
                    src={channel.logo}
                    alt={`${channel.title} logo`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}

                <div className="ai-channel-meta">
                  <h2 id="ai-with-ari-title">{channel.title}</h2>
                  <p>
                    {channel.handle} • {formatCompact(channel.subscribers)} subscribers •{' '}
                    {formatCompact(channel.videos)} videos
                  </p>
                  <a
                    className="ai-channel-subscribe"
                    href="https://www.youtube.com/@ai_with_ari?sub_confirmation=1"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Subscribe
                  </a>
                </div>
              </div>

              <div className="playlist-grid">
                {playlists.map((playlist) => (
                  <article key={playlist.id} className="playlist-card">
                    <a
                      className="playlist-watch-btn"
                      href={playlist.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch
                    </a>
                    <a href={playlist.href} target="_blank" rel="noreferrer">
                      {playlist.thumbnail && (
                        <img
                          className="playlist-thumb"
                          src={playlist.thumbnail}
                          alt={`${playlist.title} thumbnail`}
                          loading="lazy"
                        />
                      )}
                      <h3>{playlist.title}</h3>
                      <p>{playlist.itemCount} videos</p>
                    </a>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
