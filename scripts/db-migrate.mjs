import { Pool } from '@neondatabase/serverless';

import {
  runAdminDataMigration,
  runCommentAndMediaTableMigrations,
} from '../lib/adminData.js';
import { runArichuvadiLegacyMigration } from '../lib/arichuvadiData.js';
import { runArichuvadiSchemaMigration } from '../lib/arichuvadiAdmin.js';
import { runArizoneSchemaMigration } from '../lib/arizoneAdmin.js';
import { runContactTableMigration } from '../lib/contactData.js';
import { runPublicMutationMigrations } from '../lib/reactionData.js';
import { runProfileLinkSectionKeyMigration } from '../lib/profileLinkSectionMigration.js';

const MIGRATION_DATABASE_URL = process.env.DATABASE_MIGRATION_URL || '';
const MIGRATION_LOCK_KEY = 847291306;

const MIGRATIONS = [
  {
    id: '001-application-schema-and-legacy-data',
    async up(sql) {
      await runAdminDataMigration(sql);
      await runCommentAndMediaTableMigrations(sql);
      await runArizoneSchemaMigration(sql);
      await runArichuvadiSchemaMigration(sql);
      await runArichuvadiLegacyMigration(sql);
      await runContactTableMigration(sql);
    },
  },
  {
    id: '002-public-mutations-and-shared-rate-limits',
    async up(sql) {
      await runPublicMutationMigrations(sql);
    },
  },
  {
    id: '003-profile-link-section-keys',
    async up(sql) {
      const result = await runProfileLinkSectionKeyMigration(sql);
      if (result.unknownIds.length > 0) {
        console.log(`Unassigned ordinary profile link IDs (left section_key NULL): ${result.unknownIds.join(', ')}`);
      }
    },
  },
];

function createTaggedClient(client) {
  const sql = (strings, ...values) => {
    let text = strings[0] || '';
    for (let index = 0; index < values.length; index += 1) {
      text += `$${index + 1}${strings[index + 1] || ''}`;
    }
    return client.query(text, values).then((result) => result.rows);
  };
  sql.query = (text, values = []) => client.query(text, values).then((result) => result.rows);
  sql.unsafe = (text) => client.query(text).then((result) => result.rows);
  return sql;
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ariverse_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function run() {
  if (!MIGRATION_DATABASE_URL.trim()) {
    throw new Error(
      'DATABASE_MIGRATION_URL is required. It is intentionally separate from DATABASE_URL so migrations cannot silently use the runtime connection.'
    );
  }

  const pool = new Pool({ connectionString: MIGRATION_DATABASE_URL });
  const client = await pool.connect();
  const sql = createTaggedClient(client);

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await ensureMigrationTable(client);

    const appliedRows = await client.query(
      'SELECT id FROM ariverse_schema_migrations ORDER BY id ASC'
    );
    const applied = new Set(appliedRows.rows.map((row) => row.id));

    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) {
        console.log(`Already applied: ${migration.id}`);
        continue;
      }

      console.log(`Applying: ${migration.id}`);
      await client.query('BEGIN');
      try {
        await migration.up(sql);
        await client.query(
          'INSERT INTO ariverse_schema_migrations (id) VALUES ($1)',
          [migration.id]
        );
        await client.query('COMMIT');
        console.log(`Applied: ${migration.id}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    } finally {
      client.release();
      await pool.end();
    }
  }
}

run().catch((error) => {
  const safeDetail = error?.message?.startsWith('DATABASE_MIGRATION_URL is required')
    ? error.message
    : error?.code || error?.name || 'unknown error';
  console.error('Database migration failed:', safeDetail);
  process.exitCode = 1;
});
