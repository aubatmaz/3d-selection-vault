import {
  migrateV1 as legacyMigration,
  type LegacyCatalogue,
} from './legacy/v2/migrate.ts';
import { migrateV2 } from './migrate-v2.ts';
export function migrateV1(input: LegacyCatalogue) {
  return migrateV2(legacyMigration(input));
}

export type { LegacyCatalogue } from './legacy/v2/migrate.ts';
