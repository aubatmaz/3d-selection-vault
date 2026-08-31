import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  validateCatalogue,
  mergeCatalogue,
  emptyCatalogue,
  filterTechniques,
  emptyFilters,
  comparisonData,
} from '../lib/catalogue.ts';
import { migrateV2 } from '../lib/migrate-v2.ts';
import {
  computeSimilarities,
  publicationSimilarity,
  traversePublications,
  graphData,
  emptyGraphFilters,
  searchPublications,
  publicationComparison,
  timelineData,
} from '../lib/research.ts';
import { applyCuration } from '../lib/curation.ts';
import {
  persistDecision,
  readCurationState,
  type SqlDatabase,
  type SqlStatement,
} from '../lib/curation-repository.ts';
import {
  emptyVerification,
  type Catalogue,
  type PublicationRelationship,
  type CurationDecision,
} from '../lib/model.ts';
const read = (p: string) =>
  JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const data = validateCatalogue(read('../data/techniques.json'));
const old = read('../data/legacy/catalogue-v2.json');
const evidence = [
  {
    publicationId: 'seed-argelaguet-2013',
    section: 'Synthetic test fixture',
    page: null,
    quote: null,
    notes:
      'TEST ONLY: not a scientific assertion; never added to the live dataset.',
  },
];
const rel = (
  id: string,
  a: string,
  b: string,
  type: PublicationRelationship['type'] = 'extends',
): PublicationRelationship => ({
  id,
  sourcePublicationId: a,
  targetPublicationId: b,
  type,
  evidence: structuredClone(evidence),
  provenance: [
    {
      source: 'https://example.org/test',
      discoveryMethod: 'manual',
      discoveredFromPublicationId: null,
      retrievedAt: null,
      notes: 'Test fixture',
    },
  ],
  verificationStatus: 'machine-curated',
  verification: emptyVerification(),
  notes: 'TEST ONLY',
  status: 'active',
});
const A = 'legacy-paper-go-go',
  B = 'seed-argelaguet-2013',
  C = 'seed-yu-2024';
