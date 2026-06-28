import { toPublicStorageUrl } from './storage';

export const ARIZONE_SITE_LOGO_PATH = 'arizone/assets/logo.webp';
export const ARIZONE_SITE_LOGO_URL = toPublicStorageUrl(ARIZONE_SITE_LOGO_PATH);

export const ARIZONE_TOPIC_LOGO_PATHS = {
  'deep-learning': 'arizone/assets/neuron.webp',
  'quantum-computing': 'arizone/assets/psi.webp',
};

export const ARIZONE_TOPIC_LOGO_URLS = {
  'deep-learning': toPublicStorageUrl(ARIZONE_TOPIC_LOGO_PATHS['deep-learning']),
  'quantum-computing': toPublicStorageUrl(ARIZONE_TOPIC_LOGO_PATHS['quantum-computing']),
};

export function getArizoneCategoryLogoPath(slug) {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) {
    return ARIZONE_SITE_LOGO_PATH;
  }
  return ARIZONE_TOPIC_LOGO_PATHS[safeSlug] || `arizone/assets/${safeSlug}.webp`;
}

