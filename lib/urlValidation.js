export function isAllowedYouTubeUrl(value) {
  const input = typeof value === 'string' ? value.trim() : '';
  if (!input) return false;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    return host === 'youtube.com'
      || host === 'www.youtube.com'
      || host === 'm.youtube.com'
      || host === 'youtu.be'
      || host === 'www.youtu.be';
  } catch (_error) {
    return false;
  }
}

export function isInstagramUrl(value) {
  const input = typeof value === 'string' ? value.trim() : '';
  if (!input) return false;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    return host === 'instagram.com'
      || host === 'www.instagram.com'
      || host === 'm.instagram.com'
      || host === 'instagr.am'
      || host === 'www.instagr.am';
  } catch (_error) {
    return false;
  }
}
