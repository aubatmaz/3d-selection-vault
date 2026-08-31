import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { ingestLiterature } from '../lib/ingestion.ts';
import { ingestLiterature as replayV2 } from '../lib/legacy/v2/ingestion.ts';
import { migrateV1 as legacyV1 } from '../lib/legacy/v2/migrate.ts';
import { migrateV2 } from '../lib/migrate-v2.ts';
import { computeSimilarities } from '../lib/research.ts';
const read = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
try {
  const folder = resolve(process.argv[2] ?? 'research');
  const target = resolve(process.argv[4] ?? 'work/literature-proposal.json');
  // Proposals always live outside authoritative data/ and public examples.
  if (
    target.startsWith(resolve('data') + '/') ||
    target.startsWith(resolve('public') + '/') ||
    target === resolve(process.argv[3] ?? 'data/techniques.json')
  )
    throw new Error(
      'Discovery cannot overwrite the knowledge base; choose a proposal path outside data/ and public/.',
    );
  const metadata = await read(folder + '/metadata.json'),
    curation = await read(folder + '/curation.json');
  const result = process.argv[3]
    ? ingestLiterature(await read(resolve(process.argv[3])), metadata, curation)
    : replayV2(
        legacyV1(await read('data/legacy/catalogue-v1.json')),
        metadata,
        curation,
      );
  const catalogue =
    result.catalogue.schemaVersion === 2
      ? migrateV2(result.catalogue)
      : result.catalogue;
  catalogue.publicationSimilarities = computeSimilarities(catalogue);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(
    target,
    JSON.stringify(
      { kind: 'review-proposal', catalogue, report: result.report },
      null,
      2,
    ) + '\n',
  );
  console.log('Review proposal only: ' + target);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
}
