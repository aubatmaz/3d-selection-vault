import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateCatalogue,
  mergeCatalogue,
  filterTechniques,
  emptyFilters,
  emptyCatalogue,
  comparisonData,
  displayValue,
} from '../lib/legacy/v2/catalogue.ts';
import { migrateV1 } from '../lib/legacy/v2/migrate.ts';
import {
  ingestLiterature,
  matchTechnique,
  techniqueCandidates,
  type Curation,
} from '../lib/legacy/v2/ingestion.ts';
import type { Publication } from '../lib/legacy/v2/model.ts';
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const legacy = read('../data/legacy/catalogue-v1.json');
const migrated = migrateV1(legacy);
const data = validateCatalogue(read('../data/legacy/catalogue-v2.json'));
const changed = (fn: (d: typeof data) => void) => {
  const d = structuredClone(data);
  fn(d);
  return d;
};
void test('lossless migration loads 28 records, IDs, descriptions, tags, citations and original metadata', () => {
  assert.equal(migrated.techniques.length, 28);
  validateCatalogue(migrated);
  for (const old of legacy.techniques) {
    const t = migrated.techniques.find((t) => t.id === old.id)!;
    assert.deepEqual(t.legacyMetadata, old);
    assert.equal(t.description, old.description);
    assert.deepEqual(t.tags, old.tags);
    assert.ok(
      migrated.publications.some((p) =>
        p.legacyCitations.includes(old.citation),
      ),
    );
  }
});
void test('migration keeps category as primary and initial supported task', () => {
  for (const old of legacy.techniques) {
    const t = migrated.techniques.find((t) => t.id === old.id)!;
    assert.equal(t.primaryTask, old.category);
    assert.deepEqual(t.tasks, [old.category]);
  }
});
void test('migration preserves generic relationship directions without invented lineage', () => {
  for (const old of legacy.techniques) {
    assert.deepEqual(
      migrated.techniques
        .find((t) => t.id === old.id)!
        .relationships.map((r) => ({ id: r.techniqueId, type: r.type })),
      old.relatedTechniques.map((id: string) => ({
        id,
        type: 'conceptually-related',
      })),
    );
  }
});
void test('publication identity is separate and many-to-many links resolve', () => {
  assert.equal(migrated.publications.length, 26);
  assert.equal(data.publications.length, 34);
  assert.equal(data.techniques.length, 30);
  assert.ok(
    data.techniquePublications.filter(
      (l) => l.publicationId === 'seed-argelaguet-2013',
    ).length > 1,
  );
  assert.ok(
    data.techniquePublications.filter((l) => l.techniqueId === 'raycasting')
      .length > 1,
  );
});
void test('legacy year is never silently promoted to introduction year', () => {
  for (const t of migrated.techniques) assert.equal(t.introducedYear, null);
  assert.equal(
    data.techniques.find((t) => t.id === 'worlds-in-miniature')!.introducedYear,
    1995,
  );
  assert.throws(
    () =>
      validateCatalogue(
        changed((d) => {
          d.techniques[0].introducedYear = 1992;
        }),
      ),
    /introduced association/,
  );
});
void test('broken technique, publication, evidence and provenance references fail', () => {
  for (const change of [
    (d: typeof data) => {
      d.techniques[0].relationships[0].techniqueId = 'missing';
    },
    (d: typeof data) => {
      d.techniquePublications[0].publicationId = 'missing';
    },
    (d: typeof data) => {
      d.techniques.at(-1)!.evidence[0].publicationId = 'missing';
    },
    (d: typeof data) => {
      d.publications[0].provenance[0].discoveredFromPublicationId = 'missing';
    },
  ])
    assert.throws(() => validateCatalogue(changed(change)), /nonexistent/);
});
void test('duplicate technique/publication IDs, DOI and normalized aliases fail', () => {
  for (const change of [
    (d: typeof data) => {
      d.techniques.push(structuredClone(d.techniques[0]));
    },
    (d: typeof data) => {
      d.publications.push({ ...d.publications[0] });
    },
    (d: typeof data) => {
      const p = d.publications.find((p) => p.doi)!;
      d.publications.push({
        ...p,
        id: 'duplicate-doi',
        doi: p.doi!.toUpperCase(),
      });
    },
    (d: typeof data) => {
      d.techniques[1].aliases.push('  RAYCASTING  ');
    },
  ])
    assert.throws(() => validateCatalogue(changed(change)), /duplicate/i);
});
void test('controlled vocabularies, task consistency and DOI syntax are strict', () => {
  assert.throws(() =>
    validateCatalogue(
      changed((d) => {
        d.techniques[0].tasks = [];
      }),
    ),
  );
  assert.throws(
    () =>
      validateCatalogue(
        changed((d) => {
          d.techniques[0].tasks = ['navigation'];
        }),
      ),
    /primaryTask/,
  );
  assert.throws(() =>
    validateCatalogue(
      changed((d) => {
        d.publications[0].doi = 'https://doi.org/wrong';
      }),
    ),
  );
  const raw = structuredClone(data) as unknown as {
    techniques: { interactionModalities: string[] }[];
  };
  raw.techniques[0].interactionModalities = ['eyeball'];
  assert.throws(() => validateCatalogue(raw), /controlled/);
});
void test('verification requires actor/date/source/scope and never equates migration to human review', () => {
  assert.ok(
    migrated.techniques.every((t) => t.verificationStatus === 'migrated'),
  );
  assert.ok(
    data.techniques.every((t) => t.verificationStatus !== 'human-verified'),
  );
  assert.throws(
    () =>
      validateCatalogue(
        changed((d) => {
          d.techniques[0].verificationStatus = 'machine-verified';
        }),
      ),
    /actor/,
  );
  assert.throws(
    () =>
      validateCatalogue(
        changed((d) => {
          d.techniques.at(-1)!.verificationStatus = 'human-verified';
        }),
      ),
    /automated actors/,
  );
});
void test('typed historical edges require evidence and unsafe implementations are rejected', () => {
  assert.throws(
    () =>
      validateCatalogue(
        changed((d) => {
          d.techniques[0].relationships[0].type = 'derived-from';
        }),
      ),
    /requires evidence/,
  );
  assert.throws(() =>
    validateCatalogue(
      changed((d) => {
        d.techniques[0].implementations = [
          {
            id: 'unsafe',
            name: 'Unsafe',
            url: 'javascript:alert(1)',
            license: null,
            language: null,
            platform: null,
            notes: null,
            evidence: [],
          },
        ];
      }),
    ),
  );
});
void test('JSON export/import round trip is lossless', () => {
  assert.deepEqual(validateCatalogue(JSON.parse(JSON.stringify(data))), data);
  assert.deepEqual(mergeCatalogue(emptyCatalogue(), data), data);
  assert.throws(() => mergeCatalogue(data, data), /already exists/);
});
void test('atomic imports resolve references against batch plus base and never mutate base', () => {
  const a = structuredClone(data.techniques[0]);
  a.id = 'new-a';
  a.name = 'New A';
  a.aliases = [];
  a.relationships = [
    {
      techniqueId: 'new-b',
      type: 'conceptually-related',
      notes: null,
      evidence: [],
    },
  ];
  const b = {
    ...structuredClone(a),
    id: 'new-b',
    name: 'New B',
    relationships: [
      {
        techniqueId: 'raycasting',
        type: 'conceptually-related' as const,
        notes: null,
        evidence: [],
      },
    ],
  };
  const batch = { ...emptyCatalogue(), techniques: [a, b] };
  assert.equal(mergeCatalogue(data, batch).techniques.length, 32);
  assert.throws(
    () => mergeCatalogue(data, { ...batch, techniques: [a] }),
    /nonexistent/,
  );
  assert.equal(data.techniques.length, 30);
});
void test('search indexes aliases, author, title, venue, DOI and tasks across publications', () => {
  for (const query of [
    'Argelaguet',
    '10.1016/j.cag.2012.12.003',
    'Computers Graphics',
    'survey selection',
    'Hand-centered Object',
    'WIM',
  ])
    assert.ok(
      filterTechniques(data, { ...emptyFilters, query }).length > 0,
      query,
    );
  assert.ok(
    techniqueCandidates(data, 'Stoakley').includes('worlds-in-miniature'),
  );
  assert.equal(matchTechnique(data, 'wim')?.id, 'worlds-in-miniature');
});
void test('filters intersect and missing dates do not satisfy introduction year range', () => {
  const result = filterTechniques(data, {
    ...emptyFilters,
    task: 'navigation',
    environment: 'VR',
    from: '1995',
    to: '1995',
    verification: 'machine-verified',
    implementation: 'no',
  });
  assert.deepEqual(
    result.map((t) => t.id),
    ['worlds-in-miniature'],
  );
  assert.equal(
    filterTechniques(migrated, { ...emptyFilters, from: '1900' }).length,
    0,
  );
});
void test('comparison supports two through six unique records with neutral unknown values', () => {
  const c = comparisonData(data, ['raycasting', 'prism']);
  assert.equal(
    c.rows.find((r) => r.label === 'Introduction year')!.values[0],
    '—',
  );
  assert.equal(displayValue(null), '—');
  assert.equal(
    comparisonData(
      data,
      data.techniques.slice(0, 6).map((t) => t.id),
    ).techniques.length,
    6,
  );
  for (const ids of [
    [],
    ['raycasting'],
    ['raycasting', 'raycasting'],
    data.techniques.slice(0, 7).map((t) => t.id),
    ['raycasting', 'missing'],
  ])
    assert.throws(() => comparisonData(data, ids));
});
void test('research ingestion is reproducible, DOI-deduplicated and cannot create human-verified candidates', () => {
  const metadata = read('../research/metadata.json') as Publication[];
  const c = read('../research/curation.json') as Curation;
  const result = ingestLiterature(migrated, metadata, c);
  assert.deepEqual(result.catalogue, data);
  assert.equal(result.report.duplicatesAvoided, 5);
  metadata[0].verificationStatus = 'human-verified';
  assert.throws(
    () => ingestLiterature(migrated, metadata, c),
    /cannot assert human/,
  );
});
