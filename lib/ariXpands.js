import { neon } from '@neondatabase/serverless';
import {
  cleanText,
  formatDateKeyInZone,
  getMonthBounds,
  isAbsoluteHttpUrl,
  normalizeEvidenceType,
  normalizeExperimentStatus,
  normalizeMilestoneStatus,
  normalizeDateOnlyValue,
  normalizeMonthKey,
  normalizeNoteKind,
  normalizeOptionalText,
  normalizeQuestionStatus,
  resolveDuplicateSlug,
  normalizeResourceStatus,
  normalizeResourceType,
  normalizeSectionStatus,
  normalizeSlugBase,
  normalizeStatus,
  normalizeStringArray,
  normalizeVisibility,
  parseQuickLogInput,
} from './ariXpandsCore.mjs';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

let schemaReady = false;

function serializeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
}

function normalizeDateOnly(value) {
  return normalizeDateOnlyValue(value);
}

function normalizeNullableUrl(value) {
  const text = cleanText(value, 1000);
  if (!text) return '';
  return isAbsoluteHttpUrl(text) ? text : '';
}

function resolveRequestedMonth(requestedMonth, monthRows = []) {
  const normalized = normalizeMonthKey(requestedMonth);
  if (normalized && monthRows.some((row) => row.monthKey === normalized)) {
    return normalized;
  }
  return monthRows[0]?.monthKey || '';
}

function normalizeJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const text = cleanText(value);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function normalizeCountMap(rows = [], keyField = 'xpandId', valueField = 'count') {
  const map = new Map();
  for (const row of rows) {
    const key = Number(row?.[keyField]);
    if (!Number.isInteger(key) || key <= 0) continue;
    map.set(key, Number(row?.[valueField]) || 0);
  }
  return map;
}

function normalizeIsoMap(rows = [], keyField = 'xpandId', valueField = 'dateValue') {
  const map = new Map();
  for (const row of rows) {
    const key = Number(row?.[keyField]);
    if (!Number.isInteger(key) || key <= 0) continue;
    map.set(key, serializeDateValue(row?.[valueField]));
  }
  return map;
}

function normalizeXpandRow(row = {}) {
  return {
    id: Number(row?.id) || null,
    title: normalizeOptionalText(row?.title, 180),
    slug: normalizeOptionalText(row?.slug, 200),
    subtitle: normalizeOptionalText(row?.subtitle, 240),
    description: typeof row?.description === 'string' ? row.description : String(row?.description || ''),
    status: normalizeStatus(row?.status),
    visibility: normalizeVisibility(row?.visibility),
    coverImage: normalizeOptionalText(row?.cover_image || row?.coverImage, 1000),
    startDate: normalizeDateOnly(row?.start_date || row?.startDate),
    endDate: normalizeDateOnly(row?.end_date || row?.endDate),
    tags: normalizeStringArray(row?.tags),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt),
    archivedAt: serializeDateValue(row?.archived_at || row?.archivedAt),
  };
}

function normalizeLogRow(row = {}) {
  return {
    id: Number(row?.id) || null,
    xpandId: Number(row?.xpand_id || row?.xpandId) || null,
    date: normalizeDateOnly(row?.log_date || row?.date),
    title: normalizeOptionalText(row?.title, 180),
    summary: normalizeOptionalText(row?.summary, 500),
    done: normalizeStringArray(row?.done_items || row?.done),
    learned: normalizeStringArray(row?.learned_items || row?.learned),
    failed: normalizeStringArray(row?.failed_items || row?.failed),
    questions: normalizeStringArray(row?.question_items || row?.questions),
    blockers: normalizeStringArray(row?.blocker_items || row?.blockers),
    next: normalizeStringArray(row?.next_items || row?.next),
    freeformNote: typeof row?.note_markdown === 'string' ? row.note_markdown : String(row?.freeformNote || ''),
    timeSpentMinutes: Number.isInteger(Number(row?.time_spent_minutes ?? row?.timeSpentMinutes))
      ? Number(row?.time_spent_minutes ?? row?.timeSpentMinutes)
      : 0,
    visibility: normalizeVisibility(row?.visibility, 'public'),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt),
  };
}

function normalizeNoteRow(row = {}) {
  const kind = normalizeNoteKind(row?.kind);
  return {
    id: Number(row?.id) || null,
    xpandId: Number(row?.xpand_id || row?.xpandId) || null,
    title: normalizeOptionalText(row?.title, 180),
    content: typeof row?.content === 'string' ? row.content : String(row?.content || ''),
    kind,
    status: kind === 'question' ? normalizeQuestionStatus(row?.status) : normalizeOptionalText(row?.status, 40),
    visibility: normalizeVisibility(row?.visibility, 'public'),
    linkedEntityType: normalizeOptionalText(row?.linked_entity_type || row?.linkedEntityType, 40),
    linkedEntityId: Number(row?.linked_entity_id || row?.linkedEntityId) || null,
    createdAt: serializeDateValue(row?.created_at || row?.createdAt),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt),
  };
}

function normalizeMilestoneRow(row = {}) {
  return {
    id: Number(row?.id) || null,
    xpandId: Number(row?.xpand_id || row?.xpandId) || null,
    title: normalizeOptionalText(row?.title, 180),
    description: typeof row?.description === 'string' ? row.description : String(row?.description || ''),
    status: normalizeMilestoneStatus(row?.status),
    order: Number(row?.sort_order || row?.order) || 0,
    targetDate: normalizeDateOnly(row?.target_date || row?.targetDate),
    completedAt: serializeDateValue(row?.completed_at || row?.completedAt),
    visibility: normalizeVisibility(row?.visibility, 'public'),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt),
  };
}

function normalizeEvidenceRow(row = {}) {
  return {
    id: Number(row?.id) || null,
    xpandId: Number(row?.xpand_id || row?.xpandId) || null,
    title: normalizeOptionalText(row?.title, 180),
    description: typeof row?.description === 'string' ? row.description : String(row?.description || ''),
    type: normalizeEvidenceType(row?.evidence_type || row?.type),
    url: normalizeNullableUrl(row?.url),
    date: normalizeDateOnly(row?.evidence_date || row?.date) || normalizeDateOnly(row?.created_at || row?.createdAt),
    metadata: normalizeJsonObject(row?.metadata_json || row?.metadata),
    visibility: normalizeVisibility(row?.visibility, 'public'),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt),
  };
}

function normalizeResourceRow(row = {}) {
  return {
    id: Number(row?.id) || null,
    xpandId: Number(row?.xpand_id || row?.xpandId) || null,
    title: normalizeOptionalText(row?.title, 180),
    type: normalizeResourceType(row?.resource_type || row?.type),
    url: normalizeNullableUrl(row?.url),
    author: normalizeOptionalText(row?.author, 180),
    notes: typeof row?.notes === 'string' ? row.notes : String(row?.notes || ''),
    status: normalizeResourceStatus(row?.status),
    visibility: normalizeVisibility(row?.visibility, 'public'),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt),
  };
}

function normalizeExperimentRow(row = {}) {
  return {
    id: Number(row?.id) || null,
    xpandId: Number(row?.xpand_id || row?.xpandId) || null,
    experimentId: normalizeOptionalText(row?.experiment_code || row?.experimentId, 80),
    title: normalizeOptionalText(row?.title, 180),
    question: typeof row?.question === 'string' ? row.question : String(row?.question || ''),
    hypothesis: typeof row?.hypothesis === 'string' ? row.hypothesis : String(row?.hypothesis || ''),
    method: typeof row?.method === 'string' ? row.method : String(row?.method || ''),
    baseline: typeof row?.baseline === 'string' ? row.baseline : String(row?.baseline || ''),
    dataset: typeof row?.dataset === 'string' ? row.dataset : String(row?.dataset || ''),
    config: typeof row?.config === 'string' ? row.config : String(row?.config || ''),
    hardware: typeof row?.hardware === 'string' ? row.hardware : String(row?.hardware || ''),
    metrics: typeof row?.metrics === 'string' ? row.metrics : String(row?.metrics || ''),
    result: typeof row?.result === 'string' ? row.result : String(row?.result || ''),
    failureAnalysis: typeof row?.failure_analysis === 'string' ? row.failure_analysis : String(row?.failureAnalysis || ''),
    interpretation: typeof row?.interpretation === 'string' ? row.interpretation : String(row?.interpretation || ''),
    nextExperiment: typeof row?.next_experiment === 'string' ? row.next_experiment : String(row?.nextExperiment || ''),
    status: normalizeExperimentStatus(row?.status),
    startedAt: serializeDateValue(row?.started_at || row?.startedAt),
    completedAt: serializeDateValue(row?.completed_at || row?.completedAt),
    visibility: normalizeVisibility(row?.visibility, 'public'),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt),
  };
}

