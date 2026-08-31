import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  validateCatalogue,
  assertRelations,
  mergeCatalogue,
} from '../lib/catalogue.ts';
const target = resolve(process.argv[3] ?? 'data/techniques.json');
try {
  const current = validateCatalogue(JSON.parse(await readFile(target, 'utf8')));
  assertRelations(current);
  if (!process.argv[2]) {
    console.log(`Validated ${current.techniques.length} techniques.`);
  } else {
    const merged = mergeCatalogue(
      current,
      JSON.parse(await readFile(resolve(process.argv[2]), 'utf8')),
    );
    const temporary = target + '.tmp';
    await writeFile(temporary, JSON.stringify(merged, null, 2) + '\n');
    await rename(temporary, target);
    console.log(
      `Imported ${merged.techniques.length - current.techniques.length} techniques into ${target}.`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
