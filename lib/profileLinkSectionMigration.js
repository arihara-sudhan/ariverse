import { sectionKeyForProfileLink } from './sectionRegistry.js';

export async function runProfileLinkSectionKeyMigration(sql) {
  await sql`ALTER TABLE profile_links ADD COLUMN IF NOT EXISTS section_key TEXT`;

  const rows = await sql`
    SELECT id, label, href, section_key AS "sectionKey"
    FROM profile_links
    ORDER BY id ASC
  `;
  const ambiguousIds = [];
  const invalidExplicitIds = [];
  const unknownIds = [];
  const backfilledIds = [];

  for (const row of rows) {
    const explicitSectionKey = String(row.sectionKey || '').trim();
    const identity = sectionKeyForProfileLink(row);
    if (explicitSectionKey && identity.status === 'unknown') {
      invalidExplicitIds.push(row.id);
      continue;
    }
    if (identity.status === 'ambiguous') {
      ambiguousIds.push(row.id);
      continue;
    }
    if (identity.status === 'unknown') {
      unknownIds.push(row.id);
      continue;
    }
    if (explicitSectionKey !== identity.sectionKey) {
      await sql`UPDATE profile_links SET section_key = ${identity.sectionKey} WHERE id = ${row.id}`;
      backfilledIds.push(row.id);
    }
  }

  if (ambiguousIds.length > 0 || invalidExplicitIds.length > 0) {
    const details = [
      ambiguousIds.length > 0 ? `ambiguous IDs: ${ambiguousIds.join(', ')}` : '',
      invalidExplicitIds.length > 0 ? `invalid section_key IDs: ${invalidExplicitIds.join(', ')}` : '',
    ].filter(Boolean).join('; ');
    throw new Error(`profile_links section_key backfill requires explicit resolution (${details})`);
  }

  await sql`CREATE INDEX IF NOT EXISTS idx_profile_links_section_key ON profile_links(section_key)`;
  return { backfilledIds, unknownIds, ambiguousIds, invalidExplicitIds };
}

