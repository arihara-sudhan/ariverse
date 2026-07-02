import { toPublicStorageUrl } from './storage';

export const ARICHUVADI_SITE_LOGO_URL = 'https://qbghhenrxoupaykgnxyj.supabase.co/storage/v1/object/public/ariverse/arizone/assets/arizone.png';

export const ARICHUVADI_TOPIC_LOGO_PATHS = {
  'deep-learning': 'arichuvadi/categories/deep-learning/logo.webp',
  'quantum-computing': 'arichuvadi/categories/quantum-computing/logo.webp',
};

export const ARICHUVADI_TOPIC_LOGO_URLS = {
  'deep-learning': toPublicStorageUrl(ARICHUVADI_TOPIC_LOGO_PATHS['deep-learning']),
  'quantum-computing': toPublicStorageUrl(ARICHUVADI_TOPIC_LOGO_PATHS['quantum-computing']),
};

export function getArichuvadiCategoryLogoPath(slug) {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) {
    return 'arizone/assets/arizone.png';
  }
  return ARICHUVADI_TOPIC_LOGO_PATHS[safeSlug] || `arichuvadi/categories/${safeSlug}/logo.webp`;
}
