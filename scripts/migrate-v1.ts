import { readFile, writeFile } from 'node:fs/promises';
import { migrateV1, type LegacyCatalogue } from '../lib/migrate.ts';
const source = process.argv[2] ?? 'data/legacy/catalogue-v1.json';
const target = process.argv[3] ?? 'data/migrated-v2.json';
const legacy = JSON.parse(await readFile(source, 'utf8')) as LegacyCatalogue;
const d = migrateV1(legacy);
await writeFile(target, JSON.stringify(d, null, 2) + '\n');
console.log(
  `Migrated ${d.techniques.length} techniques; created ${d.publications.length} publications; preserved ${d.techniquePublications.length} unclassified citation associations.`,
);
