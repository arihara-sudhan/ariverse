import Link from 'next/link';
import { useEffect, useState } from 'react';
import Header from './Header';
import LikeButton from './LikeButton';
import DiscussionThread from './DiscussionThread';
import { ARICHUVADI_SITE_LOGO_URL, ARICHUVADI_TOPIC_LOGO_URLS } from '../../lib/arichuvadiAssets';
import { toPublicStorageUrl } from '../../lib/storage';

const POSTS_PER_PAGE = 10;
const DEFAULT_LOGO_URL = ARICHUVADI_SITE_LOGO_URL;
const TOPIC_LOGO_URLS = ARICHUVADI_TOPIC_LOGO_URLS;

function normalizePostInput(post) {
  const coverImagePath = String(post?.coverImagePath || post?.cover_image_path || '').trim();
  return {
    ...post,
    slug: String(post?.slug || '').trim(),
    title: String(post?.title || '').trim(),
    categorySlug: String(post?.categorySlug || post?.category_slug || '').trim(),
    categoryLabel: String(post?.categoryLabel || post?.category_label || post?.category || '').trim(),
    coverImageUrl: String(post?.coverImageUrl || post?.cover_image_url || '').trim() || toPublicStorageUrl(coverImagePath),
    categoryLogoUrl: String(post?.categoryLogoUrl || post?.category_logo_url || '').trim(),
    publishedAt: String(post?.publishedAt || post?.published_at || ''),
    html: String(post?.html || ''),
  };
}

function renderHeroTitle() {
  return 'அரிச்சுவடி';
}

function getCategoryMeta(posts = []) {
  const categories = new Map();

  for (const post of posts) {
    const slug = String(post?.categorySlug || '').trim();
    if (!slug) continue;
    const label = String(post?.categoryLabel || '').trim() || slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    if (!categories.has(slug)) {
      categories.set(slug, label);
    }
  }

  return [...categories.entries()]
    .map(([slug, label]) => ({ slug, label }))
    .sort((left, right) => String(left.label).toLowerCase().localeCompare(String(right.label).toLowerCase()));
}