const chain = () => {
  const d = structuredClone(data);
  d.publicationRelationships.push(rel('test-b-a', B, A), rel('test-c-b', C, B));
  return validateCatalogue(d);
};
const decision = (
  change: Partial<CurationDecision> = {},
): CurationDecision => ({
  id: 'test-review-1',
  reviewer: 'Test Researcher',
  reviewerId: 'test-user',
  date: '2026-08-30',
  decision: 'need-more-evidence',
  entityType: 'technique',
  entityId: 'prism',
  field: null,
  value: null,
  notes: 'TEST ONLY: further original-paper review required',
  evidence,
  ...change,
});
void test('v3 migration preserves all records, associations, evidence and citation history', () => {
  const d = migrateV2(old);
  assert.equal(d.techniques.length, 30);
  assert.equal(d.publications.length, 34);
  assert.equal(d.techniquePublications.length, 43);
  assert.deepEqual(d.publicationCitations, old.publicationCitations);
  for (const t of old.techniques) {
    const migrated = d.techniques.find((x) => x.id === t.id)!;
    assert.equal(migrated.description, t.description);
    assert.deepEqual(migrated.tags, t.tags);
    assert.deepEqual(migrated.evidence, t.evidence);
    assert.equal(migrated.relationships.length, t.relationships.length);
    assert.deepEqual(
      migrated.provenance.slice(0, t.provenance.length),
      t.provenance,
    );
    assert.equal(migrated.verification.verifiedBy, null);
    assert.equal(migrated.verification.verifiedDate, null);
  }
});
void test('machine verification vocabulary migrates without human promotion', () => {
  assert.ok(
    data.techniques.every((t) => t.verificationStatus !== 'human-verified'),
  );
  assert.ok(
    data.publications.every((p) => p.verificationStatus !== 'human-verified'),
  );
  assert.equal(
    data.techniques.find((t) => t.id === 'prism')!.verificationStatus,
    'machine-curated',
  );
  const bad = JSON.parse(JSON.stringify(data));
  bad.techniques[0].verificationStatus = 'machine-verified';
  assert.throws(() => validateCatalogue(bad));
});
void test('earliest identified dates remain separate from unconfirmed introduction dates', () => {
  for (const id of ['prism', 'worlds-in-miniature']) {
    const t = data.techniques.find((t) => t.id === id)!;
    assert.equal(t.introducedYear, null);
    assert.equal(t.introductionStatus, 'earliest-identified');
    assert.ok(t.earliestIdentifiedYear);
    assert.ok(
      data.claims.some(
        (c) =>
          c.entityId === id &&
          c.field === 'introducedYear' &&
          c.status === 'needs-evidence',
      ),
    );
  }
  assert.equal(
    filterTechniques(data, { ...emptyFilters, from: '1900' }).length,
    0,
  );
});
void test('publication relationship references and self-edges are rejected', () => {
  const d = structuredClone(data);
  d.publicationRelationships.push(rel('bad-edge', A, 'missing'));
  assert.throws(() => validateCatalogue(d), /nonexistent/);
  d.publicationRelationships.pop();
  d.publicationRelationships.push(rel('self-edge', A, A));
  assert.throws(() => validateCatalogue(d), /Self/);
});
void test('extends requires content evidence', () => {
  const d = structuredClone(data);
  d.publicationRelationships.push({
    ...rel('no-evidence', B, A),
    evidence: [],
  });
  assert.throws(() => validateCatalogue(d), /extends requires evidence/);
});
void test('builds-on requires content evidence', () => {
  const d = structuredClone(data);
  d.publicationRelationships.push({
    ...rel('no-evidence', B, A, 'builds-on'),
    evidence: [],
  });
  assert.throws(() => validateCatalogue(d), /builds-on requires evidence/);
});
void test('duplicate directional semantic links fail', () => {
  const d = chain();
  d.publicationRelationships.push(rel('other-id', B, A));
  assert.throws(() => validateCatalogue(d), /Duplicate semantic/);
});
void test('symmetric relationship endpoints are canonical and have no arrows', () => {
  const d = structuredClone(data);
  const [a, b] = [A, B].sort();
  d.publicationRelationships.push(rel('symmetrical', a, b, 'compares-with'));
  assert.equal(
    graphData(validateCatalogue(d), emptyGraphFilters).edges.find(
      (e) => e.id === 'symmetrical',
    )!.directed,
    false,
  );
  d.publicationRelationships.at(-1)!.sourcePublicationId = b;
  d.publicationRelationships.at(-1)!.targetPublicationId = a;
  assert.throws(() => validateCatalogue(d), /Symmetric/);
});
void test('citations are distinct from intellectual dependency', () => {
  assert.equal(data.publicationRelationships.length, 38);
  assert.ok(data.publicationRelationships.every((r) => r.type === 'cites'));
  assert.deepEqual(traversePublications(data, C, 'ancestors'), []);
  assert.ok(traversePublications(data, C, 'ancestors', true).length > 0);
});
void test('directional ancestry visits transitive earlier dependencies', () => {
  assert.deepEqual(traversePublications(chain(), C, 'ancestors'), [B, A]);
});
void test('descendants traverse reverse dependency direction', () => {
  assert.deepEqual(traversePublications(chain(), A, 'descendants'), [B, C]);
});
void test('traversal handles cycles and rejected edges without looping', () => {
  const d = chain();
  d.publicationRelationships.push(rel('test-cycle', A, C));
  assert.deepEqual(traversePublications(d, A, 'descendants'), [B, C]);
  d.publicationRelationships.find((r) => r.id === 'test-c-b')!.status =
    'rejected';
  assert.deepEqual(traversePublications(d, A, 'descendants'), [B]);
});
void test('similarity is deterministic, structured and symmetric', () => {
  const a = publicationSimilarity(data, A, B),
    b = publicationSimilarity(data, B, A);
  assert.deepEqual(a, b);
  assert.ok(a.score >= 0 && a.score <= 1);
  assert.deepEqual(computeSimilarities(data), data.publicationSimilarities);
});
void test('similarity explains shared and different characteristics and excludes unknown dimensions', () => {
  const s = publicationSimilarity(data, A, B);
  assert.ok(s.reasons.some((r) => r.startsWith('Shared')));
  assert.ok(s.reasons.some((r) => r.startsWith('Different')));
  assert.equal(s.dimensions.methodology, null);
  assert.match(s.provenance.notes, /not evidence of historical influence/);
  assert.ok(s.provenance.coverage < 1);
});
void test('invalid similarity scores, missing explanations and reversed pairs fail', () => {
  for (const change of [
    (d: Catalogue) => {
      d.publicationSimilarities[0].score = 2;
    },
    (d: Catalogue) => {
      d.publicationSimilarities[0].reasons = [];
    },
    (d: Catalogue) => {
      d.publicationSimilarities[0].publicationAId =
        d.publicationSimilarities[0].publicationBId;
    },
  ]) {
    const d = structuredClone(data);
    change(d);
    assert.throws(() => validateCatalogue(d));
  }
});
void test('graph generation separates citations, semantic links and similarity', () => {
  const d = chain();
  const graph = graphData(d, {
    ...emptyGraphFilters,
    similarity: true,
    threshold: 0,
  });
  assert.ok(graph.edges.some((e) => e.kind === 'citation' && e.directed));
  assert.ok(graph.edges.some((e) => e.kind === 'lineage' && e.directed));
  assert.ok(graph.edges.some((e) => e.kind === 'similarity' && !e.directed));
});
void test('graph node filters intersect years, task, modality, technique and verification', () => {
  const g = graphData(data, {
    ...emptyGraphFilters,
    from: '2013',
    to: '2013',
    technique: 'go-go',
    task: 'manipulation',
    verification: 'machine-curated',
  });
  assert.deepEqual(
    g.nodes.map((p) => p.id),
    [B],
  );
  assert.equal(g.edges.length, 0);
});
void test('graph edge filters are independent and enforce threshold', () => {
  const d = chain();
  const g = graphData(d, {
    ...emptyGraphFilters,
    citations: false,
    lineage: true,
    similarity: false,
    relationship: 'extends',
  });
  assert.equal(g.edges.length, 2);
  assert.ok(g.edges.every((e) => e.kind === 'lineage'));
  const kin = graphData(data, {
    ...emptyGraphFilters,
    citations: false,
    lineage: false,
    similarity: true,
    threshold: 0.9,
  });
  assert.ok(kin.edges.every((e) => e.kind === 'similarity' && e.score! >= 0.9));
});
void test('claim-level evidence rejects broken targets and fake confirmed claims', () => {
  const d = structuredClone(data);
  d.claims[0].entityId = 'missing';
  assert.throws(() => validateCatalogue(d), /nonexistent/);
  d.claims[0].entityId = 'prism';
  d.claims[0].status = 'confirmed';
  assert.throws(() => validateCatalogue(d), /Confirmed claim/);
});
void test('human confirmation applies introduction claim without promoting the whole technique', () => {
  const d = applyCuration(
    data,
    decision({
      decision: 'confirm',
      entityType: 'claim',
      entityId: 'claim-prism-introduction',
      evidence: [{ ...evidence[0], publicationId: 'frees-2005-prism' }],
    }),
  );
  assert.equal(
    d.techniques.find((t) => t.id === 'prism')!.introducedYear,
    2005,
  );
  assert.equal(
    d.techniques.find((t) => t.id === 'prism')!.verificationStatus,
    'machine-curated',
  );
  assert.equal(
    d.claims.find((c) => c.id === 'claim-prism-introduction')!
      .verificationStatus,
    'human-verified',
  );
  assert.equal(
    data.techniques.find((t) => t.id === 'prism')!.introducedYear,
    null,
  );
});
void test('rejecting a confirmed introduction retracts the claim and preserves decision history', () => {
  const confirmed = applyCuration(
    data,
    decision({
      decision: 'confirm',
      entityType: 'claim',
      entityId: 'claim-prism-introduction',
      evidence: [{ ...evidence[0], publicationId: 'frees-2005-prism' }],
    }),
  );
  const rejected = applyCuration(
    confirmed,
    decision({
      id: 'test-reject-2',
      decision: 'reject',
      entityType: 'claim',
      entityId: 'claim-prism-introduction',
    }),
  );
  assert.equal(
    rejected.techniques.find((t) => t.id === 'prism')!.introducedYear,
    null,
  );
  assert.equal(rejected.curationDecisions.length, 2);
  assert.equal(
    rejected.claims.find((c) => c.id === 'claim-prism-introduction')!.status,
    'rejected',
  );
});
void test('curation feedback does not promote scientific verification', () => {
  const d = applyCuration(
    data,
    decision({
      decision: 'useful',
      entityType: 'similarity',
      entityId: data.publicationSimilarities[0].id,
      evidence: [],
    }),
  );
  assert.equal(d.curationDecisions.at(-1)!.decision, 'useful');
  assert.ok(
    d.techniques.every((t) => t.verificationStatus !== 'human-verified'),
  );
  assert.throws(
    () => applyCuration(data, decision({ decision: 'useful' })),
    /Feedback/,
  );
});
void test('implementation allows independent software provenance without an exact-software paper', () => {
  const d = structuredClone(data);
  d.techniques[0].implementations.push({
    id: 'test-prototype',
    name: 'Test only',
    platform: 'WebXR',
    status: 'prototype',
    repositoryUrl: 'https://example.org/test',
    demoUrl: null,
    documentationUrl: null,
    programmingLanguage: 'TypeScript',
    license: null,
    notes: 'Test fixture only',
    scientificBasis: [],
    provenance: {
      implementedBy: 'Test Researcher',
      implementationDate: '2026-08-30',
      repository: 'https://example.org/test',
      source: null,
      notes: 'Independent prototype',
    },
  });
  validateCatalogue(d);
  const bad = JSON.parse(JSON.stringify(d));
  bad.techniques[0].implementations[0].status = 'none';
  assert.throws(() => validateCatalogue(bad));
  bad.techniques[0].implementations[0].status = 'prototype';
  bad.techniques[0].implementations[0].platform = 'invented';
  assert.throws(() => validateCatalogue(bad));
});
void test('task-specific taxonomy rejects irrelevant sections and invalid values', () => {
  const d = structuredClone(data);
  d.techniques[0].taxonomy.navigation = {
    locomotionMechanism: ['teleportation'],
    continuity: ['discrete'],
    referenceFrame: null,
    physicalMovementRequired: null,
  };
  assert.throws(() => validateCatalogue(d), /supported task/);
  const bad = JSON.parse(JSON.stringify(data));
  bad.techniques[0].taxonomy.general.environment = ['holodeck'];
  assert.throws(() => validateCatalogue(bad));
});
void test('v3 import/export round trip includes graph, claims, history and candidates', () => {
  assert.deepEqual(
    mergeCatalogue(emptyCatalogue(), JSON.parse(JSON.stringify(data))),
    data,
  );
  assert.equal(comparisonData(data, ['prism', 'go-go']).techniques.length, 2);
});
void test('publication search includes abstract/profile metadata and relationship-aware queries', () => {
  assert.ok(searchPublications(data, 'Stoakley').length > 0);
  assert.ok(searchPublications(data, 'controller selection').length > 0);
  assert.deepEqual(searchPublications(data, 'papers extending Go-Go'), []);
  assert.ok(
    searchPublications(chain(), 'papers extending Go-Go').some(
      (p) => p.id === B,
    ),
  );
  assert.ok(searchPublications(data, 'papers similar to Go-Go').length > 0);
});
void test('publication comparison and timeline avoid invented evolutionary edges', () => {
  assert.equal(publicationComparison(data, [A, B]).papers.length, 2);
  assert.throws(() => publicationComparison(data, [A]));
  assert.equal(timelineData(data).relationships.length, 0);
});
void test('new scholarly relationship proposals require evidence and enter review', () => {
  const d = applyCuration(
    data,
    decision({
      entityType: 'publication',
      entityId: B,
      decision: 'modify',
      field: 'newRelationship',
      value: { targetPublicationId: A, type: 'extends' },
    }),
  );
  const r = d.publicationRelationships.find(
    (r) => r.id === 'pr-test-review-1',
  )!;
  assert.equal(r.status, 'needs-evidence');
  assert.equal(r.verificationStatus, 'machine-curated');
  assert.ok(d.reviewQueue.some((q) => q.entityId === r.id));
});
void test('curation persists across database reopen and rejects stale revisions', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'vault-test-'));
  const path = join(folder, 'reviews.sqlite');
  let sqlite = new DatabaseSync(path);
  sqlite.exec(
    readFileSync(
      new URL('../drizzle/0000_hesitant_spot.sql', import.meta.url),
      'utf8',
    ),
  );
  const adapter = (): SqlDatabase => ({
    prepare(sql: string): SqlStatement {
      let values: (string | number)[] = [];
      return {
        bind(...input) {
          values = input;
          return this;
        },
        async run() {
          const r = sqlite.prepare(sql).run(...values);
          return { meta: { changes: Number(r.changes) } };
        },
        async first<T>() {
          return (sqlite.prepare(sql).get(...values) as T | undefined) ?? null;
        },
      };
    },
  });
  try {
    const first = await readCurationState(adapter(), data);
    assert.equal(first.revision, 0);
    await persistDecision(
      adapter(),
      data,
      0,
      decision({
        adminId: 'test-admin',
        timestamp: '2026-08-30T12:00:00.000Z',
      }),
    );
    sqlite.close();
    sqlite = new DatabaseSync(path);
    const saved = await readCurationState(adapter(), data);
    assert.equal(saved.revision, 1);
    assert.equal(saved.catalogue.curationDecisions.length, 1);
    const audit = saved.catalogue.curationDecisions[0];
    assert.equal(audit.adminId, 'test-admin');
    assert.equal(audit.timestamp, '2026-08-30T12:00:00.000Z');
    assert.ok(audit.previousValue);
    assert.ok(audit.newValue);
    await assert.rejects(
      () =>
        persistDecision(adapter(), data, 0, decision({ id: 'stale-review' })),
      /CONFLICT/,
    );
    assert.equal(
      (await readCurationState(adapter(), data)).catalogue.curationDecisions
        .length,
      1,
    );
  } finally {
    sqlite.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
void test('confirming a field creates a human-verified claim without record-wide promotion', () => {
  const d = applyCuration(
    data,
    decision({
      entityId: 'homer',
      decision: 'confirm',
      field: 'tasks',
      value: ['manipulation', 'selection'],
    }),
  );
  const c = d.claims.find((c) => c.entityId === 'homer' && c.field === 'task')!;
  assert.equal(c.status, 'confirmed');
  assert.equal(c.verificationStatus, 'human-verified');
  assert.equal(
    d.techniques.find((t) => t.id === 'homer')!.verificationStatus,
    'machine-curated',
  );
});
void test('rejected technique relationships remain stored but are explicitly inactive', () => {
  const r = data.techniques[0].relationships[0];
  const d = applyCuration(
    data,
    decision({
      entityType: 'technique-relationship',
      entityId: r.id,
      decision: 'reject',
    }),
  );
  assert.equal(
    d.techniques[0].relationships.length,
    data.techniques[0].relationships.length,
  );
  assert.equal(d.techniques[0].relationships[0].status, 'rejected');
});
