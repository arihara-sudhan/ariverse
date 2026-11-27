import { normalizeSectionKey, sectionTable } from './sectionRegistry.js';

export const MAX_LIKE_BATCH_COUNT = 25;

const PUBLIC_CONTENT_KEYS = [
  'ari-career', 'ari-read-books', 'aris-books', 'aris-shelf', 'binomial-names', 'book-reviews',
  'clay-play', 'guest-lectures', 'kavithaigal', 'mini-projects', 'projects', 'arichuvadi', 'arizone',
  'xperiments',
];

export const CONTENT_TARGET_TABLES = Object.freeze(
  Object.fromEntries(PUBLIC_CONTENT_KEYS.map((key) => [key, sectionTable(key)])),
);

export { normalizeSectionKey };

export function normalizeLikeBatchCount(value, defaultValue = null) {
  const numeric = value === undefined || value === null || value === '' ? defaultValue : Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_LIKE_BATCH_COUNT) return null;
  return numeric;
}

export function likeSubmissionDelta(appliedCount, requestedCount) {
  return Math.max(0, Number(requestedCount || 0) - Number(appliedCount || 0));
}

export function isPendingCommentOwner({ status, storedToken, providedToken }) {
  return status === 'pending'
    && typeof providedToken === 'string'
    && providedToken.length > 0
    && storedToken === providedToken;
}

export function replyTargetMatches(parentTargetKey, replyTargetKey) {
  return Boolean(parentTargetKey) && parentTargetKey === replyTargetKey;
}

export function createMutationError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function getMutationErrorResponse(error) {
  if (Number(error?.statusCode) >= 400 && Number(error?.statusCode) < 500) {
    return { status: Number(error.statusCode), message: error.message };
  }
  if (error?.code === 'P0002') {
    return { status: 404, message: 'The requested target was not found.' };
  }
  if (error?.code === '22023') {
    return { status: 400, message: 'The request could not be applied.' };
  }
  return null;
}
