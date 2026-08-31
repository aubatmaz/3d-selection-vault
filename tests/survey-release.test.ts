import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateCatalogue, buildSearchIndex } from '../lib/catalogue.ts';
import { mergeReleaseSeed } from '../lib/release-seed.ts';
import { surveySummary } from '../lib/surveys.ts';
const data = validateCatalogue(
  JSON.parse(fs.readFileSync('data/techniques.json', 'utf8')),
);
const patch = JSON.parse(
  fs.readFileSync('data/releases/selection-survey-2013.json', 'utf8'),
);
const extraction = JSON.parse(
  fs.readFileSync('data/survey-extraction-2013.json', 'utf8'),
);
void test('all 31 table entries plus WIM map to 32 unique existing or machine-curated records', () => {
  assert.equal(extraction.rows.length, 32);
  assert.equal(
    new Set(data.techniques.map((t) => t.id)).size,
    data.techniques.length,
  );
  const survey = data.publications.find(
    (p) => p.doi === '10.1016/j.cag.2012.12.003',
  )!;
  const coverage = surveySummary(data, survey);
  assert.equal(coverage.techniques.length, 32);
  for (const r of extraction.rows)
    assert.ok(coverage.techniques.some((t) => t.id === r.techniqueId));
  for (const t of patch.techniques) {
    assert.equal(t.verificationStatus, 'machine-curated');
    assert.equal(t.verification.verifiedBy, null);
    assert.equal(t.introducedYear, null);
  }
  assert.ok(
    patch.publicationRelationships.every(
      (r: { type: string }) => r.type === 'cites',
    ),
  );
});
void test('release merge inserts absent records, preserves existing curation and is idempotent', () => {
  const older = structuredClone(data);
  older.techniques = older.techniques.filter(
    (t) => !patch.techniques.some((x: { id: string }) => x.id === t.id),
  );
  older.publications = older.publications.filter(
    (p) => !patch.publications.some((x: { id: string }) => x.id === p.id),
  );
  older.techniquePublications = older.techniquePublications.filter(
    (l) =>
      !patch.techniquePublications.some(
        (x: typeof l) => JSON.stringify(x) === JSON.stringify(l),
      ),
  );
  older.publicationRelationships = older.publicationRelationships.filter(
    (r) =>
      !patch.publicationRelationships.some(
        (x: { id: string }) => x.id === r.id,
      ),
  );
  older.publicationCitations = older.publicationCitations.filter(
    (r) =>
      !patch.publicationCitations.some(
        (x: typeof r) => JSON.stringify(x) === JSON.stringify(r),
      ),
  );
  older.claims = older.claims.filter(
    (c) => !patch.claims.some((x: { id: string }) => x.id === c.id),
  );
  older.reviewQueue = older.reviewQueue.filter(
    (r) => !patch.reviewQueue.some((x: { id: string }) => x.id === r.id),
  );
  const curated = older.techniques[0];
  curated.verificationStatus = 'human-verified';
  curated.verification = {
    verifiedBy: 'Owner',
    verifiedDate: '2026-08-31',
    sources: ['https://doi.org/10.1016/j.cag.2012.12.003'],
    notes: 'Test review scope',
  };
  curated.description = 'Administrator-owned text';
  const before = structuredClone(curated);
  const merged = mergeReleaseSeed(older);
  assert.equal(merged.changed, true);
  validateCatalogue(merged.catalogue);
  assert.deepEqual(
    merged.catalogue.techniques.find((t) => t.id === curated.id),
    before,
  );
  assert.deepEqual(merged.catalogue.curationDecisions, older.curationDecisions);
  assert.equal(mergeReleaseSeed(merged.catalogue).changed, false);
});
void test('survey alternative labels are searchable without duplicating canonical techniques', () => {
  const index = buildSearchIndex(data);
  assert.ok(index.get('cone-casting')?.includes('flashlight'));
  assert.ok(index.get('flexible-pointer')?.includes('flexible pointing'));
});
void test('global footer owns the counter and links the license; headers no longer duplicate it', () => {
  const footer = fs.readFileSync('components/site-footer.tsx', 'utf8');
  assert.match(footer, /<VisitCounter/);
  assert.match(footer, /href="\/license"/);
  for (const f of ['app/page.tsx', 'components/user-guidance.tsx'])
    assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /<VisitCounter/);
  assert.ok(fs.existsSync('app/license/page.tsx'));
  assert.ok(fs.existsSync('app/about/page.tsx'));
});
