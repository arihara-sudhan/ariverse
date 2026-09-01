export const XPAND_STATUSES = ['planned', 'active', 'paused', 'completed', 'abandoned', 'archived'];
export const XPAND_VISIBILITIES = ['draft', 'public', 'private'];
export const XPAND_LOG_VISIBILITIES = ['draft', 'public', 'private'];
export const XPAND_MILESTONE_STATUSES = ['todo', 'active', 'completed', 'blocked', 'dropped'];
export const XPAND_EVIDENCE_TYPES = [
  'commit',
  'pull_request',
  'github_issue',
  'code',
  'experiment',
  'benchmark',
  'report',
  'article',
  'technical_note',
  'demo',
  'video',
  'model',
  'dataset',
  'paper',
  'paper_review',
  'architecture',
  'screenshot',
  'presentation',
  'other',
];
export const XPAND_RESOURCE_TYPES = ['paper', 'book', 'article', 'documentation', 'course', 'video', 'repository', 'dataset', 'tool', 'other'];
export const XPAND_RESOURCE_STATUSES = ['queued', 'reading', 'completed', 'dropped'];
export const XPAND_NOTE_KINDS = ['note', 'question', 'idea', 'insight', 'concept', 'hypothesis', 'failure', 'reflection'];
export const XPAND_QUESTION_STATUSES = ['open', 'explored', 'answered', 'abandoned'];
export const XPAND_EXPERIMENT_STATUSES = ['planned', 'running', 'completed', 'failed', 'abandoned'];
export const XPAND_SECTION_STATUSES = ['planned', 'active', 'completed', 'paused', 'archived'];

const QUICK_LOG_COMMANDS = new Set([
  'done',
  'learned',
  'failed',
  'question',
  'idea',
  'insight',
  'blocker',
  'next',
  'read',
  'evidence',
  'time',
  'note',
]);

export function cleanText(value, maxLength = null) {
  const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  if (!Number.isInteger(maxLength) || maxLength <= 0) return text;
  return text.slice(0, maxLength);
}

export function normalizeOptionalText(value, maxLength = null) {
  const text = cleanText(value, maxLength);
  return text || '';
}

export function normalizeSlugBase(value) {
  const text = cleanText(value)
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return text || 'xpand';
}

export function resolveDuplicateSlug(baseSlug, existingSlugs = []) {
  const base = normalizeSlugBase(baseSlug);
  const used = new Set(
    Array.isArray(existingSlugs)
      ? existingSlugs.map((value) => normalizeSlugBase(value)).filter(Boolean)
      : [],
  );
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export function normalizeStatus(value) {
  const status = cleanText(value).toLowerCase();
  return XPAND_STATUSES.includes(status) ? status : 'active';
}

export function normalizeVisibility(value, fallback = 'public') {
  const visibility = cleanText(value).toLowerCase();
  if (XPAND_VISIBILITIES.includes(visibility)) return visibility;
  return XPAND_VISIBILITIES.includes(fallback) ? fallback : 'public';
}

export function normalizeMilestoneStatus(value) {
  const status = cleanText(value).toLowerCase();
  return XPAND_MILESTONE_STATUSES.includes(status) ? status : 'todo';
}

export function normalizeResourceType(value) {
  const type = cleanText(value).toLowerCase();
  return XPAND_RESOURCE_TYPES.includes(type) ? type : 'other';
}

export function normalizeResourceStatus(value) {
  const status = cleanText(value).toLowerCase();
  return XPAND_RESOURCE_STATUSES.includes(status) ? status : 'queued';
}

export function normalizeEvidenceType(value) {
  const type = cleanText(value).toLowerCase();
  return XPAND_EVIDENCE_TYPES.includes(type) ? type : 'other';
}

export function normalizeNoteKind(value) {
  const kind = cleanText(value).toLowerCase();
  return XPAND_NOTE_KINDS.includes(kind) ? kind : 'note';
}

export function normalizeQuestionStatus(value) {
  const status = cleanText(value).toLowerCase();
  return XPAND_QUESTION_STATUSES.includes(status) ? status : 'open';
}

export function normalizeExperimentStatus(value) {
  const status = cleanText(value).toLowerCase();
  return XPAND_EXPERIMENT_STATUSES.includes(status) ? status : 'planned';
}

export function normalizeSectionStatus(value) {
  const status = cleanText(value).toLowerCase();
  return XPAND_SECTION_STATUSES.includes(status) ? status : 'planned';
}

export function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }
  const text = cleanText(value);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return normalizeStringArray(parsed);
  } catch (_error) {
    return text
      .split(/\r?\n|,/)
      .map((item) => cleanText(item))
      .filter(Boolean);
  }
  return [];
}