function normalizeSectionRow(row = {}) {
  return {
    id: Number(row?.id) || null,
    xpandId: Number(row?.xpand_id || row?.xpandId) || null,
    parentSectionId: Number(row?.parent_section_id || row?.parentSectionId) || null,
    title: normalizeOptionalText(row?.title, 180),
    description: typeof row?.description === 'string' ? row.description : String(row?.description || ''),
    order: Number(row?.sort_order || row?.order) || 0,
    status: normalizeSectionStatus(row?.status),
    startDate: normalizeDateOnly(row?.start_date || row?.startDate),
    endDate: normalizeDateOnly(row?.end_date || row?.endDate),
    metadata: normalizeJsonObject(row?.metadata_json || row?.metadata),
    createdAt: serializeDateValue(row?.created_at || row?.createdAt),
    updatedAt: serializeDateValue(row?.updated_at || row?.updatedAt),
  };
}

async function ensureSchema() {
  if (!sql || schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS ari_xpands (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      subtitle TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      visibility TEXT NOT NULL DEFAULT 'public',
      cover_image TEXT NOT NULL DEFAULT '',
      start_date DATE NULL,
      end_date DATE NULL,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ NULL,
      CONSTRAINT ari_xpands_status_check CHECK (status IN ('planned', 'active', 'paused', 'completed', 'abandoned', 'archived')),
      CONSTRAINT ari_xpands_visibility_check CHECK (visibility IN ('draft', 'public', 'private'))
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ari_xpands_visibility_status ON ari_xpands (visibility, status, updated_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ari_xpand_logs (
      id BIGSERIAL PRIMARY KEY,
      xpand_id BIGINT NOT NULL REFERENCES ari_xpands(id) ON DELETE CASCADE,
      log_date DATE NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      done_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      learned_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      failed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      question_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      blocker_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      next_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      note_markdown TEXT NOT NULL DEFAULT '',
      time_spent_minutes INTEGER NOT NULL DEFAULT 0,
      visibility TEXT NOT NULL DEFAULT 'public',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT ari_xpand_logs_unique_day UNIQUE (xpand_id, log_date),
      CONSTRAINT ari_xpand_logs_visibility_check CHECK (visibility IN ('draft', 'public', 'private'))
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ari_xpand_logs_xpand_date ON ari_xpand_logs (xpand_id, log_date DESC, id DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ari_xpand_notes (
      id BIGSERIAL PRIMARY KEY,
      xpand_id BIGINT NOT NULL REFERENCES ari_xpands(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'note',
      status TEXT NOT NULL DEFAULT '',
      visibility TEXT NOT NULL DEFAULT 'public',
      linked_entity_type TEXT NOT NULL DEFAULT '',
      linked_entity_id BIGINT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT ari_xpand_notes_kind_check CHECK (kind IN ('note', 'question', 'idea', 'insight', 'concept', 'hypothesis', 'failure', 'reflection')),
      CONSTRAINT ari_xpand_notes_visibility_check CHECK (visibility IN ('draft', 'public', 'private'))
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ari_xpand_notes_xpand_created ON ari_xpand_notes (xpand_id, created_at DESC, id DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ari_xpand_milestones (
      id BIGSERIAL PRIMARY KEY,
      xpand_id BIGINT NOT NULL REFERENCES ari_xpands(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      sort_order INTEGER NOT NULL DEFAULT 0,
      target_date DATE NULL,
      completed_at TIMESTAMPTZ NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT ari_xpand_milestones_status_check CHECK (status IN ('todo', 'active', 'completed', 'blocked', 'dropped')),
      CONSTRAINT ari_xpand_milestones_visibility_check CHECK (visibility IN ('draft', 'public', 'private'))
    )
  `;
  await sql`ALTER TABLE ari_xpand_milestones ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ari_xpand_milestones_xpand_order ON ari_xpand_milestones (xpand_id, sort_order ASC, id ASC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ari_xpand_evidence (
      id BIGSERIAL PRIMARY KEY,
      xpand_id BIGINT NOT NULL REFERENCES ari_xpands(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      evidence_type TEXT NOT NULL DEFAULT 'other',
      url TEXT NOT NULL DEFAULT '',
      evidence_date DATE NULL,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      visibility TEXT NOT NULL DEFAULT 'public',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT ari_xpand_evidence_visibility_check CHECK (visibility IN ('draft', 'public', 'private'))
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ari_xpand_evidence_xpand_date ON ari_xpand_evidence (xpand_id, evidence_date DESC, id DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ari_xpand_resources (
      id BIGSERIAL PRIMARY KEY,
      xpand_id BIGINT NOT NULL REFERENCES ari_xpands(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      resource_type TEXT NOT NULL DEFAULT 'other',
      url TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'queued',
      visibility TEXT NOT NULL DEFAULT 'public',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT ari_xpand_resources_status_check CHECK (status IN ('queued', 'reading', 'completed', 'dropped')),
      CONSTRAINT ari_xpand_resources_visibility_check CHECK (visibility IN ('draft', 'public', 'private'))
    )
  `;
  await sql`ALTER TABLE ari_xpand_resources ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ari_xpand_resources_xpand_created ON ari_xpand_resources (xpand_id, created_at DESC, id DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ari_xpand_experiments (
      id BIGSERIAL PRIMARY KEY,
      xpand_id BIGINT NOT NULL REFERENCES ari_xpands(id) ON DELETE CASCADE,
      experiment_code TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      question TEXT NOT NULL DEFAULT '',
      hypothesis TEXT NOT NULL DEFAULT '',
      method TEXT NOT NULL DEFAULT '',
      baseline TEXT NOT NULL DEFAULT '',
      dataset TEXT NOT NULL DEFAULT '',
      config TEXT NOT NULL DEFAULT '',
      hardware TEXT NOT NULL DEFAULT '',
      metrics TEXT NOT NULL DEFAULT '',
      result TEXT NOT NULL DEFAULT '',
      failure_analysis TEXT NOT NULL DEFAULT '',
      interpretation TEXT NOT NULL DEFAULT '',
      next_experiment TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planned',
      started_at TIMESTAMPTZ NULL,
      completed_at TIMESTAMPTZ NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT ari_xpand_experiments_status_check CHECK (status IN ('planned', 'running', 'completed', 'failed', 'abandoned')),
      CONSTRAINT ari_xpand_experiments_visibility_check CHECK (visibility IN ('draft', 'public', 'private'))
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ari_xpand_experiments_xpand_created ON ari_xpand_experiments (xpand_id, created_at DESC, id DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ari_xpand_sections (
      id BIGSERIAL PRIMARY KEY,
      xpand_id BIGINT NOT NULL REFERENCES ari_xpands(id) ON DELETE CASCADE,
      parent_section_id BIGINT NULL REFERENCES ari_xpand_sections(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'planned',
      start_date DATE NULL,
      end_date DATE NULL,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT ari_xpand_sections_status_check CHECK (status IN ('planned', 'active', 'completed', 'paused', 'archived'))
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ari_xpand_sections_xpand_parent_order ON ari_xpand_sections (xpand_id, parent_section_id, sort_order ASC, id ASC)`;

  schemaReady = true;
}

async function getXpandAggregateMaps(includePrivate = false) {
  if (!sql) {
    return {
      daysLogged: new Map(),
      timeSpent: new Map(),
      notes: new Map(),
      questions: new Map(),
      questionsAnswered: new Map(),
      experiments: new Map(),
      failedExperiments: new Map(),
      evidence: new Map(),
      resourcesCompleted: new Map(),
      milestonesCompleted: new Map(),
      lastTouched: new Map(),
    };
  }

  await ensureSchema();

  const [
    daysLoggedRows,
    timeRows,
    notesRows,
    questionRows,
    answeredRows,
    experimentRows,
    failedExperimentRows,
    evidenceRows,
    resourceRows,
    milestoneRows,
    lastTouchedRows,
  ] = await Promise.all([
    sql`
      SELECT xpand_id AS "xpandId", COUNT(*)::int AS count
      FROM ari_xpand_logs
      WHERE visibility = 'public' OR ${includePrivate}::boolean
      GROUP BY xpand_id
    `,
    sql`
      SELECT xpand_id AS "xpandId", COALESCE(SUM(time_spent_minutes), 0)::int AS count
      FROM ari_xpand_logs
      WHERE visibility = 'public' OR ${includePrivate}::boolean
      GROUP BY xpand_id
    `,
    sql`
      SELECT xpand_id AS "xpandId", COUNT(*)::int AS count
      FROM ari_xpand_notes
      WHERE (visibility = 'public' OR ${includePrivate}::boolean) AND kind <> 'question'
      GROUP BY xpand_id
    `,
    sql`
      SELECT xpand_id AS "xpandId", COUNT(*)::int AS count
      FROM ari_xpand_notes
      WHERE (visibility = 'public' OR ${includePrivate}::boolean) AND kind = 'question'
      GROUP BY xpand_id
    `,
    sql`
      SELECT xpand_id AS "xpandId", COUNT(*)::int AS count
      FROM ari_xpand_notes
      WHERE (visibility = 'public' OR ${includePrivate}::boolean) AND kind = 'question' AND status = 'answered'
      GROUP BY xpand_id
    `,
    sql`
      SELECT xpand_id AS "xpandId", COUNT(*)::int AS count
      FROM ari_xpand_experiments
      WHERE visibility = 'public' OR ${includePrivate}::boolean
      GROUP BY xpand_id
    `,
    sql`
      SELECT xpand_id AS "xpandId", COUNT(*)::int AS count
      FROM ari_xpand_experiments
      WHERE (visibility = 'public' OR ${includePrivate}::boolean) AND status = 'failed'
      GROUP BY xpand_id
    `,
    sql`
      SELECT xpand_id AS "xpandId", COUNT(*)::int AS count
      FROM ari_xpand_evidence
      WHERE visibility = 'public' OR ${includePrivate}::boolean
      GROUP BY xpand_id
    `,
    sql`
      SELECT xpand_id AS "xpandId", COUNT(*)::int AS count
      FROM ari_xpand_resources
      WHERE status = 'completed' AND (visibility = 'public' OR ${includePrivate}::boolean)
      GROUP BY xpand_id
    `,
    sql`
      SELECT xpand_id AS "xpandId", COUNT(*)::int AS count
      FROM ari_xpand_milestones
      WHERE status = 'completed' AND (visibility = 'public' OR ${includePrivate}::boolean)
      GROUP BY xpand_id
    `,
    sql`
      SELECT xpand_id AS "xpandId", MAX(touched_at) AS "dateValue"
      FROM (
        SELECT id AS xpand_id, updated_at AS touched_at
        FROM ari_xpands
        WHERE visibility = 'public' OR ${includePrivate}::boolean
        UNION ALL
        SELECT xpand_id, updated_at AS touched_at
        FROM ari_xpand_logs
        WHERE visibility = 'public' OR ${includePrivate}::boolean
        UNION ALL
        SELECT xpand_id, updated_at AS touched_at
        FROM ari_xpand_notes
        WHERE visibility = 'public' OR ${includePrivate}::boolean
        UNION ALL
        SELECT xpand_id, updated_at AS touched_at
        FROM ari_xpand_milestones
        WHERE visibility = 'public' OR ${includePrivate}::boolean
        UNION ALL
        SELECT xpand_id, COALESCE(evidence_date::timestamptz, created_at) AS touched_at
        FROM ari_xpand_evidence
        WHERE visibility = 'public' OR ${includePrivate}::boolean
        UNION ALL
        SELECT xpand_id, updated_at AS touched_at
        FROM ari_xpand_resources
        WHERE visibility = 'public' OR ${includePrivate}::boolean
        UNION ALL
        SELECT xpand_id, updated_at AS touched_at
        FROM ari_xpand_experiments
        WHERE visibility = 'public' OR ${includePrivate}::boolean
      ) all_touches
      GROUP BY xpand_id
    `,
  ]);

  return {
    daysLogged: normalizeCountMap(daysLoggedRows),
    timeSpent: normalizeCountMap(timeRows),
    notes: normalizeCountMap(notesRows),
    questions: normalizeCountMap(questionRows),
    questionsAnswered: normalizeCountMap(answeredRows),
    experiments: normalizeCountMap(experimentRows),
    failedExperiments: normalizeCountMap(failedExperimentRows),
    evidence: normalizeCountMap(evidenceRows),
    resourcesCompleted: normalizeCountMap(resourceRows),
    milestonesCompleted: normalizeCountMap(milestoneRows),
    lastTouched: normalizeIsoMap(lastTouchedRows),
  };
}

function attachSummary(xpand, aggregateMaps) {
  const id = Number(xpand?.id);
  const stats = {
    daysLogged: aggregateMaps.daysLogged.get(id) || 0,
    timeSpentMinutes: aggregateMaps.timeSpent.get(id) || 0,
    notes: aggregateMaps.notes.get(id) || 0,
    questions: aggregateMaps.questions.get(id) || 0,
    questionsAnswered: aggregateMaps.questionsAnswered.get(id) || 0,
    experiments: aggregateMaps.experiments.get(id) || 0,
    failedExperiments: aggregateMaps.failedExperiments.get(id) || 0,
    evidence: aggregateMaps.evidence.get(id) || 0,
    resourcesCompleted: aggregateMaps.resourcesCompleted.get(id) || 0,
    milestonesCompleted: aggregateMaps.milestonesCompleted.get(id) || 0,
  };
  return {
    ...xpand,
    stats,
    lastTouched: aggregateMaps.lastTouched.get(id) || xpand.updatedAt || xpand.createdAt || null,
  };
}

async function listEntityRows(entityType, xpandId, includePrivate = true) {
  await ensureSchema();
  const resolvedId = Number(xpandId);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return [];

  switch (entityType) {
    case 'logs': {
      const rows = await sql`
        SELECT *
        FROM ari_xpand_logs
        WHERE xpand_id = ${resolvedId} AND (${includePrivate}::boolean OR visibility = 'public')
        ORDER BY log_date DESC, updated_at DESC, id DESC
      `;
      return rows.map(normalizeLogRow);
    }
    case 'notes': {
      const rows = await sql`
        SELECT *
        FROM ari_xpand_notes
        WHERE xpand_id = ${resolvedId} AND (${includePrivate}::boolean OR visibility = 'public')
        ORDER BY updated_at DESC, id DESC
      `;
      return rows.map(normalizeNoteRow);
    }
    case 'milestones': {
      const rows = await sql`
        SELECT *
        FROM ari_xpand_milestones
        WHERE xpand_id = ${resolvedId} AND (${includePrivate}::boolean OR visibility = 'public')
        ORDER BY sort_order ASC, id ASC
      `;
      return rows.map(normalizeMilestoneRow);
    }
    case 'evidence': {
      const rows = await sql`
        SELECT *
        FROM ari_xpand_evidence
        WHERE xpand_id = ${resolvedId} AND (${includePrivate}::boolean OR visibility = 'public')
        ORDER BY COALESCE(evidence_date, created_at::date) DESC, id DESC
      `;
      return rows.map(normalizeEvidenceRow);
    }
    case 'resources': {
      const rows = await sql`
        SELECT *
        FROM ari_xpand_resources
        WHERE xpand_id = ${resolvedId} AND (${includePrivate}::boolean OR visibility = 'public')
        ORDER BY updated_at DESC, id DESC
      `;
      return rows.map(normalizeResourceRow);
    }
    case 'experiments': {
      const rows = await sql`
        SELECT *
        FROM ari_xpand_experiments
        WHERE xpand_id = ${resolvedId} AND (${includePrivate}::boolean OR visibility = 'public')
        ORDER BY updated_at DESC, id DESC
      `;
      return rows.map(normalizeExperimentRow);
    }
    case 'sections': {
      const rows = await sql`
        SELECT *
        FROM ari_xpand_sections
        WHERE xpand_id = ${resolvedId}
        ORDER BY sort_order ASC, id ASC
      `;
      return rows.map(normalizeSectionRow);
    }
    default:
      return [];
  }
}

async function listXpandLogMonths(xpandId, includePrivate = false) {
  await ensureSchema();
  const resolvedId = Number(xpandId);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return [];
  const rows = await sql`
    SELECT
      TO_CHAR(log_date, 'YYYY-MM') AS "monthKey",
      COUNT(*)::int AS "entryCount"
    FROM ari_xpand_logs
    WHERE xpand_id = ${resolvedId}
      AND (${includePrivate}::boolean OR visibility = 'public')
    GROUP BY 1
    ORDER BY 1 DESC
  `;
  return rows
    .map((row) => ({
      monthKey: normalizeMonthKey(row?.monthKey),
      entryCount: Number(row?.entryCount) || 0,
    }))
    .filter((row) => row.monthKey);
}

async function listXpandLogsByMonth(xpandId, monthKey, includePrivate = false) {
  await ensureSchema();
  const resolvedId = Number(xpandId);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return [];
  const bounds = getMonthBounds(monthKey);
  if (!bounds) return [];
  const rows = await sql`
    SELECT *
    FROM ari_xpand_logs
    WHERE xpand_id = ${resolvedId}
      AND (${includePrivate}::boolean OR visibility = 'public')
      AND log_date >= ${bounds.startDate}
      AND log_date < ${bounds.endDateExclusive}
    ORDER BY log_date DESC, updated_at DESC, id DESC
  `;
  return rows.map(normalizeLogRow);
}

async function resolveUniqueSlug(baseSlug, excludeId = null) {
  const base = normalizeSlugBase(baseSlug);
  if (!sql) return base;
  await ensureSchema();
  const pattern = `${base}%`;
  const rows = excludeId
    ? await sql`
      SELECT slug
      FROM ari_xpands
      WHERE (slug = ${base} OR slug LIKE ${pattern}) AND id <> ${Number(excludeId)}
      ORDER BY slug ASC
    `
    : await sql`
      SELECT slug
      FROM ari_xpands
      WHERE slug = ${base} OR slug LIKE ${pattern}
      ORDER BY slug ASC
    `;
  return resolveDuplicateSlug(base, rows.map((row) => row.slug));
}

async function ensureXpandExists(id) {
  const xpand = await getXpandById(id, { includePrivate: true, includeChildren: false });
  if (!xpand) throw new Error('Xpand not found.');
  return xpand;
}

export async function listXpands({ includePrivate = false, status = '', visibility = '' } = {}) {
  if (!sql) return [];
  await ensureSchema();
  const normalizedStatus = cleanText(status).toLowerCase();
  const normalizedVisibility = cleanText(visibility).toLowerCase();
  const rows = await sql`
    SELECT *
    FROM ari_xpands
    WHERE (${includePrivate}::boolean OR visibility = 'public')
      AND (${normalizedStatus} = '' OR status = ${normalizedStatus})
      AND (${normalizedVisibility} = '' OR visibility = ${normalizedVisibility})
    ORDER BY
      CASE status
        WHEN 'active' THEN 0
        WHEN 'planned' THEN 1
        WHEN 'paused' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'abandoned' THEN 4
        WHEN 'archived' THEN 5
        ELSE 6
      END ASC,
      updated_at DESC,
      id DESC
  `;
  const xpands = rows.map(normalizeXpandRow);
  const aggregateMaps = await getXpandAggregateMaps(includePrivate);
  return xpands.map((xpand) => attachSummary(xpand, aggregateMaps));
}

export async function getXpandById(id, { includePrivate = false, includeChildren = true } = {}) {
  if (!sql) return null;
  await ensureSchema();
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return null;
  const rows = await sql`
    SELECT *
    FROM ari_xpands
    WHERE id = ${resolvedId} AND (${includePrivate}::boolean OR visibility = 'public')
    LIMIT 1
  `;
  if (!rows[0]) return null;

  const aggregateMaps = await getXpandAggregateMaps(includePrivate);
  const xpand = attachSummary(normalizeXpandRow(rows[0]), aggregateMaps);
  if (!includeChildren) return xpand;

  const [logs, notes, milestones, evidence, resources, experiments, sections] = await Promise.all([
    listEntityRows('logs', xpand.id, includePrivate),
    listEntityRows('notes', xpand.id, includePrivate),
    listEntityRows('milestones', xpand.id, includePrivate),
    listEntityRows('evidence', xpand.id, includePrivate),
    listEntityRows('resources', xpand.id, includePrivate),
    listEntityRows('experiments', xpand.id, includePrivate),
    listEntityRows('sections', xpand.id, includePrivate),
  ]);

  return {
    ...xpand,
    logs,
    notes,
    milestones,
    evidence,
    resources,
    experiments,
    sections,
    timeline: buildXpandTimeline({
      ...xpand,
      logs,
      notes,
      milestones,
      evidence,
      resources,
      experiments,
    }),
  };
}

export async function getXpandBySlug(slug, { includePrivate = false, includeChildren = true } = {}) {
  if (!sql) return null;
  await ensureSchema();
  const resolvedSlug = normalizeSlugBase(slug);
  const rows = await sql`
    SELECT id
    FROM ari_xpands
    WHERE slug = ${resolvedSlug} AND (${includePrivate}::boolean OR visibility = 'public')
    LIMIT 1
  `;
  if (!rows[0]?.id) return null;
  return getXpandById(rows[0].id, { includePrivate, includeChildren });
}

export async function getXpandPublicPageData(slug, { month = '' } = {}) {
  const xpand = await getXpandBySlug(slug, { includePrivate: false, includeChildren: false });
  if (!xpand) return null;

  const availableMonths = await listXpandLogMonths(xpand.id, false);
  const selectedMonth = resolveRequestedMonth(month, availableMonths);
  const logs = selectedMonth ? await listXpandLogsByMonth(xpand.id, selectedMonth, false) : [];

  return {
    ...xpand,
    logs,
    availableMonths,
    selectedMonth,
    selectedMonthEntryCount: availableMonths.find((entry) => entry.monthKey === selectedMonth)?.entryCount || logs.length,
  };
}

export async function createXpand(input = {}) {
  if (!sql) return null;
  await ensureSchema();
  const title = normalizeOptionalText(input.title, 180);
  if (!title) throw new Error('Title is required.');
  const slug = await resolveUniqueSlug(input.slug || title);
  const status = normalizeStatus(input.status || 'active');
  const visibility = normalizeVisibility(input.visibility, 'public');
  const rows = await sql`
    INSERT INTO ari_xpands (
      title, slug, subtitle, description, status, visibility, cover_image, start_date, end_date, tags, created_at, updated_at, archived_at
    )
    VALUES (
      ${title},
      ${slug},
      ${normalizeOptionalText(input.subtitle, 240)},
      ${typeof input.description === 'string' ? input.description : ''},
      ${status},
      ${visibility},
      ${normalizeNullableUrl(input.coverImage || input.cover_image)},
      ${normalizeDateOnly(input.startDate || input.start_date)},
      ${normalizeDateOnly(input.endDate || input.end_date)},
      ${JSON.stringify(normalizeStringArray(input.tags))}::jsonb,
      NOW(),
      NOW(),
      ${status === 'archived' ? new Date().toISOString() : null}
    )
    RETURNING *
  `;
  return rows[0] ? normalizeXpandRow(rows[0]) : null;
}

export async function updateXpand(id, input = {}) {
  if (!sql) return null;
  await ensureSchema();
  const existing = await getXpandById(id, { includePrivate: true, includeChildren: false });
  if (!existing) return null;
  const title = normalizeOptionalText(input.title ?? existing.title, 180);
  if (!title) throw new Error('Title is required.');
  const requestedSlug = Object.prototype.hasOwnProperty.call(input, 'slug')
    ? normalizeSlugBase(input.slug || title)
    : existing.slug;
  const slug = await resolveUniqueSlug(requestedSlug || title, existing.id);
  const status = normalizeStatus(input.status ?? existing.status);
  const visibility = normalizeVisibility(input.visibility ?? existing.visibility, existing.visibility);
  const rows = await sql`
    UPDATE ari_xpands
    SET
      title = ${title},
      slug = ${slug},
      subtitle = ${normalizeOptionalText(input.subtitle ?? existing.subtitle, 240)},
      description = ${typeof (input.description ?? existing.description) === 'string' ? input.description ?? existing.description : ''},
      status = ${status},
      visibility = ${visibility},
      cover_image = ${normalizeNullableUrl(input.coverImage ?? input.cover_image ?? existing.coverImage)},
      start_date = ${normalizeDateOnly(input.startDate ?? input.start_date ?? existing.startDate)},
      end_date = ${normalizeDateOnly(input.endDate ?? input.end_date ?? existing.endDate)},
      tags = ${JSON.stringify(normalizeStringArray(input.tags ?? existing.tags))}::jsonb,
      archived_at = ${status === 'archived' ? existing.archivedAt || new Date().toISOString() : null},
      updated_at = NOW()
    WHERE id = ${existing.id}
    RETURNING *
  `;
  return rows[0] ? normalizeXpandRow(rows[0]) : null;
}

export async function archiveXpand(id) {
  return updateXpand(id, { status: 'archived' });
}

export async function deleteXpand(id) {
  if (!sql) return false;
  await ensureSchema();
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return false;
  await sql`DELETE FROM ari_xpands WHERE id = ${resolvedId}`;
  return true;
}

export async function upsertXpandLog(input = {}) {
  if (!sql) return null;
  await ensureSchema();
  const xpandId = Number(input.xpandId);
  const logId = Number(input.id);
  if (!Number.isInteger(xpandId) || xpandId <= 0) throw new Error('Valid xpandId is required.');
  await ensureXpandExists(xpandId);
  const date = normalizeDateOnly(input.date) || formatDateKeyInZone();
  if (Number.isInteger(logId) && logId > 0) {
    const existingRows = await sql`
      SELECT id, xpand_id AS "xpandId", log_date AS "date"
      FROM ari_xpand_logs
      WHERE id = ${logId} AND xpand_id = ${xpandId}
      LIMIT 1
    `;
    if (!existingRows[0]) {
      throw new Error('Daily note not found.');
    }
    const conflictingRows = await sql`
      SELECT id
      FROM ari_xpand_logs
      WHERE xpand_id = ${xpandId} AND log_date = ${date} AND id <> ${logId}
      LIMIT 1
    `;
    if (conflictingRows[0]) {
      throw new Error('A daily note already exists for that date.');
    }
    const updatedRows = await sql`
      UPDATE ari_xpand_logs
      SET
        log_date = ${date},
        title = ${normalizeOptionalText(input.title, 180)},
        summary = ${normalizeOptionalText(input.summary, 500)},
        done_items = ${JSON.stringify(normalizeStringArray(input.done))}::jsonb,
        learned_items = ${JSON.stringify(normalizeStringArray(input.learned))}::jsonb,
        failed_items = ${JSON.stringify(normalizeStringArray(input.failed))}::jsonb,
        question_items = ${JSON.stringify(normalizeStringArray(input.questions))}::jsonb,
        blocker_items = ${JSON.stringify(normalizeStringArray(input.blockers))}::jsonb,
        next_items = ${JSON.stringify(normalizeStringArray(input.next))}::jsonb,
        note_markdown = ${typeof input.freeformNote === 'string' ? input.freeformNote : ''},
        time_spent_minutes = ${Math.max(0, Number(input.timeSpentMinutes) || 0)},
        visibility = ${normalizeVisibility(input.visibility, 'public')},
        updated_at = NOW()
      WHERE id = ${logId} AND xpand_id = ${xpandId}
      RETURNING *
    `;
    await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${xpandId}`;
    return updatedRows[0] ? normalizeLogRow(updatedRows[0]) : null;
  }
  const rows = await sql`
    INSERT INTO ari_xpand_logs (
      xpand_id, log_date, title, summary, done_items, learned_items, failed_items, question_items,
      blocker_items, next_items, note_markdown, time_spent_minutes, visibility, created_at, updated_at
    )
    VALUES (
      ${xpandId},
      ${date},
      ${normalizeOptionalText(input.title, 180)},
      ${normalizeOptionalText(input.summary, 500)},
      ${JSON.stringify(normalizeStringArray(input.done))}::jsonb,
      ${JSON.stringify(normalizeStringArray(input.learned))}::jsonb,
      ${JSON.stringify(normalizeStringArray(input.failed))}::jsonb,
      ${JSON.stringify(normalizeStringArray(input.questions))}::jsonb,
      ${JSON.stringify(normalizeStringArray(input.blockers))}::jsonb,
      ${JSON.stringify(normalizeStringArray(input.next))}::jsonb,
      ${typeof input.freeformNote === 'string' ? input.freeformNote : ''},
      ${Math.max(0, Number(input.timeSpentMinutes) || 0)},
      ${normalizeVisibility(input.visibility, 'public')},
      NOW(),
      NOW()
    )
    ON CONFLICT (xpand_id, log_date)
    DO UPDATE SET
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      done_items = EXCLUDED.done_items,
      learned_items = EXCLUDED.learned_items,
      failed_items = EXCLUDED.failed_items,
      question_items = EXCLUDED.question_items,
      blocker_items = EXCLUDED.blocker_items,
      next_items = EXCLUDED.next_items,
      note_markdown = EXCLUDED.note_markdown,
      time_spent_minutes = EXCLUDED.time_spent_minutes,
      visibility = EXCLUDED.visibility,
      updated_at = NOW()
    RETURNING *
  `;
  await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${xpandId}`;
  return rows[0] ? normalizeLogRow(rows[0]) : null;
}

export async function deleteXpandLog(id, xpandId = null) {
  if (!sql) return false;
  await ensureSchema();
  const resolvedId = Number(id);
  const resolvedXpandId = Number(xpandId);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return false;

  if (Number.isInteger(resolvedXpandId) && resolvedXpandId > 0) {
    await sql`DELETE FROM ari_xpand_logs WHERE id = ${resolvedId} AND xpand_id = ${resolvedXpandId}`;
    await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${resolvedXpandId}`;
    return true;
  }

  const rows = await sql`SELECT xpand_id AS "xpandId" FROM ari_xpand_logs WHERE id = ${resolvedId} LIMIT 1`;
  await sql`DELETE FROM ari_xpand_logs WHERE id = ${resolvedId}`;
  const ownerXpandId = Number(rows[0]?.xpandId);
  if (Number.isInteger(ownerXpandId) && ownerXpandId > 0) {
    await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${ownerXpandId}`;
  }
  return true;
}

export async function createXpandEntity(entityType, input = {}) {
  if (!sql) return null;
  await ensureSchema();
  const xpandId = Number(input.xpandId);
  if (!Number.isInteger(xpandId) || xpandId <= 0) throw new Error('Valid xpandId is required.');
  await ensureXpandExists(xpandId);

  switch (entityType) {
    case 'note': {
      const content = typeof input.content === 'string' ? input.content.trim() : '';
      if (!content) throw new Error('Note content is required.');
      const kind = normalizeNoteKind(input.kind);
      const rows = await sql`
        INSERT INTO ari_xpand_notes (
          xpand_id, title, content, kind, status, visibility, linked_entity_type, linked_entity_id, created_at, updated_at
        )
        VALUES (
          ${xpandId},
          ${normalizeOptionalText(input.title, 180)},
          ${content},
          ${kind},
          ${kind === 'question' ? normalizeQuestionStatus(input.status) : normalizeOptionalText(input.status, 40)},
          ${normalizeVisibility(input.visibility, 'public')},
          ${normalizeOptionalText(input.linkedEntityType, 40)},
          ${Number(input.linkedEntityId) || null},
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${xpandId}`;
      return rows[0] ? normalizeNoteRow(rows[0]) : null;
    }
    case 'milestone': {
      const title = normalizeOptionalText(input.title, 180);
      if (!title) throw new Error('Milestone title is required.');
      const status = normalizeMilestoneStatus(input.status);
      const rows = await sql`
        INSERT INTO ari_xpand_milestones (
          xpand_id, title, description, status, sort_order, target_date, completed_at, visibility, created_at, updated_at
        )
        VALUES (
          ${xpandId},
          ${title},
          ${typeof input.description === 'string' ? input.description : ''},
          ${status},
          ${Number(input.order) || 0},
          ${normalizeDateOnly(input.targetDate || input.target_date)},
          ${status === 'completed' ? new Date().toISOString() : null},
          ${normalizeVisibility(input.visibility, 'public')},
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${xpandId}`;
      return rows[0] ? normalizeMilestoneRow(rows[0]) : null;
    }
    case 'evidence': {
      const title = normalizeOptionalText(input.title, 180);
      if (!title) throw new Error('Evidence title is required.');
      const rows = await sql`
        INSERT INTO ari_xpand_evidence (
          xpand_id, title, description, evidence_type, url, evidence_date, metadata_json, visibility, created_at
        )
        VALUES (
          ${xpandId},
          ${title},
          ${typeof input.description === 'string' ? input.description : ''},
          ${normalizeEvidenceType(input.type)},
          ${normalizeNullableUrl(input.url)},
          ${normalizeDateOnly(input.date) || formatDateKeyInZone()},
          ${JSON.stringify(normalizeJsonObject(input.metadata))}::jsonb,
          ${normalizeVisibility(input.visibility, 'public')},
          NOW()
        )
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${xpandId}`;
      return rows[0] ? normalizeEvidenceRow(rows[0]) : null;
    }
    case 'resource': {
      const title = normalizeOptionalText(input.title, 180);
      if (!title) throw new Error('Resource title is required.');
      const rows = await sql`
        INSERT INTO ari_xpand_resources (
          xpand_id, title, resource_type, url, author, notes, status, visibility, created_at, updated_at
        )
        VALUES (
          ${xpandId},
          ${title},
          ${normalizeResourceType(input.type)},
          ${normalizeNullableUrl(input.url)},
          ${normalizeOptionalText(input.author, 180)},
          ${typeof input.notes === 'string' ? input.notes : ''},
          ${normalizeResourceStatus(input.status)},
          ${normalizeVisibility(input.visibility, 'public')},
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${xpandId}`;
      return rows[0] ? normalizeResourceRow(rows[0]) : null;
    }
    case 'experiment': {
      const title = normalizeOptionalText(input.title, 180);
      if (!title) throw new Error('Experiment title is required.');
      const status = normalizeExperimentStatus(input.status);
      const rows = await sql`
        INSERT INTO ari_xpand_experiments (
          xpand_id, experiment_code, title, question, hypothesis, method, baseline, dataset, config,
          hardware, metrics, result, failure_analysis, interpretation, next_experiment, status,
          started_at, completed_at, visibility, created_at, updated_at
        )
        VALUES (
          ${xpandId},
          ${normalizeOptionalText(input.experimentId, 80)},
          ${title},
          ${typeof input.question === 'string' ? input.question : ''},
          ${typeof input.hypothesis === 'string' ? input.hypothesis : ''},
          ${typeof input.method === 'string' ? input.method : ''},
          ${typeof input.baseline === 'string' ? input.baseline : ''},
          ${typeof input.dataset === 'string' ? input.dataset : ''},
          ${typeof input.config === 'string' ? input.config : ''},
          ${typeof input.hardware === 'string' ? input.hardware : ''},
          ${typeof input.metrics === 'string' ? input.metrics : ''},
          ${typeof input.result === 'string' ? input.result : ''},
          ${typeof input.failureAnalysis === 'string' ? input.failureAnalysis : ''},
          ${typeof input.interpretation === 'string' ? input.interpretation : ''},
          ${typeof input.nextExperiment === 'string' ? input.nextExperiment : ''},
          ${status},
          ${input.startedAt ? serializeDateValue(input.startedAt) : null},
          ${status === 'completed' || status === 'failed' ? serializeDateValue(input.completedAt) || new Date().toISOString() : null},
          ${normalizeVisibility(input.visibility, 'public')},
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${xpandId}`;
      return rows[0] ? normalizeExperimentRow(rows[0]) : null;
    }
    case 'section': {
      const title = normalizeOptionalText(input.title, 180);
      if (!title) throw new Error('Section title is required.');
      const rows = await sql`
        INSERT INTO ari_xpand_sections (
          xpand_id, parent_section_id, title, description, sort_order, status, start_date, end_date, metadata_json, created_at, updated_at
        )
        VALUES (
          ${xpandId},
          ${Number(input.parentSectionId) || null},
          ${title},
          ${typeof input.description === 'string' ? input.description : ''},
          ${Number(input.order) || 0},
          ${normalizeSectionStatus(input.status)},
          ${normalizeDateOnly(input.startDate || input.start_date)},
          ${normalizeDateOnly(input.endDate || input.end_date)},
          ${JSON.stringify(normalizeJsonObject(input.metadata))}::jsonb,
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${xpandId}`;
      return rows[0] ? normalizeSectionRow(rows[0]) : null;
    }
    default:
      throw new Error('Unsupported entity type.');
  }
}

export async function updateXpandEntity(entityType, id, input = {}) {
  if (!sql) return null;
  await ensureSchema();
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) throw new Error('Invalid entity id.');

  switch (entityType) {
    case 'note': {
      const existingRows = await sql`SELECT * FROM ari_xpand_notes WHERE id = ${resolvedId} LIMIT 1`;
      if (!existingRows[0]) return null;
      const existing = normalizeNoteRow(existingRows[0]);
      const content = typeof input.content === 'string' ? input.content.trim() : existing.content;
      if (!content) throw new Error('Note content is required.');
      const kind = normalizeNoteKind(input.kind ?? existing.kind);
      const rows = await sql`
        UPDATE ari_xpand_notes
        SET
          title = ${normalizeOptionalText(input.title ?? existing.title, 180)},
          content = ${content},
          kind = ${kind},
          status = ${kind === 'question' ? normalizeQuestionStatus(input.status ?? existing.status) : normalizeOptionalText(input.status ?? existing.status, 40)},
          visibility = ${normalizeVisibility(input.visibility ?? existing.visibility, existing.visibility)},
          linked_entity_type = ${normalizeOptionalText(input.linkedEntityType ?? existing.linkedEntityType, 40)},
          linked_entity_id = ${Number(input.linkedEntityId ?? existing.linkedEntityId) || null},
          updated_at = NOW()
        WHERE id = ${resolvedId}
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${existing.xpandId}`;
      return rows[0] ? normalizeNoteRow(rows[0]) : null;
    }
    case 'milestone': {
      const existingRows = await sql`SELECT * FROM ari_xpand_milestones WHERE id = ${resolvedId} LIMIT 1`;
      if (!existingRows[0]) return null;
      const existing = normalizeMilestoneRow(existingRows[0]);
      const status = normalizeMilestoneStatus(input.status ?? existing.status);
      const rows = await sql`
        UPDATE ari_xpand_milestones
        SET
          title = ${normalizeOptionalText(input.title ?? existing.title, 180)},
          description = ${typeof (input.description ?? existing.description) === 'string' ? input.description ?? existing.description : ''},
          status = ${status},
          sort_order = ${Number(input.order ?? existing.order) || 0},
          target_date = ${normalizeDateOnly(input.targetDate ?? input.target_date ?? existing.targetDate)},
          completed_at = ${status === 'completed' ? serializeDateValue(input.completedAt ?? existing.completedAt) || new Date().toISOString() : null},
          visibility = ${normalizeVisibility(input.visibility ?? existing.visibility, existing.visibility)},
          updated_at = NOW()
        WHERE id = ${resolvedId}
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${existing.xpandId}`;
      return rows[0] ? normalizeMilestoneRow(rows[0]) : null;
    }
    case 'evidence': {
      const existingRows = await sql`SELECT * FROM ari_xpand_evidence WHERE id = ${resolvedId} LIMIT 1`;
      if (!existingRows[0]) return null;
      const existing = normalizeEvidenceRow(existingRows[0]);
      const title = normalizeOptionalText(input.title ?? existing.title, 180);
      if (!title) throw new Error('Evidence title is required.');
      const rows = await sql`
        UPDATE ari_xpand_evidence
        SET
          title = ${title},
          description = ${typeof (input.description ?? existing.description) === 'string' ? input.description ?? existing.description : ''},
          evidence_type = ${normalizeEvidenceType(input.type ?? existing.type)},
          url = ${normalizeNullableUrl(input.url ?? existing.url)},
          evidence_date = ${normalizeDateOnly(input.date ?? existing.date)},
          metadata_json = ${JSON.stringify(normalizeJsonObject(input.metadata ?? existing.metadata))}::jsonb,
          visibility = ${normalizeVisibility(input.visibility ?? existing.visibility, existing.visibility)}
        WHERE id = ${resolvedId}
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${existing.xpandId}`;
      return rows[0] ? normalizeEvidenceRow(rows[0]) : null;
    }
    case 'resource': {
      const existingRows = await sql`SELECT * FROM ari_xpand_resources WHERE id = ${resolvedId} LIMIT 1`;
      if (!existingRows[0]) return null;
      const existing = normalizeResourceRow(existingRows[0]);
      const title = normalizeOptionalText(input.title ?? existing.title, 180);
      if (!title) throw new Error('Resource title is required.');
      const rows = await sql`
        UPDATE ari_xpand_resources
        SET
          title = ${title},
          resource_type = ${normalizeResourceType(input.type ?? existing.type)},
          url = ${normalizeNullableUrl(input.url ?? existing.url)},
          author = ${normalizeOptionalText(input.author ?? existing.author, 180)},
          notes = ${typeof (input.notes ?? existing.notes) === 'string' ? input.notes ?? existing.notes : ''},
          status = ${normalizeResourceStatus(input.status ?? existing.status)},
          visibility = ${normalizeVisibility(input.visibility ?? existing.visibility, existing.visibility)},
          updated_at = NOW()
        WHERE id = ${resolvedId}
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${existing.xpandId}`;
      return rows[0] ? normalizeResourceRow(rows[0]) : null;
    }
    case 'experiment': {
      const existingRows = await sql`SELECT * FROM ari_xpand_experiments WHERE id = ${resolvedId} LIMIT 1`;
      if (!existingRows[0]) return null;
      const existing = normalizeExperimentRow(existingRows[0]);
      const title = normalizeOptionalText(input.title ?? existing.title, 180);
      if (!title) throw new Error('Experiment title is required.');
      const status = normalizeExperimentStatus(input.status ?? existing.status);
      const rows = await sql`
        UPDATE ari_xpand_experiments
        SET
          experiment_code = ${normalizeOptionalText(input.experimentId ?? existing.experimentId, 80)},
          title = ${title},
          question = ${typeof (input.question ?? existing.question) === 'string' ? input.question ?? existing.question : ''},
          hypothesis = ${typeof (input.hypothesis ?? existing.hypothesis) === 'string' ? input.hypothesis ?? existing.hypothesis : ''},
          method = ${typeof (input.method ?? existing.method) === 'string' ? input.method ?? existing.method : ''},
          baseline = ${typeof (input.baseline ?? existing.baseline) === 'string' ? input.baseline ?? existing.baseline : ''},
          dataset = ${typeof (input.dataset ?? existing.dataset) === 'string' ? input.dataset ?? existing.dataset : ''},
          config = ${typeof (input.config ?? existing.config) === 'string' ? input.config ?? existing.config : ''},
          hardware = ${typeof (input.hardware ?? existing.hardware) === 'string' ? input.hardware ?? existing.hardware : ''},
          metrics = ${typeof (input.metrics ?? existing.metrics) === 'string' ? input.metrics ?? existing.metrics : ''},
          result = ${typeof (input.result ?? existing.result) === 'string' ? input.result ?? existing.result : ''},
          failure_analysis = ${typeof (input.failureAnalysis ?? existing.failureAnalysis) === 'string' ? input.failureAnalysis ?? existing.failureAnalysis : ''},
          interpretation = ${typeof (input.interpretation ?? existing.interpretation) === 'string' ? input.interpretation ?? existing.interpretation : ''},
          next_experiment = ${typeof (input.nextExperiment ?? existing.nextExperiment) === 'string' ? input.nextExperiment ?? existing.nextExperiment : ''},
          status = ${status},
          started_at = ${input.startedAt ? serializeDateValue(input.startedAt) : existing.startedAt},
          completed_at = ${status === 'completed' || status === 'failed' ? serializeDateValue(input.completedAt ?? existing.completedAt) || new Date().toISOString() : null},
          visibility = ${normalizeVisibility(input.visibility ?? existing.visibility, existing.visibility)},
          updated_at = NOW()
        WHERE id = ${resolvedId}
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${existing.xpandId}`;
      return rows[0] ? normalizeExperimentRow(rows[0]) : null;
    }
    case 'section': {
      const existingRows = await sql`SELECT * FROM ari_xpand_sections WHERE id = ${resolvedId} LIMIT 1`;
      if (!existingRows[0]) return null;
      const existing = normalizeSectionRow(existingRows[0]);
      const title = normalizeOptionalText(input.title ?? existing.title, 180);
      if (!title) throw new Error('Section title is required.');
      const rows = await sql`
        UPDATE ari_xpand_sections
        SET
          parent_section_id = ${Number(input.parentSectionId ?? existing.parentSectionId) || null},
          title = ${title},
          description = ${typeof (input.description ?? existing.description) === 'string' ? input.description ?? existing.description : ''},
          sort_order = ${Number(input.order ?? existing.order) || 0},
          status = ${normalizeSectionStatus(input.status ?? existing.status)},
          start_date = ${normalizeDateOnly(input.startDate ?? input.start_date ?? existing.startDate)},
          end_date = ${normalizeDateOnly(input.endDate ?? input.end_date ?? existing.endDate)},
          metadata_json = ${JSON.stringify(normalizeJsonObject(input.metadata ?? existing.metadata))}::jsonb,
          updated_at = NOW()
        WHERE id = ${resolvedId}
        RETURNING *
      `;
      await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${existing.xpandId}`;
      return rows[0] ? normalizeSectionRow(rows[0]) : null;
    }
    default:
      throw new Error('Unsupported entity type.');
  }
}

export async function deleteXpandEntity(entityType, id) {
  if (!sql) return false;
  await ensureSchema();
  const resolvedId = Number(id);
  if (!Number.isInteger(resolvedId) || resolvedId <= 0) return false;

  let ownerXpandId = null;
  switch (entityType) {
    case 'note': {
      const rows = await sql`SELECT xpand_id AS "xpandId" FROM ari_xpand_notes WHERE id = ${resolvedId} LIMIT 1`;
      ownerXpandId = Number(rows[0]?.xpandId) || null;
      await sql`DELETE FROM ari_xpand_notes WHERE id = ${resolvedId}`;
      break;
    }
    case 'milestone': {
      const rows = await sql`SELECT xpand_id AS "xpandId" FROM ari_xpand_milestones WHERE id = ${resolvedId} LIMIT 1`;
      ownerXpandId = Number(rows[0]?.xpandId) || null;
      await sql`DELETE FROM ari_xpand_milestones WHERE id = ${resolvedId}`;
      break;
    }
    case 'evidence': {
      const rows = await sql`SELECT xpand_id AS "xpandId" FROM ari_xpand_evidence WHERE id = ${resolvedId} LIMIT 1`;
      ownerXpandId = Number(rows[0]?.xpandId) || null;
      await sql`DELETE FROM ari_xpand_evidence WHERE id = ${resolvedId}`;
      break;
    }
    case 'resource': {
      const rows = await sql`SELECT xpand_id AS "xpandId" FROM ari_xpand_resources WHERE id = ${resolvedId} LIMIT 1`;
      ownerXpandId = Number(rows[0]?.xpandId) || null;
      await sql`DELETE FROM ari_xpand_resources WHERE id = ${resolvedId}`;
      break;
    }
    case 'experiment': {
      const rows = await sql`SELECT xpand_id AS "xpandId" FROM ari_xpand_experiments WHERE id = ${resolvedId} LIMIT 1`;
      ownerXpandId = Number(rows[0]?.xpandId) || null;
      await sql`DELETE FROM ari_xpand_experiments WHERE id = ${resolvedId}`;
      break;
    }
    case 'section': {
      const rows = await sql`SELECT xpand_id AS "xpandId" FROM ari_xpand_sections WHERE id = ${resolvedId} LIMIT 1`;
      ownerXpandId = Number(rows[0]?.xpandId) || null;
      await sql`DELETE FROM ari_xpand_sections WHERE id = ${resolvedId}`;
      break;
    }
    default:
      throw new Error('Unsupported entity type.');
  }

  if (Number.isInteger(ownerXpandId) && ownerXpandId > 0) {
    await sql`UPDATE ari_xpands SET updated_at = NOW() WHERE id = ${ownerXpandId}`;
  }
  return true;
}

export async function applyQuickLog({ xpandId, input, visibility = 'public' }) {
  if (!sql) return { ok: false, errors: ['DATABASE_URL is required.'] };
  const resolvedXpandId = Number(xpandId);
  if (!Number.isInteger(resolvedXpandId) || resolvedXpandId <= 0) {
    return { ok: false, errors: ['Valid xpandId is required.'] };
  }

  await ensureXpandExists(resolvedXpandId);
  const parsed = parseQuickLogInput(input);
  if (!parsed.ok) return parsed;

  await ensureSchema();
  const today = formatDateKeyInZone();
  const existingRows = await sql`
    SELECT *
    FROM ari_xpand_logs
    WHERE xpand_id = ${resolvedXpandId} AND log_date = ${today}
    LIMIT 1
  `;
  const existing = existingRows[0] ? normalizeLogRow(existingRows[0]) : null;

  const nextLog = {
    xpandId: resolvedXpandId,
    date: today,
    title: existing?.title || '',
    summary: existing?.summary || '',
    done: [...(existing?.done || [])],
    learned: [...(existing?.learned || [])],
    failed: [...(existing?.failed || [])],
    questions: [...(existing?.questions || [])],
    blockers: [...(existing?.blockers || [])],
    next: [...(existing?.next || [])],
    freeformNote: existing?.freeformNote || '',
    timeSpentMinutes: existing?.timeSpentMinutes || 0,
    visibility: normalizeVisibility(visibility, existing?.visibility || 'public'),
  };

  for (const command of parsed.commands) {
    switch (command.command) {
      case 'done':
        nextLog.done.push(command.value);
        break;
      case 'learned':
        nextLog.learned.push(command.value);
        break;
      case 'failed':
        nextLog.failed.push(command.value);
        break;
      case 'question':
        nextLog.questions.push(command.value);
        await createXpandEntity('note', {
          xpandId: resolvedXpandId,
          kind: 'question',
          content: command.value,
          status: 'open',
          visibility,
        });
        break;
      case 'idea':
      case 'insight':
        await createXpandEntity('note', {
          xpandId: resolvedXpandId,
          kind: command.command,
          content: command.value,
          visibility,
        });
        break;
      case 'blocker':
        nextLog.blockers.push(command.value);
        break;
      case 'next':
        nextLog.next.push(command.value);
        break;
      case 'read':
        await createXpandEntity('resource', {
          xpandId: resolvedXpandId,
          title: command.value,
          url: isAbsoluteHttpUrl(command.value) ? command.value : '',
          type: isAbsoluteHttpUrl(command.value) ? 'article' : 'other',
          status: 'queued',
          visibility,
        });
        break;
      case 'evidence':
        await createXpandEntity('evidence', {
          xpandId: resolvedXpandId,
          title: command.value,
          url: isAbsoluteHttpUrl(command.value) ? command.value : '',
          type: 'other',
          date: today,
          visibility,
        });
        break;
      case 'time':
        nextLog.timeSpentMinutes += command.minutes || 0;
        break;
      case 'note':
        nextLog.freeformNote = nextLog.freeformNote
          ? `${nextLog.freeformNote}\n\n${command.value}`
          : command.value;
        break;
      default:
        break;
    }
  }

  const log = await upsertXpandLog(nextLog);
  return {
    ok: true,
    commands: parsed.commands,
    log,
  };
}

export function buildXpandTimeline(xpand = {}) {
  const events = [];

  if (xpand.createdAt) {
    events.push({
      id: `xpand-created-${xpand.id}`,
      date: xpand.createdAt,
      kind: 'xpand',
      label: 'Created Xpand',
      title: xpand.title,
      body: xpand.description || '',
    });
  }

  for (const log of xpand.logs || []) {
    if (!log?.date) continue;
    events.push({
      id: `log-${log.id}`,
      date: `${log.date}T00:00:00.000Z`,
      kind: 'log',
      label: 'Log',
      title: log.title || 'Daily log',
      body: log.summary || log.learned[0] || log.done[0] || log.questions[0] || '',
      payload: log,
    });
  }

  for (const note of xpand.notes || []) {
    const eventDate = note?.updatedAt || note?.createdAt;
    if (!eventDate) continue;
    events.push({
      id: `note-${note.id}`,
      date: eventDate,
      kind: note.kind,
      label: note.kind === 'question' ? 'Question' : 'Note',
      title: note.title || note.content.slice(0, 96),
      body: note.content,
      payload: note,
    });
  }

  for (const milestone of xpand.milestones || []) {
    if (milestone?.status !== 'completed') continue;
    events.push({
      id: `milestone-${milestone.id}`,
      date: milestone.completedAt || milestone.updatedAt || milestone.createdAt,
      kind: 'milestone',
      label: 'Milestone',
      title: milestone.title,
      body: milestone.description,
      payload: milestone,
    });
  }

  for (const evidence of xpand.evidence || []) {
    events.push({
      id: `evidence-${evidence.id}`,
      date: evidence.date || evidence.createdAt,
      kind: 'evidence',
      label: 'Evidence',
      title: evidence.title,
      body: evidence.description,
      payload: evidence,
    });
  }

  for (const experiment of xpand.experiments || []) {
    events.push({
      id: `experiment-${experiment.id}`,
      date: experiment.completedAt || experiment.startedAt || experiment.updatedAt || experiment.createdAt,
      kind: 'experiment',
      label: 'Experiment',
      title: experiment.title,
      body: experiment.result || experiment.question || experiment.failureAnalysis || '',
      payload: experiment,
    });
  }

  for (const resource of xpand.resources || []) {
    if (resource?.status !== 'completed') continue;
    events.push({
      id: `resource-${resource.id}`,
      date: resource.updatedAt || resource.createdAt,
      kind: 'resource',
      label: 'Resource completed',
      title: resource.title,
      body: resource.notes,
      payload: resource,
    });
  }

  return events
    .filter((event) => event.date)
    .sort((left, right) => {
      const leftTime = new Date(left.date).getTime() || 0;
      const rightTime = new Date(right.date).getTime() || 0;
      return rightTime - leftTime;
    });
}

export async function getXpandsGlobalStats() {
  const xpands = await listXpands({ includePrivate: false });
  return xpands.reduce(
    (acc, xpand) => {
      acc.activeXpands += xpand.status === 'active' ? 1 : 0;
      acc.completedXpands += xpand.status === 'completed' ? 1 : 0;
      acc.totalLearningHours += (xpand.stats.timeSpentMinutes || 0) / 60;
      acc.totalLoggedDays += xpand.stats.daysLogged || 0;
      acc.experiments += xpand.stats.experiments || 0;
      acc.questions += xpand.stats.questions || 0;
      acc.evidence += xpand.stats.evidence || 0;
      acc.resourcesCompleted += xpand.stats.resourcesCompleted || 0;
      return acc;
    },
    {
      activeXpands: 0,
      completedXpands: 0,
      totalLearningHours: 0,
      totalLoggedDays: 0,
      experiments: 0,
      questions: 0,
      evidence: 0,
      resourcesCompleted: 0,
    },
  );
}
