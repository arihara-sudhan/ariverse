import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import { normalizeSupabasePublicUrl, toPublicStorageUrl } from './storage.js';

const KAVITHAIGAL_CATEGORY_SLUG = 'kavithaigal';

const ALLOWED_TAGS = [
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'iframe', 'img', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
  'ul',
];

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'title'],
  code: ['class'],
  figure: ['class'],
  figcaption: [],
  iframe: ['src', 'title', 'width', 'height', 'loading', 'allowfullscreen', 'referrerpolicy'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding', 'class'],
};

const ALLOWED_CLASSES = {
  code: ['language-*', 'lang-*'],
  figure: ['arizone-image-with-caption'],
  img: ['arizone-post-image'],
};

export function sanitizeRenderedMarkdown(html) {
  return sanitizeHtml(String(html ?? ''), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedClasses: ALLOWED_CLASSES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto'],
      iframe: ['https'],
      img: ['http', 'https'],
    },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  });
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function normalizePathValue(value) {
  return cleanText(value).replace(/^\/+/, '').replace(/\/+$/, '');
}

function isExternalUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:|mailto:|javascript:)/i.test(cleanText(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTags(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').trim();
}

function normalizeInlineMediaBlocks(content) {
  const source = String(content ?? '');
  const withCaption = source.replace(
    /<image(?:WithCaption|Caption)>\s*<(?:img|image)>([\s\S]*?)<\/(?:img|image)>\s*<caption>([\s\S]*?)<\/caption>\s*<\/image(?:WithCaption|Caption)>/gi,
    (_match, imageUrl, caption) => {
      const src = cleanText(imageUrl);
      if (!src) return '';
      const captionText = cleanText(caption);
      const altText = stripTags(captionText) || 'Image';
      return [
        '',
        '<figure class="arizone-image-with-caption">',
        `  <img class="arizone-post-image" src="${escapeHtml(src)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" />`,
        captionText ? `  <figcaption>${escapeHtml(captionText)}</figcaption>` : '',
        '</figure>',
        '',
      ].filter((line) => line !== '').join('\n');
    },
  );

  return withCaption.replace(/<(?:img|image)>\s*([\s\S]*?)\s*<\/(?:img|image)>/gi, (_match, imageUrl) => {
    const src = cleanText(imageUrl);
    if (!src) return '';
    return ['', `<img class="arizone-post-image" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" />`, ''].join('\n');
  });
}

function resolveStoragePath(baseFolder, assetPath, section) {
  const cleanAsset = cleanText(assetPath);
  if (!cleanAsset || isExternalUrl(cleanAsset)) return cleanAsset;
  const normalizedAsset = cleanAsset.replace(/^\/+/, '');
  if (normalizedAsset.startsWith(`${section}/`)) return normalizedAsset;
  const folder = normalizePathValue(baseFolder);
  return folder ? `${folder}/${normalizedAsset}` : normalizedAsset;
}

function resolveStorageUrl(baseFolder, assetPath, section) {
  const storagePath = resolveStoragePath(baseFolder, assetPath, section);
  if (!storagePath || isExternalUrl(storagePath)) return storagePath;
  return toPublicStorageUrl(storagePath);
}

function rewriteRelativeAttributes(html, baseFolder, section, normalizeExternalUrls) {
  const attributes = ['src', 'href', 'poster'];
  let output = String(html ?? '');
  for (const attribute of attributes) {
    const pattern = new RegExp(`(${attribute}\\s*=\\s*["'])([^"']+)(["'])`, 'gi');
    output = output.replace(pattern, (match, prefix, value, suffix) => {
      const cleanValue = cleanText(value);
      if (!cleanValue) return match;
      if (cleanValue.startsWith('/storage/v1/object/public/')) {
        return `${prefix}${toPublicStorageUrl(cleanValue)}${suffix}`;
      }
      if (cleanValue.startsWith('/')) return match;
      if (isExternalUrl(cleanValue)) {
        const nextValue = normalizeExternalUrls ? normalizeSupabasePublicUrl(cleanValue) : cleanValue;
        return `${prefix}${nextValue}${suffix}`;
      }
      return `${prefix}${resolveStorageUrl(baseFolder, cleanValue, section)}${suffix}`;
    });
  }
  return output;
}

function shouldPreservePoemLineBreaks(baseFolder, options = {}) {
  const normalizedFolder = cleanText(baseFolder);
  const categorySlug = cleanText(options.categorySlug || '').toLowerCase();
  const slug = cleanText(options.slug || '').toLowerCase();
  return (
    categorySlug === KAVITHAIGAL_CATEGORY_SLUG ||
    slug.startsWith('kavithai-') ||
    normalizedFolder.includes('/kavithaigal/') ||
    normalizedFolder.endsWith('/kavithaigal') ||
    normalizedFolder.includes('/ariyin-kavithaigal/')
  );
}

export function renderMarkdownToSafeHtml(content, baseFolder = '', options = {}) {
  const section = options.section === 'arichuvadi' ? 'arichuvadi' : 'arizone';
  marked.setOptions({
    gfm: true,
    breaks: options.breaks ?? shouldPreservePoemLineBreaks(baseFolder, options),
  });
  const normalizedContent = normalizeInlineMediaBlocks(content);
  const rewrittenHtml = rewriteRelativeAttributes(
    marked.parse(normalizedContent),
    baseFolder,
    section,
    section === 'arichuvadi',
  );
  return sanitizeRenderedMarkdown(rewrittenHtml);
}

