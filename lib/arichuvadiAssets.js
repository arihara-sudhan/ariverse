import { toPublicStorageUrl } from './storage';

export const ARICHUVADI_SITE_LOGO_URL = '/static/arichuvadi.png';

export const ARICHUVADI_TOPIC_LOGO_PATHS = {
  'deep-learning': 'arichuvadi/categories/deep-learning/logo.webp',
  'quantum-computing': 'arichuvadi/categories/quantum-computing/logo.webp',
  kavithaigal: 'assets/hero-images-of-modules/ari-kavithai.webp',
};

export const ARICHUVADI_TOPIC_LOGO_URLS = {
  'deep-learning': toPublicStorageUrl(ARICHUVADI_TOPIC_LOGO_PATHS['deep-learning']),
  'quantum-computing': toPublicStorageUrl(ARICHUVADI_TOPIC_LOGO_PATHS['quantum-computing']),
  kavithaigal: toPublicStorageUrl(ARICHUVADI_TOPIC_LOGO_PATHS.kavithaigal),
};

export function getArichuvadiCategoryLogoPath(slug) {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) {
    return 'static/arichuvadi.png';
  }
  return ARICHUVADI_TOPIC_LOGO_PATHS[safeSlug] || `arichuvadi/categories/${safeSlug}/logo.webp`;
}
