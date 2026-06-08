const RATE_LIMIT_BUCKETS = new Map();

function nowMs() {
  return Date.now();
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function isAllowedOrigin(origin, host) {
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host;
  } catch (_error) {
    return false;
  }
}

export function enforceSameOriginWrite(req, res) {
  const method = String(req.method || '').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return true;

  const host = String(req.headers.host || '');
  const origin = String(req.headers.origin || '');
  const referer = String(req.headers.referer || '');
  if (isAllowedOrigin(origin, host)) return true;
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (parsed.host === host) return true;
    } catch (_error) {
      // ignore malformed referer
    }
  }

  res.status(403).json({ error: 'Invalid request origin.' });
  return false;
}

export function checkRateLimit(req, keyPrefix, maxHits, windowMs) {
  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;
  const current = RATE_LIMIT_BUCKETS.get(key);
  const now = nowMs();
  if (!current || current.resetAt <= now) {
    RATE_LIMIT_BUCKETS.set(key, { hits: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxHits - 1 };
  }
  if (current.hits >= maxHits) {
    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, current.resetAt - now) };
  }
  current.hits += 1;
  RATE_LIMIT_BUCKETS.set(key, current);
  return { ok: true, remaining: Math.max(0, maxHits - current.hits) };
}

export function isSafePublicHref(href) {
  const value = typeof href === 'string' ? href.trim() : '';
  if (!value) return false;
  if (value.startsWith('/')) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

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
