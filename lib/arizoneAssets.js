import { toPublicStorageUrl } from './storage';

export const ARIZONE_SITE_LOGO_URL = 'https://qbghhenrxoupaykgnxyj.supabase.co/storage/v1/object/public/ariverse/arizone/assets/arizone.png';

export const ARIZONE_TOPIC_LOGO_PATHS = {
  'deep-learning': 'arizone/categories/deep-learning/logo.webp',
  'quantum-computing': 'arizone/categories/quantum-computing/logo.webp',
};

export const ARIZONE_TOPIC_LOGO_URLS = {
  'deep-learning': toPublicStorageUrl(ARIZONE_TOPIC_LOGO_PATHS['deep-learning']),
  'quantum-computing': toPublicStorageUrl(ARIZONE_TOPIC_LOGO_PATHS['quantum-computing']),
};

export function getArizoneCategoryLogoPath(slug) {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) {
    return 'arizone/assets/arizone.png';
  }
  return ARIZONE_TOPIC_LOGO_PATHS[safeSlug] || `arizone/categories/${safeSlug}/logo.webp`;
}
