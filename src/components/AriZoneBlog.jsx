import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import LikeButton from './LikeButton';
import DiscussionThread from './DiscussionThread';
import { ARIZONE_SITE_LOGO_URL, ARIZONE_TOPIC_LOGO_URLS } from '../../lib/arizoneAssets';

const POSTS_PER_PAGE = 10;
const DEFAULT_LOGO_URL = ARIZONE_SITE_LOGO_URL;
const TOPIC_LOGO_URLS = ARIZONE_TOPIC_LOGO_URLS;

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function normalizePostInput(post) {
  return {
    ...post,
    slug: String(post?.slug || '').trim(),
    title: String(post?.title || '').trim(),
    categorySlug: String(post?.categorySlug || post?.category_slug || '').trim(),
    categoryLabel: String(post?.categoryLabel || post?.category_label || post?.category || '').trim(),
    coverImageUrl: String(post?.coverImageUrl || '').trim(),
    categoryLogoUrl: String(post?.categoryLogoUrl || post?.category_logo_url || '').trim(),
    publishedAt: String(post?.publishedAt || post?.published_at || ''),
    html: String(post?.html || ''),
  };
}

function renderHeroTitle() {
  return 'AriZone';
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

function AriZoneThemeStyles() {
  return (
    <style jsx global>{`
      .arizone-shell {
        background: #ffffff;
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
        padding: 3vw 0;
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
        font-family: 'Playfair Display', serif;
        font-size: 4vw;
        font-weight: 600;
        color: #000000;
        margin: 0.35vw 0 0.25vw 0;
      }

      .arizone-shell .hero p {
        font-family: 'Google Sans', 'Pandora Sans', sans-serif;
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

      .arizone-shell .topic-separator {
        color: #000000;
      }

      .arizone-shell .topic-btn {
        background: none;
        color: #000000;
        border: none;
        padding: 0;
        cursor: pointer;
        font-family: 'Google Sans', 'Pandora Sans', sans-serif;
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

      .arizone-shell .post-card {
        background: white;
        border-radius: 1vw;
        border: 1px solid #000000;
        overflow: hidden;
        cursor: pointer;
      }

      .arizone-shell .post-card-image {
        width: 100%;
        height: 20vw;
        object-fit: cover;
        user-select: none;
        -webkit-user-drag: none;
        user-drag: none;
      }

      .arizone-shell .post-card-content {
        padding: 2vw;
      }

      .arizone-shell .post-card h3 {
        font-family: 'Playfair Display', serif;
        font-size: 1.8vw;
        margin-bottom: 1vw;
        color: #000000;
        line-height: 1.4;
        text-align: center;
      }

      .arizone-shell .post-card-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: 'Google Sans', 'Pandora Sans', sans-serif;
        font-size: 1vw;
        color: #999;
        gap: 1vw;
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
        font-family: 'Google Sans', 'Pandora Sans', sans-serif;
        font-size: 1vw;
        cursor: pointer;
      }

      .arizone-shell .pagination-status {
        font-family: 'Google Sans', 'Pandora Sans', sans-serif;
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
      }

      .arizone-shell .post-header {
        position: relative;
        padding-top: 1vw;
      }

      .arizone-shell #post-title {
        font-family: 'Playfair Display', serif;
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
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
        font-family: 'Google Sans', 'Pandora Sans', sans-serif;
        font-size: 1.1vw;
      }

      @media (max-width: 768px) {
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

        .arizone-shell .post-card-image {
          height: 50vw;
        }

        .arizone-shell .post-card h3 {
          font-size: 5vw;
        }

        .arizone-shell .post-card-meta {
          font-size: 3.5vw;
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

export function AriZoneIndexView({ posts = [], categories = [] }) {
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
  const categoryLogoMap = useMemo(
    () => new Map([
      ...normalizedPosts.map((post) => [post.categorySlug, post.categoryLogoUrl || TOPIC_LOGO_URLS[post.categorySlug] || DEFAULT_LOGO_URL]),
      ...categoryList.map((category) => [category.slug, category.logoUrl || TOPIC_LOGO_URLS[category.slug] || DEFAULT_LOGO_URL]),
    ]),
    [normalizedPosts, categoryList],
  );
  const heroLogoUrl = currentTopic === 'all' ? DEFAULT_LOGO_URL : categoryLogoMap.get(currentTopic) || TOPIC_LOGO_URLS[currentTopic] || DEFAULT_LOGO_URL;
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
      <AriZoneThemeStyles />
      <header className="header" />
      <main className="main">
        <div id="home-page" className="page active">
          <div className="container container-wide">
            <div className="hero">
              <img src={heroLogoUrl} alt="Blog Logo" className="hero-logo" draggable="false" />
              <h2>{renderHeroTitle()}</h2>
              <p>What if Ari&apos;s eyes are your receptive fields...</p>
              <div className="topics" id="topics">
                <button
                  type="button"
                  className={`topic-btn${currentTopic === 'all' ? ' active' : ''}`}
                  onClick={() => setCurrentTopic('all')}
                >
                  All
                </button>
                {categoryList.map((category, index) => (
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

            <div className="posts-grid" id="posts-grid">
                {visiblePosts.length > 0 ? (
                  visiblePosts.map((post) => {
                  const imageSource = post.coverImageUrl || post.categoryLogoUrl || TOPIC_LOGO_URLS[post.categorySlug] || DEFAULT_LOGO_URL;
                  const href = `/arizone/${encodeURIComponent(post.slug)}`;

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
                        <div className="post-card-meta">
                          <span className="post-card-date">{formatDate(post.publishedAt)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="empty-state">
                  No posts available
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
                  Previous
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
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <p>
            &copy; 2024 <span className="footer-blog-link">AriZone</span> |{' '}
            <a href="https://arihara-sudhan.github.io/" target="_blank" rel="noopener noreferrer">A</a>
            <a href="https://ariverse.in/" target="_blank" rel="noopener noreferrer">RIVERSE</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export function AriZonePostView({ post, initialComments = [], initialLikesCount = 0 }) {
  const normalizedPost = normalizePostInput(post);

  return (
    <div className="arizone-shell">
      <AriZoneThemeStyles />
      <header className="header" />
      <main className="main">
        <div id="post-page" className="page active">
          <div className="container container-narrow">
            <div className="post-header">
              <h1 id="post-title">{normalizedPost.title}</h1>
              <hr />
            </div>

            <div className="post-actions" aria-label="AriZone reactions">
              <LikeButton
                endpoint="/api/content/reactions"
                entryId={normalizedPost.id}
                initialCount={initialLikesCount}
                storageNamespace="arizone"
                section="arizone"
                className="arizone-post-like"
                showText
              />
            </div>

            <article
              id="post-content"
              className="post-content"
              dangerouslySetInnerHTML={{
                __html: normalizedPost.html || '<p class="empty-state">This post has not been published yet.</p>',
              }}
            />

            <div className="comments-section">
              <DiscussionThread
                title="Comments"
                endpoint="/api/content/comments"
                itemIdField="entryId"
                queryParams={{ section: 'arizone' }}
                extraPayload={{ section: 'arizone' }}
                itemId={normalizedPost.id}
                initialComments={initialComments}
                commentPlaceholder="Write a comment"
                submitLabel="Post Comment"
              />
            </div>
          </div>
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <p>
            &copy; 2024 <span className="footer-blog-link">AriZone</span> |{' '}
            <a href="https://arihara-sudhan.github.io/" target="_blank" rel="noopener noreferrer">A</a>
            <a href="https://ariverse.in/" target="_blank" rel="noopener noreferrer">RIVERSE</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export function AriZoneAboutView() {
  return (
    <div className="arizone-shell">
      <AriZoneThemeStyles />
      <header className="header" />
      <main className="main">
        <div id="about-page" className="page active">
          <div className="container container-narrow">
            <h2>About This Blog</h2>
            <p>
              This is a simple blog built with HTML, CSS, and JavaScript. It supports markdown posts, unique URLs, and comments stored in AriVerse Neon DB.
            </p>
          </div>
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <p>
            &copy; 2024 <span className="footer-blog-link">AriZone</span> |{' '}
            <a href="https://arihara-sudhan.github.io/" target="_blank" rel="noopener noreferrer">A</a>
            <a href="https://ariverse.in/" target="_blank" rel="noopener noreferrer">RIVERSE</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
