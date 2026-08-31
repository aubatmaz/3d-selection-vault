import { mergeReleaseSeed } from './release-seed.ts';
import { normalizeVerification } from './verification.ts';
import { catalogueShape, validateShape } from './schema.ts';
import { upgradePublications } from './publication-upgrade.ts';
import { validateCatalogue } from './catalogue.ts';
import { applyCuration, getEntity } from './curation.ts';
import type { Catalogue, CurationDecision } from './model.ts';
export interface SqlStatement {
  bind(...values: (string | number)[]): SqlStatement;
  run(): Promise<{ meta: { changes: number } }>;
  first<T>(): Promise<T | null>;
}
export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
}
export async function readCurationState(db: SqlDatabase, initial: Catalogue) {
  await db
    .prepare(
      'INSERT OR IGNORE INTO vault_state (id,revision,catalogue,updated_by) VALUES (?,?,?,?)',
    )
    .bind('main', 0, JSON.stringify(initial), 'release-seed')
    .run();
  const row = await db
    .prepare('SELECT revision,catalogue FROM vault_state WHERE id=?')
    .bind('main')
    .first<{ revision: number; catalogue: string }>();
  if (!row) throw new Error('Curation state unavailable');
  const raw = JSON.parse(row.catalogue);
  validateShape(raw, catalogueShape);
  const normalized = validateCatalogue(
    upgradePublications(normalizeVerification(raw)),
  );
  const merged = mergeReleaseSeed(normalized);
  if (merged.changed) {
    validateCatalogue(merged.catalogue);
    const payload = JSON.stringify(merged.catalogue);
    if (new TextEncoder().encode(payload).length > 1_800_000)
      throw new Error(
        'Release additions exceed storage capacity; existing curation is unchanged.',
      );
    const result = await db
      .prepare(
        'UPDATE vault_state SET catalogue=?,revision=revision+1,updated_by=? WHERE id=? AND revision=?',
      )
      .bind(payload, 'release:selection-survey-2013', 'main', row.revision)
      .run();
    if (result.meta.changes !== 1)
      throw new Error(
        'CONFLICT: curation changed during release update. Reload to retry safely.',
      );
    return { revision: row.revision + 1, catalogue: merged.catalogue };
  }
  return { revision: row.revision, catalogue: normalized };
}
export async function persistDecision(
  db: SqlDatabase,
  initial: Catalogue,
  revision: number,
  decision: CurationDecision,
) {
  const current = await readCurationState(db, initial);
  if (current.revision !== revision)
    throw new Error(
      'CONFLICT: another review changed the catalogue. Reload before retrying.',
    );
  const audited = {
    ...decision,
    previousValue: JSON.parse(
      JSON.stringify(
        getEntity(current.catalogue, decision.entityType, decision.entityId) ??
          null,
      ),
    ),
  };
  delete audited.newValue;
  const next = applyCuration(current.catalogue, audited);
  next.curationDecisions.at(-1)!.newValue = JSON.parse(
    JSON.stringify(
      getEntity(next, decision.entityType, decision.entityId) ?? null,
    ),
  );
  const result = await db
    .prepare(
      'UPDATE vault_state SET catalogue=?,revision=revision+1,updated_by=? WHERE id=? AND revision=?',
    )
    .bind(JSON.stringify(next), decision.reviewerId, 'main', revision)
    .run();
  if (result.meta.changes !== 1)
    throw new Error(
      'CONFLICT: another review saved first. Reload before retrying.',
    );
  return { revision: revision + 1, catalogue: next };
}
