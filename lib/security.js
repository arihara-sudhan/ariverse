import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;
let rateLimitStoreErrorLogged = false;

function getClientIp(req) {
  const configuredHeader = String(process.env.TRUSTED_PROXY_IP_HEADER || '').trim().toLowerCase();
  if (configuredHeader && /^[a-z0-9-]+$/.test(configuredHeader)) {
    const forwarded = req.headers[configuredHeader];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
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
  const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (isAllowedOrigin(origin, host)) return true;
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (parsed.host === host) return true;
    } catch (_error) {
      // ignore malformed referer
    }
  }
  if (host && (fetchSite === 'same-origin' || fetchSite === 'same-site')) {
    return true;
  }

  res.status(403).json({ error: 'Invalid request origin.' });
  return false;
}

export async function checkRateLimit(req, keyPrefix, maxHits, windowMs) {
  if (!sql) return { ok: false, storeUnavailable: true };
  const safeMaxHits = Math.max(1, Math.floor(Number(maxHits) || 1));
  const safeWindowMs = Math.max(1000, Math.floor(Number(windowMs) || 1000));
  const bucketKey = `${String(keyPrefix || 'mutation').slice(0, 80)}:${getClientIp(req)}`;

  try {
    const rows = await sql`
      INSERT INTO ariverse_rate_limits (bucket_key, window_started_at, hit_count, updated_at)
      VALUES (${bucketKey}, now(), 1, now())
      ON CONFLICT (bucket_key) DO UPDATE
      SET window_started_at = CASE
            WHEN ariverse_rate_limits.window_started_at <= now() - (${safeWindowMs} * INTERVAL '1 millisecond')
              THEN now()
            ELSE ariverse_rate_limits.window_started_at
          END,
          hit_count = CASE
            WHEN ariverse_rate_limits.window_started_at <= now() - (${safeWindowMs} * INTERVAL '1 millisecond')
              THEN 1
            WHEN ariverse_rate_limits.hit_count >= ${safeMaxHits}
              THEN ariverse_rate_limits.hit_count
            ELSE ariverse_rate_limits.hit_count + 1
          END,
          updated_at = now()
      RETURNING
        hit_count AS "hitCount",
        GREATEST(
          0,
          CEIL(EXTRACT(EPOCH FROM (
            window_started_at + (${safeWindowMs} * INTERVAL '1 millisecond') - now()
          )))
        )::int AS "retryAfterSeconds"
    `;
    const row = rows[0] || {};
    const hitCount = Number(row.hitCount || 0);
    return {
      ok: hitCount <= safeMaxHits,
      remaining: Math.max(0, safeMaxHits - hitCount),
      retryAfterMs: Number(row.retryAfterSeconds || 0) * 1000,
    };
  } catch (error) {
    if (!rateLimitStoreErrorLogged) {
      console.error('Shared rate-limit store unavailable:', error?.code || error?.name || 'unknown error');
      rateLimitStoreErrorLogged = true;
    }
    return { ok: false, storeUnavailable: true };
  }
}

export async function enforceRateLimit(req, res, keyPrefix, maxHits, windowMs) {
  const limit = await checkRateLimit(req, keyPrefix, maxHits, windowMs);
  if (limit.ok) return true;
  if (limit.storeUnavailable) {
    res.status(503).json({ error: 'Rate limiting is temporarily unavailable. Please try again shortly.' });
    return false;
  }
  res.setHeader('Retry-After', String(Math.max(1, Math.ceil((limit.retryAfterMs || 0) / 1000))));
  res.status(429).json({ error: 'Too many requests. Please try later.' });
  return false;
}

export async function clearRateLimit(req, keyPrefix) {
  if (!sql) return false;
  const bucketKey = `${String(keyPrefix || 'mutation').slice(0, 80)}:${getClientIp(req)}`;
  try {
    await sql`DELETE FROM ariverse_rate_limits WHERE bucket_key = ${bucketKey}`;
    return true;
  } catch (error) {
    if (!rateLimitStoreErrorLogged) {
      console.error('Shared rate-limit store unavailable:', error?.code || error?.name || 'unknown error');
      rateLimitStoreErrorLogged = true;
    }
    return false;
  }
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
