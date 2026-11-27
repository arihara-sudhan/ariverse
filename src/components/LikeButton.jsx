import { useEffect, useRef, useState } from 'react';

const MAX_LIKE_BATCH_COUNT = 25;

function toPositiveCount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function readPendingMap(storageKey) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch (_error) {
    return {};
  }
}

function normalizePendingRecord(value) {
  if (typeof value === 'number') {
    return { count: toPositiveCount(value), idempotencyKey: '' };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { count: 0, idempotencyKey: '' };
  }
  return {
    count: toPositiveCount(value.count),
    idempotencyKey: typeof value.idempotencyKey === 'string' ? value.idempotencyKey.trim().slice(0, 120) : '',
  };
}

function createIdempotencyKey() {
  if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `like-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function writePendingMap(storageKey, map) {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(map).filter((key) => normalizePendingRecord(map[key]).count > 0);
  if (keys.length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  const next = {};
  for (const key of keys) {
    const record = normalizePendingRecord(map[key]);
    next[key] = {
      count: record.count,
      idempotencyKey: record.idempotencyKey || createIdempotencyKey(),
    };
  }
  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

function buildLikeQuery(endpoint, entryId, section) {
  if (typeof window === 'undefined') return '';
  const url = new URL(endpoint, window.location.origin);
  if (url.pathname === '/api/content/reactions') {
    url.searchParams.set('section', String(section || '').trim());
    url.searchParams.set('entryIds', String(entryId));
    return url.toString();
  }
  if (url.pathname === '/api/book-reviews/reactions' || url.pathname === '/api/clay-play/reactions') {
    url.searchParams.set('entryId', String(entryId));
    return url.toString();
  }
  url.searchParams.set('entryId', String(entryId));
  return url.toString();
}

function readLikesCount(payload, entryId) {
  const reactions = payload?.reactions;
  if (!reactions || typeof reactions !== 'object') return null;
  const key = String(entryId);
  const entry = reactions[key] ?? reactions[Number(entryId)] ?? reactions?.[0];
  const count = Number(entry?.likesCount);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : null;
}

export default function LikeButton({
  endpoint,
  entryId,
  initialCount = 0,
  storageNamespace = 'default',
  section = storageNamespace,
  className = '',
  label = 'like this',
  showText = false,
}) {
  const entryKey = String(entryId);
  const storageKey = `ariverse:like-pending:${storageNamespace}`;
  const pendingDeltaRef = useRef(0);
  const pendingKeyRef = useRef('');
  const countRequestRef = useRef(0);
  const flushInFlightRef = useRef(false);
  const [count, setCount] = useState(() => {
    const pendingMap = readPendingMap(storageKey);
    const pendingRecord = normalizePendingRecord(pendingMap[entryKey]);
    const pendingDelta = pendingRecord.count;
    const idempotencyKey = pendingRecord.idempotencyKey || createIdempotencyKey();
    pendingDeltaRef.current = pendingDelta;
    pendingKeyRef.current = idempotencyKey;
    if (pendingDelta > 0 && !pendingRecord.idempotencyKey) {
      writePendingMap(storageKey, { ...pendingMap, [entryKey]: { count: pendingDelta, idempotencyKey } });
    }
    return toPositiveCount(initialCount) + pendingDelta;
  });
  const [isFlushing, setIsFlushing] = useState(false);

  useEffect(() => {
    const pendingMap = readPendingMap(storageKey);
    const pendingRecord = normalizePendingRecord(pendingMap[entryKey]);
    const pendingDelta = pendingRecord.count;
    const idempotencyKey = pendingRecord.idempotencyKey || createIdempotencyKey();
    pendingDeltaRef.current = pendingDelta;
    pendingKeyRef.current = idempotencyKey;
    if (pendingDelta > 0 && !pendingRecord.idempotencyKey) {
      writePendingMap(storageKey, { ...pendingMap, [entryKey]: { count: pendingDelta, idempotencyKey } });
    }
    setCount(toPositiveCount(initialCount) + pendingDelta);
  }, [entryKey, initialCount, storageKey]);

  useEffect(() => {
    let cancelled = false;
    const requestId = countRequestRef.current + 1;
    countRequestRef.current = requestId;

    async function syncLiveCount() {
      try {
        const response = await fetch(buildLikeQuery(endpoint, entryId, section), {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok || cancelled || countRequestRef.current !== requestId) return;
        const payload = await response.json();
        const liveCount = readLikesCount(payload, entryId);
        if (liveCount === null) return;
        setCount(liveCount + pendingDeltaRef.current);
      } catch (_error) {
        // Fall back to the static count when the live lookup is unavailable.
      }
    }

    syncLiveCount();

    return () => {
      cancelled = true;
    };
  }, [endpoint, entryId, section]);

  function acknowledgePendingBatch(batchCount) {
    const pendingMap = readPendingMap(storageKey);
    const current = normalizePendingRecord(pendingMap[entryKey]);
    const remaining = Math.max(0, current.count - batchCount);
    pendingDeltaRef.current = remaining;
    if (remaining > 0) {
      const nextKey = createIdempotencyKey();
      pendingKeyRef.current = nextKey;
      writePendingMap(storageKey, {
        ...pendingMap,
        [entryKey]: { count: remaining, idempotencyKey: nextKey },
      });
      return;
    }
    pendingKeyRef.current = '';
    writePendingMap(storageKey, { ...pendingMap, [entryKey]: 0 });
  }

  async function flushPending({ useBeacon = false } = {}) {
    const delta = pendingDeltaRef.current;
    if (!delta || flushInFlightRef.current) return;
    const batchCount = Math.min(delta, MAX_LIKE_BATCH_COUNT);
    const idempotencyKey = pendingKeyRef.current || createIdempotencyKey();
    pendingKeyRef.current = idempotencyKey;

    const payload = {
      action: 'like',
      section,
      entryId: Number(entryId),
      count: batchCount,
      idempotencyKey,
    };

    flushInFlightRef.current = true;
    setIsFlushing(true);
    try {
      if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const queued = navigator.sendBeacon(
          endpoint,
          new Blob([JSON.stringify(payload)], { type: 'application/json' }),
        );
        if (queued) {
          acknowledgePendingBatch(batchCount);
        }
        return;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (res.ok) {
        acknowledgePendingBatch(batchCount);
      }
    } catch (_error) {
      // Keep the queued delta in session storage so it can be retried.
    } finally {
      flushInFlightRef.current = false;
      setIsFlushing(false);
    }
  }

  function handleLike() {
    const pendingMap = readPendingMap(storageKey);
    const current = normalizePendingRecord(pendingMap[entryKey]);
    const idempotencyKey = current.idempotencyKey || pendingKeyRef.current || createIdempotencyKey();
    const nextDelta = current.count + 1;
    pendingDeltaRef.current = nextDelta;
    pendingKeyRef.current = idempotencyKey;
    setCount((current) => current + 1);
    writePendingMap(storageKey, {
      ...pendingMap,
      [entryKey]: { count: nextDelta, idempotencyKey },
    });
  }

  useEffect(() => {
    const handlePageHide = () => {
      flushPending({ useBeacon: true });
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        flushPending({ useBeacon: true });
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushPending({ useBeacon: false });
    };
  }, [entryKey, endpoint, storageKey]);

  return (
    <div className={`like-reaction ${className}`.trim()} aria-label="Like reaction">
      <button
        type="button"
        className="like-button"
        onClick={handleLike}
        aria-label={`${count} likes. ${label}`}
        aria-busy={isFlushing}
      >
        <span className="like-button-icon" aria-hidden="true">{'\u2764\uFE0F'}</span>
        <span className="like-button-count">{count}</span>
        {showText ? <span className="like-button-text">{label}</span> : null}
      </button>
    </div>
  );
}
