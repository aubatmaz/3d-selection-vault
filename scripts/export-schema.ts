import { writeFile } from 'node:fs/promises';
import { jsonSchema } from '../lib/schema.ts';
await writeFile(
  'public/technique.schema.json',
  JSON.stringify(jsonSchema, null, 2) + '\n',
);