function ArichuvadiThemeStyles() {
  return (
    <style jsx global>{`
      @font-face {
        font-family: 'Arichuvadi Tamil';
        src: url('/fonts/tamil_font.TTF') format('truetype');
        font-style: normal;
        font-weight: 400 700;
        font-display: swap;
      }

      .arizone-shell {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1.25rem 4rem;
        background: #ffffff;
        font-family: 'Arichuvadi Tamil', 'TamilFont', 'Noto Sans Tamil', 'Latha', sans-serif;
      }

      .arizone-shell *,
      .arizone-shell *::before,
      .arizone-shell *::after {
        animation: none !important;
        transition: none !important;
      }

      .arizone-shell .header {
        background: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .arizone-shell .header .container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1.5vw 2vw;
      }

      .arizone-shell .main {
        min-height: calc(100vh - 8vw);
        padding: 2rem 0 0;
      }

      .arizone-shell .page {
        display: none;
      }

      .arizone-shell .page.active {
        display: block;
      }

      .arizone-shell .container {
        margin: 0 auto;
        padding: 0 2vw;
      }

      .arizone-shell .container-wide {
        max-width: 90vw;
      }

      .arizone-shell .container-narrow {
        max-width: 60vw;
      }

      .arizone-shell .hero {
        text-align: center !important;
        padding: 3vw 0 2vw 0 !important;
        background: linear-gradient(135deg, #ffffff 0%, #f8fcf8 100%) !important;
        color: #000000 !important;
        border-radius: 2vw !important;
        display: block !important;
        grid-template-columns: none !important;
        gap: 0 !important;
        align-items: initial !important;
      }

      .arizone-shell .hero-logo {
        width: 20vw;
        height: auto;
        max-width: 300px;
        max-height: 300px;
        filter: drop-shadow(0 4px 8px rgba(45, 90, 45, 0.2));
        user-select: none;
        -webkit-user-drag: none;
        user-drag: none;
        display: block;
        margin: 0 auto 0.15vw auto;
      }

      .arizone-shell .hero h2 {
        font-family: 'Arichuvadi Tamil', 'Playfair Display', serif;
        font-size: 4vw;
        font-weight: 600;
        color: #000000;
        margin: 0.35vw 0 0.25vw 0;
      }

      .arizone-shell .hero p {
        font-family: 'Arichuvadi Tamil', 'Google Sans', 'Pandora Sans', sans-serif;
        font-size: 1.8vw;
        color: #000000;
        font-weight: 300;
        letter-spacing: 0;
        text-align: center;
        margin: 0 0 0.6vw 0;
      }

      .arizone-shell .topics {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.65vw;
        margin: 0.15vw 0 1.2vw 0;
        flex-wrap: nowrap;
        font-size: 1vw;
        white-space: nowrap;
      }

      .arizone-shell .topics span {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }

      .arizone-shell .topic-separator {
        color: #000000;
      }

      .arizone-shell .topic-btn {
        background: none;
        color: #000000;
        border: none;
        padding: 0;
        cursor: pointer;
        font-family: 'Arichuvadi Tamil', 'Google Sans', 'Pandora Sans', sans-serif;
        font-size: 1vw;
        text-decoration: none;
        font-weight: normal;
      }

      .arizone-shell .topic-btn.active {
        font-weight: bold;
      }

      .arizone-shell .posts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(30vw, 1fr));
        gap: 2vw;
      }

      .arizone-shell .posts-grid.is-empty {
        grid-template-columns: 1fr;
        min-height: 32vh;
        align-items: center;
      }

      .arizone-shell .post-card {
        background: white;
        border-radius: 1vw;
        border: 1px solid #000000;
        overflow: hidden;
        cursor: pointer;
      }

      .arizone-shell .post-card-image {
        width: 100%;
        aspect-ratio: 1 / 1;
        height: auto;
        object-fit: contain;
        background: #ffffff;
        user-select: none;
        -webkit-user-drag: none;
        user-drag: none;
      }

      .arizone-shell .post-card-content {
        padding: 0.75rem 0.9rem 0.95rem;
        background: #000000;
      }

      .arizone-shell .post-card h3 {
        font-family: 'Arichuvadi Tamil', 'Playfair Display', serif;
        font-size: 1.35rem;
        margin: 0.1rem 0 0.2rem;
        color: #ffffff;
        line-height: 1.4;
        text-align: center;
      }

      .arizone-shell .posts-pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1.5vw;
        margin-top: 3vw;
        flex-wrap: wrap;
      }

      .arizone-shell .pagination-btn {
        background: #000000;
        color: #ffffff;
        border: 1px solid #000000;
        border-radius: 999px;
        padding: 0.8vw 1.6vw;
        font-family: 'Arichuvadi Tamil', 'Google Sans', 'Pandora Sans', sans-serif;
        font-size: 1vw;
        cursor: pointer;
      }

      .arizone-shell .pagination-status {
        font-family: 'Arichuvadi Tamil', 'Google Sans', 'Pandora Sans', sans-serif;
        font-size: 1vw;
        color: #000000;
        font-weight: 600;
      }

      .arizone-shell .post-content {
        background: white;
        padding: 3vw;
        border-radius: 1vw;
        margin-bottom: 3vw;
        font-size: 1.3vw;
        line-height: 1.8;
        font-family: 'Arichuvadi Tamil', 'Google Sans', 'Pandora Sans', sans-serif;
      }

      .arizone-shell .post-content p {
        margin: 0 0 1rem;
      }

      .arizone-shell .post-content img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 1.2rem auto;
        border-radius: 0.9rem;
      }

      .arizone-shell .post-content figure {
        margin: 1.35rem 0;
      }

      .arizone-shell .post-content .arizone-image-with-caption {
        display: grid;
        gap: 0.7rem;
      }

      .arizone-shell .post-content .arizone-image-with-caption figcaption {
        text-align: center;
        font-family: 'Arichuvadi Tamil', 'Google Sans', 'Pandora Sans', sans-serif;
        font-size: 0.92em;
        line-height: 1.5;
        color: #4d4d4d;
      }

      .arizone-shell .post-content .arizone-post-image {
        width: 100%;
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: none;
      }

      .arizone-shell .post-header {
        position: relative;
        padding-top: 1vw;
      }

      .arizone-shell #post-title {
        font-family: 'Arichuvadi Tamil', 'Playfair Display', serif;
        font-size: 3vw;
        color: #000000;
        line-height: 1.3;
        text-align: center;
        margin: 0;
      }

      .arizone-shell #post-title + hr {
        border: none;
        height: 2px;
        background: linear-gradient(to right, transparent, #000000, transparent);
        margin: 2vw auto 1vw auto;
        width: 60%;
      }

      .arizone-shell .comments-section {
        background: white;
        padding: 3vw;
        border-radius: 1vw;
        box-shadow: none;
      }

      .arizone-shell .post-actions {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0.25rem 0 1rem;
      }

      .arizone-shell .comments-section .project-comments {
        padding-bottom: 0;
      }

      .arizone-shell .comments-section .project-comment-list {
        margin-bottom: 0;
      }

      .arizone-shell .comments-section .project-comment-item:last-child {
        border-bottom: 0;
      }

      .arizone-shell .footer {
        background: #f8fcf8;
        color: #000000;
        text-align: center;
        padding: 2vw 0;
        margin-top: 4vw;
        border-top: 1px solid #e8f5e8;
      }

      .arizone-shell .footer p {
        font-family: 'Arichuvadi Tamil', 'Google Sans', 'Pandora Sans', sans-serif;
        font-size: 1.1vw;
      }

      .arizone-shell .empty-state {
        display: grid;
        place-items: center;
        min-height: 28vh;
        border: 1px dashed rgba(0, 0, 0, 0.14);
        border-radius: 1.25rem;
        background: linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%);
        color: #444444;
        text-align: center;
        font-family: 'Arichuvadi Tamil', 'Google Sans', 'Pandora Sans', sans-serif;
        font-size: 1.05vw;
        font-weight: 500;
        letter-spacing: 0.01em;
      }

      @media (max-width: 768px) {
        .arizone-shell,
        .arizone-shell * {
          font-family: 'Arichuvadi Tamil', 'TamilFont', 'Noto Sans Tamil', 'Latha', sans-serif !important;
        }

        .arizone-shell {
          padding: 1.25rem 0.9rem 3rem;
        }

        .arizone-shell .container-wide,
        .arizone-shell .container-narrow {
          max-width: 95vw;
          padding: 0 2.5vw;
        }

        .arizone-shell .hero {
          padding: 4vw 4vw 3vw 4vw !important;
          margin-bottom: 3vw;
          border-radius: 3vw !important;
        }

        .arizone-shell .hero-logo {
          width: 35vw;
          max-width: 250px;
          margin-bottom: 0.4vw;
        }

        .arizone-shell .hero h2 {
          font-size: 8vw;
          margin-bottom: 0.8vw;
        }

        .arizone-shell .hero p {
          font-size: 3.5vw;
          margin-bottom: 1vw;
        }

        .arizone-shell .topics {
          gap: 0.9vw;
          margin: 0.2vw 0 2vw 0;
          font-size: 2.5vw;
        }

        .arizone-shell .topic-btn {
          font-size: 2.5vw;
        }

        .arizone-shell .posts-grid {
          grid-template-columns: 1fr;
          gap: 3vw;
        }

        .arizone-shell .post-card h3 {
          font-size: 1.15rem;
        }

        .arizone-shell .pagination-btn,
        .arizone-shell .pagination-status {
          font-size: 0.9rem;
        }

        .arizone-shell .pagination-btn {
          padding: 0.7rem 1rem;
          min-height: 2.5rem;
        }

        .arizone-shell .post-content {
          font-size: 4.5vw;
          padding: 4vw;
        }

        .arizone-shell .post-content img {
          margin: 1rem auto;
        }

        .arizone-shell .post-content figure {
          margin: 1rem 0;
        }

        .arizone-shell #post-title {
          font-size: 7vw;
        }

        .arizone-shell .post-header {
          padding-top: 2vw;
        }

        .arizone-shell #post-title + hr {
          margin: 4vw auto 2vw auto;
          width: 80%;
        }

        .arizone-shell .footer p {
          font-size: 3.5vw;
        }
      }
    `}</style>
  );
}

