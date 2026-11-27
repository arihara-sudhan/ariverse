import { sectionPublicPath } from './sectionRegistry.js';

export const PUBLIC_REFRESH_FAILURE_MESSAGE =
  'Saved successfully, but the public page refresh could not be completed. The saved change remains in the database; do not submit it again.';

function cleanPath(value) {
  const text = String(value || '').trim();
  if (!text.startsWith('/')) return '';
  const path = text.split(/[?#]/, 1)[0].replace(/\/+/g, '/');
  return path || '/';
}

function cleanSlug(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}

export function uniquePublicPaths(paths = []) {
  return [...new Set(paths.map(cleanPath).filter(Boolean))];
}

export function publicPathsForBlogPost(section, post = {}, previousSlug = '') {
  const basePath = cleanPath(`/${String(section || '').trim()}`);
  if (!basePath || basePath === '/') return [];
  const slugs = [previousSlug, post?.slug].map(cleanSlug).filter(Boolean);
  return uniquePublicPaths([
    basePath,
    ...slugs.map((slug) => `${basePath}/${slug}`),
  ]);
}

export function publicPathsForBlogPosts(section, posts = []) {
  return uniquePublicPaths([
    ...publicPathsForBlogPost(section),
    ...(Array.isArray(posts) ? posts : []).flatMap((post) => publicPathsForBlogPost(section, post)),
  ]);
}

export function publicPathsForProfileLink(link = {}) {
  const href = cleanPath(link?.href);
  const registeredPath = cleanPath(sectionPublicPath(link?.sectionKey));
  return uniquePublicPaths(['/', registeredPath || href]);
}

function slugifyProjectTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

export function publicPathsForLinkItem(link = {}, item = {}, previousItem = null) {
  const paths = publicPathsForProfileLink(link);
  const publicHref = cleanPath(link?.href);
  if (publicHref === '/projects') {
    const slugs = [previousItem?.kavithaiFrom, item?.kavithaiFrom]
      .map(slugifyProjectTitle)
      .filter(Boolean);
    paths.push(...slugs.map((slug) => `/projects/${slug}`));
  }
  return uniquePublicPaths(paths);
}

export async function revalidatePublicPaths(res, paths) {
  const requestedPaths = uniquePublicPaths(paths);
  const failedPaths = [];

  for (const path of requestedPaths) {
    try {
      if (typeof res?.revalidate !== 'function') {
        throw new Error('revalidate is unavailable');
      }
      await res.revalidate(path);
    } catch (error) {
      failedPaths.push(path);
      console.error(
        'Public page revalidation failed:',
        path,
        error?.code || error?.name || 'unknown error',
      );
    }
  }

  return {
    ok: failedPaths.length === 0,
    paths: requestedPaths,
    failedPaths,
    message: failedPaths.length > 0 ? PUBLIC_REFRESH_FAILURE_MESSAGE : '',
  };
}
