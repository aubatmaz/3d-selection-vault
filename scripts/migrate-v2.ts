import { readFile, writeFile } from 'node:fs/promises';
import { migrateV2 } from '../lib/migrate-v2.ts';
const input = process.argv[2] ?? 'data/legacy/catalogue-v2.json';
const output = process.argv[3] ?? 'data/migrated-v3.json';
await writeFile(
  output,
  JSON.stringify(
    migrateV2(JSON.parse(await readFile(input, 'utf8'))),
    null,
    2,
  ) + '\n',
);
console.log('Version 3 migration written to ' + output);
