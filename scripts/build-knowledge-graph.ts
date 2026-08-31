import { readFile, writeFile } from 'node:fs/promises';
import { migrateV2 } from '../lib/migrate-v2.ts';
import { computeSimilarities } from '../lib/research.ts';
import { validateCatalogue } from '../lib/catalogue.ts';
const d = migrateV2(
  JSON.parse(await readFile('data/legacy/catalogue-v2.json', 'utf8')),
);
const manifest = JSON.parse(
  await readFile('research/discovery-manifest.json', 'utf8'),
) as {
  forwardCandidates: { title: string; doi: string | null; source: string }[];
};
d.candidateLiterature = manifest.forwardCandidates
  .filter(
    (p) =>
      !d.publications.some(
        (x) => x.doi && p.doi?.toLowerCase().endsWith(x.doi.toLowerCase()),
      ),
  )
  .map((p, i) => ({
    id: 'candidate-forward-' + (i + 1),
    title: p.title,
    doi: p.doi?.replace('https://doi.org/', '') ?? null,
    track: 'selection',
    source: p.source,
    notes:
      'Previously retrieved forward-citation candidate; content not inspected. Acceptance in curation records relevance only, not automatic publication ingestion.',
    status: 'open',
  }));
for (const c of d.candidateLiterature)
  d.reviewQueue.push({
    id: 'review-' + c.id,
    entityType: 'candidate',
    entityId: c.id,
    reasons: [c.notes],
    status: 'open',
  });
d.publicationSimilarities = computeSimilarities(d);
const output = process.argv[2] ?? 'data/migrated-v3.json';
await writeFile(output, JSON.stringify(validateCatalogue(d), null, 2) + '\n');
console.log(
  JSON.stringify({
    techniques: d.techniques.length,
    publications: d.publications.length,
    citationDiscoveries: d.publicationCitations.length,
    citationRelationships: d.publicationRelationships.length,
    similarities: d.publicationSimilarities.length,
    openReviews: d.reviewQueue.length,
  }),
);
