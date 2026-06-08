import { useEffect, useRef, useState } from 'react';

function toPositiveCount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function readPendingMap(storageKey) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch (_error) {
    return {};
  }
}

function writePendingMap(storageKey, map) {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(map).filter((key) => toPositiveCount(map[key]) > 0);
  if (keys.length === 0) {
    window.sessionStorage.removeItem(storageKey);
    return;
  }
  const next = {};
  for (const key of keys) {
    next[key] = toPositiveCount(map[key]);
  }
  window.sessionStorage.setItem(storageKey, JSON.stringify(next));
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
  const flushTimerRef = useRef(null);
  const pendingDeltaRef = useRef(0);
  const countRequestRef = useRef(0);
  const [count, setCount] = useState(() => {
    const pendingMap = readPendingMap(storageKey);
    const pendingDelta = toPositiveCount(pendingMap[entryKey]);
    pendingDeltaRef.current = pendingDelta;
    return toPositiveCount(initialCount) + pendingDelta;
  });
  const [isFlushing, setIsFlushing] = useState(false);

  useEffect(() => {
    const pendingMap = readPendingMap(storageKey);
    const pendingDelta = toPositiveCount(pendingMap[entryKey]);
    pendingDeltaRef.current = pendingDelta;
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

  async function flushPending(useBeacon = false) {
    const delta = pendingDeltaRef.current;
    if (!delta) return;
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const payload = {
      action: 'like',
      section,
      entryId: Number(entryId),
      count: delta,
    };

    setIsFlushing(true);
    try {
      let ok = false;
      if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        ok = navigator.sendBeacon(
          endpoint,
          new Blob([JSON.stringify(payload)], { type: 'application/json' }),
        );
      } else {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
        ok = res.ok;
      }

      if (ok) {
        pendingDeltaRef.current = 0;
        writePendingMap(storageKey, { ...readPendingMap(storageKey), [entryKey]: 0 });
        try {
          const response = await fetch(buildLikeQuery(endpoint, entryId, section), {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });
          if (response.ok) {
            const payload = await response.json();
            const liveCount = readLikesCount(payload, entryId);
            if (liveCount !== null) {
              setCount(liveCount);
            }
          }
        } catch (_error) {
          // Keep the optimistic count if the refresh lookup fails.
        }
      }
    } catch (_error) {
      // Keep the queued delta in session storage so it can be retried.
    } finally {
      setIsFlushing(false);
    }
  }

  function scheduleFlush() {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushPending(false);
    }, 1200);
  }

  function handleLike() {
    const nextDelta = pendingDeltaRef.current + 1;
    pendingDeltaRef.current = nextDelta;
    setCount((current) => current + 1);
    writePendingMap(storageKey, { ...readPendingMap(storageKey), [entryKey]: nextDelta });
    scheduleFlush();
  }

  useEffect(() => {
    const handlePageHide = () => {
      flushPending(true);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        flushPending(true);
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushPending(true);
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
