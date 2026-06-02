export function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function toCleanText(value, maxLen = null) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!Number.isInteger(maxLen) || maxLen <= 0) return text;
  return text.slice(0, maxLen);
}

export function toCleanTextArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toCleanText(item)).filter(Boolean);
}

export function isTruthyQuery(value) {
  return String(value || '').toLowerCase() === 'true';
}