export function parseDurationToMinutes(value) {
  const raw = cleanText(value).toLowerCase();
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, '');
  if (!/^(?:(\d+)h)?(?:(\d+)(?:m|min))?$/.test(compact)) {
    return null;
  }
  const match = compact.match(/^(?:(\d+)h)?(?:(\d+)(?:m|min))?$/);
  const hours = Number.parseInt(match?.[1] || '0', 10);
  const minutes = Number.parseInt(match?.[2] || '0', 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours <= 0 && minutes <= 0) return null;
  return hours * 60 + minutes;
}

export function formatDateKeyInZone(date = new Date(), timeZone = 'Asia/Kolkata') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '0000';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

export function normalizeDateOnlyValue(value, timeZone = 'Asia/Kolkata') {
  if (!value) return null;
  if (value instanceof Date) {
    return formatDateKeyInZone(value, timeZone);
  }

  const text = cleanText(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateKeyInZone(date, timeZone);
}

export function normalizeMonthKey(value) {
  const text = cleanText(value, 7);
  if (!/^\d{4}-\d{2}$/.test(text)) return '';
  const [yearText, monthText] = text.split('-');
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return '';
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

export function getMonthBounds(value) {
  const monthKey = normalizeMonthKey(value);
  if (!monthKey) return null;
  const [yearText, monthText] = monthKey.split('-');
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  return {
    monthKey,
    startDate: `${monthKey}-01`,
    endDateExclusive: `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}-01`,
  };
}

export function isAbsoluteHttpUrl(value) {
  const input = cleanText(value);
  if (!input) return false;
  try {
    const parsed = new URL(input);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (_error) {
    return false;
  }
}

export function getTimelineDayKey(value) {
  return normalizeDateOnlyValue(value) || '';
}

export function formatReadableDate(value, options = {}) {
  const normalized = normalizeDateOnlyValue(value, options.timeZone || 'Asia/Kolkata');
  if (!normalized) return '';
  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function parseQuickLogInput(input) {
  const lines = String(input || '').split(/\r?\n/);
  const commands = [];
  const errors = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const match = trimmed.match(/^\/([a-z]+)\s+([\s\S]+)$/i);
    if (!match) {
      errors.push(`Line ${index + 1}: commands must look like /command value.`);
      return;
    }
    const command = cleanText(match[1]).toLowerCase();
    const value = cleanText(match[2]);
    if (!QUICK_LOG_COMMANDS.has(command)) {
      errors.push(`Line ${index + 1}: unknown command "/${command}".`);
      return;
    }
    if (!value) {
      errors.push(`Line ${index + 1}: "/${command}" needs a value.`);
      return;
    }
    if (command === 'time') {
      const minutes = parseDurationToMinutes(value);
      if (!minutes) {
        errors.push(`Line ${index + 1}: invalid duration "${value}".`);
        return;
      }
      commands.push({ command, value, minutes, lineNumber: index + 1 });
      return;
    }
    commands.push({ command, value, lineNumber: index + 1 });
  });

  if (commands.length === 0 && errors.length === 0) {
    errors.push('Enter at least one quick-log command.');
  }

  return {
    ok: errors.length === 0,
    errors,
    commands,
  };
}