export function ArichuvadiIndexView({ posts = [], categories = [] }) {
  const normalizedPosts = Array.isArray(posts) ? posts.map(normalizePostInput) : [];
  const [currentTopic, setCurrentTopic] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const categoryList = Array.isArray(categories) && categories.length > 0
    ? categories.map((category) => ({
        slug: String(category?.slug || '').trim(),
        label: String(category?.label || '').trim() || String(category?.slug || '').trim(),
        logoUrl: String(category?.logoUrl || category?.logo_path || '').trim(),
      }))
    : getCategoryMeta(normalizedPosts);
  const filteredPosts = currentTopic === 'all'
    ? normalizedPosts
    : normalizedPosts.filter((post) => post.categorySlug === currentTopic);
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * POSTS_PER_PAGE;
  const visiblePosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentTopic]);

  return (
    <div className="arizone-shell">
      <ArichuvadiThemeStyles />
      <Header />
      <main className="main">
        <div id="home-page" className="page active">
          <div className="container container-wide">
            <div className="hero">
              <h2>{renderHeroTitle()}</h2>
              <p>அகவுணர்வொன்றே அறிகலை நுணுக்கம்...</p>
              <div className="topics" id="topics">
                <button
                  type="button"
                  className={`topic-btn${currentTopic === 'all' ? ' active' : ''}`}
                  onClick={() => setCurrentTopic('all')}
                >
                  அனைத்தும்
                </button>
                {categoryList.map((category) => (
                  <span key={category.slug}>
                    <span className="topic-separator">&#9671;</span>
                    <button
                      type="button"
                      className={`topic-btn${currentTopic === category.slug ? ' active' : ''}`}
                      onClick={() => setCurrentTopic(category.slug)}
                    >
                      {category.label}
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className={`posts-grid${visiblePosts.length > 0 ? '' : ' is-empty'}`} id="posts-grid">
              {visiblePosts.length > 0 ? (
                visiblePosts.map((post) => {
                  const imageSource = post.coverImageUrl || post.categoryLogoUrl || TOPIC_LOGO_URLS[post.categorySlug] || DEFAULT_LOGO_URL;
                  const href = `/arichuvadi/${encodeURIComponent(post.slug)}`;

                  return (
                    <Link
                      key={post.slug}
                      href={href}
                      className="post-card"
                      style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
                    >
                      <img
                        src={imageSource}
                        alt={post.title}
                        className="post-card-image"
                        loading="lazy"
                        decoding="async"
                        draggable="false"
                      />
                      <div className="post-card-content">
                        <h3>{post.title}</h3>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="empty-state">
                  பதிவுகள் இன்னும் இல்லை
                </div>
              )}
            </div>

            {filteredPosts.length > POSTS_PER_PAGE ? (
              <div className="posts-pagination" id="posts-pagination">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  முந்தைய
                </button>
                <span className="pagination-status">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  அடுத்தது
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <p>
            &copy; 2024 <span className="footer-blog-link">அரிச்சுவடி</span> |{' '}
            <a href="https://arihara-sudhan.github.io/" target="_blank" rel="noopener noreferrer">A</a>
            <a href="https://ariverse.in/" target="_blank" rel="noopener noreferrer">RIVERSE</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export function ArichuvadiPostView({ post, initialComments = [], initialLikesCount = 0 }) {
  const normalizedPost = normalizePostInput(post);

  return (
    <div className="arizone-shell">
      <ArichuvadiThemeStyles />
      <main className="main">
        <div id="post-page" className="page active">
          <div className="container container-narrow">
            <div className="post-header">
              <h1 id="post-title">{normalizedPost.title}</h1>
              <hr />
            </div>

            <article
              id="post-content"
              className="post-content"
              dangerouslySetInnerHTML={{
                __html: normalizedPost.html || '<p class="empty-state">இந்த பதிவு இன்னும் வெளியிடப்படவில்லை.</p>',
              }}
            />

            <div className="post-actions" aria-label="Arichuvadi reactions">
              <LikeButton
                endpoint="/api/content/reactions"
                entryId={normalizedPost.id}
                initialCount={initialLikesCount}
                storageNamespace="arichuvadi"
                section="arichuvadi"
                className="arizone-post-like"
                showText
                label="பிடிக்கிறது"
              />
            </div>

            <div className="comments-section">
              <DiscussionThread
                title="கருத்துகள்"
                endpoint="/api/content/comments"
                itemIdField="entryId"
                queryParams={{ section: 'arichuvadi' }}
                extraPayload={{ section: 'arichuvadi' }}
                itemId={normalizedPost.id}
                initialComments={initialComments}
                commentPlaceholder="உங்கள் கருத்தை எழுதுங்கள்"
                submitLabel="கருத்தை பதிவு செய்யவும்"
              />
            </div>
          </div>
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <p>
            &copy; 2024 <span className="footer-blog-link">அரிச்சுவடி</span> |{' '}
            <a href="https://arihara-sudhan.github.io/" target="_blank" rel="noopener noreferrer">A</a>
            <a href="https://ariverse.in/" target="_blank" rel="noopener noreferrer">RIVERSE</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export function ArichuvadiAboutView() {
  return (
    <div className="arizone-shell">
      <ArichuvadiThemeStyles />
      <Header />
      <main className="main">
        <div id="about-page" className="page active">
          <div className="container container-narrow">
            <h2>இந்த வலைப்பதிவைப் பற்றி</h2>
            <p>
              அரிச்சுவடி என்பது தமிழில் எழுதப்படும் சிந்தனைகள், அனுபவங்கள், குறிப்புகள், மற்றும் படைப்புகளை பகிரும் ஒரு தனிப்பட்ட வலைப்பதிவு.
              Markdown பதிவுகள், தனித்த URL-கள், மற்றும் AriVerse Neon DB-ல் சேமிக்கப்படும் கருத்துகள் இதன் முக்கிய அம்சங்கள்.
            </p>
          </div>
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <p>
            &copy; 2024 <span className="footer-blog-link">அரிச்சுவடி</span> |{' '}
            <a href="https://arihara-sudhan.github.io/" target="_blank" rel="noopener noreferrer">A</a>
            <a href="https://ariverse.in/" target="_blank" rel="noopener noreferrer">RIVERSE</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
