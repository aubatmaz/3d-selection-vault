import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const vaultState = sqliteTable('vault_state', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(0),
  catalogue: text('catalogue').notNull(),
  updatedBy: text('updated_by').notNull(),
});
export const importCandidates = sqliteTable(
  'import_candidates',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id').notNull(),
    payload: text('payload').notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_import_candidates_status_created').on(
      table.status,
      table.createdAt,
      table.id,
    ),
  ],
);
export const importJobs = sqliteTable('import_jobs', {
  id: text('id').primaryKey(),
  metadata: text('metadata').notNull(),
  createdAt: text('created_at').notNull(),
});
export const importAudit = sqliteTable('import_audit', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
});
export const referenceCache = sqliteTable('reference_cache', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  retrievedAt: text('retrieved_at').notNull(),
});
export const providerLimits = sqliteTable('provider_limits', {
  id: text('id').primaryKey(),
  nextAt: integer('next_at').notNull(),
});
export const visitSessions = sqliteTable(
  'visit_sessions',
  { id: text('id').primaryKey(), day: text('day').notNull() },
  (t) => [index('idx_visit_sessions_day').on(t.day)],
);
export const visitTotals = sqliteTable('visit_totals', {
  id: text('id').primaryKey(),
  total: integer('total').notNull().default(0),
});
export const visitDaily = sqliteTable('visit_daily', {
  day: text('day').primaryKey(),
  total: integer('total').notNull().default(0),
});
