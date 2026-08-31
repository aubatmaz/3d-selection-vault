import { parseBibtex } from '../lib/bibtex-parser.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  bibtexExport,
  matchPublication,
  exportScope,
} from '../lib/bibliography.ts';
import {
  extractPdfText,
  referenceCandidate,
  metadataConflicts,
} from '../lib/pdf-extraction.ts';
import {
  parsePublicReferences,
  referenceProviders,
  publisherUrl,
} from '../lib/reference-providers.ts';
import { graph3d, defaultGraphOptions } from '../lib/graph3d.ts';
import { publicationTypes } from '../lib/model.ts';
import { validateCatalogue } from '../lib/catalogue.ts';
import { publicationShape, validateShape } from '../lib/schema.ts';
import { accessRole, requireAdmin } from '../lib/auth.ts';
import { surveyFilter, surveySummary } from '../lib/surveys.ts';
import { approvePublication } from '../lib/import-review.ts';
import { proposeCitations } from '../lib/citation-proposals.ts';
const data = validateCatalogue(
  JSON.parse(
    fs.readFileSync(
      new URL('../data/techniques.json', import.meta.url),
      'utf8',
    ),
  ),
);
const bib =
  '@article{Smith2020, title={A {VR} Study}, author={Smith, Jane and Doe, John}, year={2020}, journal={Journal of Tests}, volume={2}, number={3}, pages={1--9}, publisher={Press}, doi={10.1234/example}, abstract={A test abstract}, keywords={VR, selection}}';
const parsed = () => parseBibtex(bib).candidates[0].publication;
void test('BibTeX parses nested braces and all available bibliographic fields', () => {
  const p = parsed();
  assert.equal(p.title, 'A {VR} Study');
  assert.equal(p.bibliographic?.issue, '3');
  assert.equal(p.authors.length, 2);
  assert.equal(p.publicationType, 'unknown');
});
void test('large BibTeX import handles 1500 entries with counts', () => {
  const b = Array.from(
    { length: 1500 },
    (_, i) => `@misc{k${i}, title={Title ${i}}, year={2020}}`,
  ).join('\n');
  const p = parseBibtex(b);
  assert.equal(p.metrics.parsed, 1500);
  assert.equal(p.metrics.errors, 0);
});
void test('malformed BibTeX reports errors while recovering separate valid entries', () => {
  const p = parseBibtex(bib + '\n@article{broken, title={Missing}\n');
  assert.equal(p.metrics.parsed, 1);
  assert.ok(p.errors.length);
});
void test('BibTeX export preserves key and omits unavailable metadata', () => {
  const p = parsed();
  assert.match(bibtexExport([p]), /@article\{Smith2020,/);
  p.year = null;
  assert.doesNotMatch(bibtexExport([p]), /year\s*=/);
});
void test('BibTeX → Publication → BibTeX preserves populated fields', () => {
  const p = parsed();
  const back = parseBibtex(bibtexExport([p])).candidates[0].publication;
  for (const k of [
    'title',
    'authors',
    'year',
    'doi',
    'abstract',
    'keywords',
    'bibliographic',
    'bibtexKey',
  ] as const)
    assert.deepEqual(back[k], p[k]);
});
void test('Publication → BibTeX → Publication preserves known metadata', () => {
  const p = parsed();
  p.title = 'Changed title';
  p.bibtexKey = 'CustomKey';
  assert.equal(
    parseBibtex(bibtexExport([p])).candidates[0].publication.title,
    p.title,
  );
});
void test('duplicate DOI is strongest even if titles conflict', () => {
  const p = parsed();
  const q = {
    ...p,
    id: 'another',
    title: 'Different',
    doi: 'https://doi.org/10.1234/EXAMPLE',
  };
  assert.equal(matchPublication(q, [p]).status, 'exact-duplicate');
});
void test('normalized title matches are potential duplicates, never destructive merges', () => {
  const p = parsed();
  const q = { ...p, doi: null, title: 'A VR Study!', id: 'other' };
  assert.equal(matchPublication(q, [p]).status, 'potential-duplicate');
  const preview = parseBibtex(bib, [{ ...p, doi: null }]);
  assert.equal(preview.metrics.potentialDuplicates, 1);
});
void test('PDF metadata comes from embedded text and authors remain unknown', () => {
  const r = extractPdfText(
    'A Study of Interaction\n2022\nDOI: 10.1234/test\nAbstract\nEmbedded abstract.\n1 Introduction\nText.',
    [],
    'paper.pdf',
  );
  assert.equal(r.publication.doi, '10.1234/test');
  assert.equal(r.publication.year, 2022);
  assert.deepEqual(r.publication.authors, []);
  assert.match(r.publication.abstract!, /Embedded/);
});
void test('PDF reference parsing separates numbered citations and flags scan without OCR', () => {
  const r = extractPdfText(
    'A long publication title\nReferences\n[1] Smith. Study. 2020. 10.1234/example\n[2] Unknown author and title. 2021.',
    [parsed()],
    'paper.pdf',
  );
  assert.equal(r.references.length, 2);
  assert.equal(r.matched, 1);
  assert.equal(r.unresolved, 1);
  assert.equal(extractPdfText('', [], 'scan.pdf').requiresOcr, true);
});
void test('citation matching labels DOI and unresolved cases', () => {
  assert.equal(
    referenceCandidate('Smith 10.1234/example', [parsed()]).matchMethod,
    'DOI',
  );
  assert.equal(
    referenceCandidate('Unresolved reference', []).matchedPublicationId,
    null,
  );
});
void test('ACM provider parses public references only', () => {
  const p = parsed();
  const refs = parsePublicReferences(
    '<ol class="references"><li>Smith 10.1234/example</li></ol>',
    'ACM-DL',
    [p],
  );
  assert.equal(refs[0].matchedPublicationId, p.id);
  assert.equal(refs[0].doi, '10.1234/example');
});
void test('IEEE provider parses supported public reference markup', () => {
  assert.equal(
    parsePublicReferences(
      '<section id="references"><ol><li>Smith 10.1234/example</li></ol></section>',
      'IEEE-Xplore',
      [],
    ).length,
    1,
  );
});
void test('publisher failure is graceful and does not follow redirects', async () => {
  const p = { ...parsed(), doi: '10.1145/123' };
  let calls = 0;
  const r = await referenceProviders[0].fetchReferences(
    p,
    [],
    async (_u, init) => {
      calls++;
      assert.equal(init?.redirect, 'manual');
      return new Response('Forbidden', { status: 403 });
    },
  );
  assert.equal(r.status, 'blocked');
  assert.equal(calls, 1);
});
void test('provider URLs reject credentials, localhost and arbitrary hosts', () => {
  assert.throws(() =>
    publisherUrl(
      { ...parsed(), doi: null, url: 'https://127.0.0.1/document/1' },
      'IEEE-Xplore',
    ),
  );
  assert.throws(() =>
    publisherUrl(
      {
        ...parsed(),
        doi: null,
        url: 'https://user:pass@ieeexplore.ieee.org/document/1',
      },
      'IEEE-Xplore',
    ),
  );
});
void test('13 publication types validate; unknown values fail', () => {
  assert.equal(publicationTypes.length, 13);
  for (const type of publicationTypes)
    validateShape({ ...parsed(), publicationType: type }, publicationShape);
  assert.throws(() =>
    validateShape(
      { ...parsed(), publicationType: 'inferred-survey' },
      publicationShape,
    ),
  );
});
void test('survey filtering keeps normal publication identities and task scopes', () => {
  const all = surveyFilter(data, '');
  assert.ok(all.length >= 3);
  assert.ok(surveyFilter(data, 'selection').length);
  assert.ok(all.every((p) => data.publications.includes(p)));
});
void test('survey stats count indexed citations, not invented corpus sizes', () => {
  const p = surveyFilter(data, '')[0];
  const summary = surveySummary(data, p);
  assert.ok(
    summary.referenced.every((id) =>
      data.publications.some((p) => p.id === id),
    ),
  );
});
void test('3D graph nodes have meaningful nonconstant Z coordinates', () => {
  const g = graph3d(data, defaultGraphOptions);
  assert.ok(new Set(g.nodes.map((n) => n.z)).size > 3);
  assert.ok(g.nodes.every((n) => [n.x, n.y, n.z].every(Number.isFinite)));
});
void test('3D citation and similarity edges preserve direction semantics', () => {
  const g = graph3d(data, {
    ...defaultGraphOptions,
    similarity: true,
    threshold: 0.15,
  });
  assert.ok(g.edges.some((e) => e.kind === 'citation'));
  assert.ok(
    g.edges.filter((e) => e.kind === 'similarity').every((e) => !e.directed),
  );
  assert.ok(
    g.edges.filter((e) => e.kind === 'citation').every((e) => e.directed),
  );
});
void test('3D filters and survey hubs are effective', () => {
  const g = graph3d(data, { ...defaultGraphOptions, surveysOnly: true });
  assert.ok(g.nodes.length >= 3);
  assert.ok(g.nodes.every((n) => n.kind !== 'paper' && n.kind !== 'technique'));
  assert.equal(
    graph3d(data, { ...defaultGraphOptions, query: 'zzzz no match' }).nodes
      .length,
    0,
  );
});
void test('progressive expansion keeps focus and expands bounded hops', () => {
  const focus = `p:${data.publications[0].id}`;
  const collapsed = graph3d(data, { ...defaultGraphOptions, focus, hops: 0 });
  const expanded = graph3d(data, { ...defaultGraphOptions, focus, hops: 2 });
  assert.equal(collapsed.nodes.length, 1);
  assert.ok(expanded.nodes.length >= 1);
});
const req = (email: string, id = 'signed-in', origin = 'https://vault.test') =>
  new Request('https://vault.test/api/curation', {
    method: 'POST',
    headers: {
      origin,
      'oai-authenticated-user-id': id,
      'oai-authenticated-user-email': email,
    },
  });
void test('admin authorization requires server allowlist and authenticated identity', () => {
  assert.equal(
    requireAdmin(req('owner@example.org'), {
      ADMIN_EMAILS: 'owner@example.org',
    }).role,
    'admin',
  );
  assert.equal(accessRole(req('owner@example.org'), {}).role, 'viewer');
  assert.throws(() =>
    requireAdmin(req('', ''), {
      ADMIN_EMAILS: 'owner@example.org',
    }),
  );
});
void test('viewer and cross-origin verification requests are rejected', () => {
  assert.throws(() =>
    requireAdmin(req('viewer@example.org'), {
      ADMIN_EMAILS: 'owner@example.org',
    }),
  );
  assert.throws(() =>
    requireAdmin(req('owner@example.org', 'signed-in', 'https://evil.test'), {
      ADMIN_EMAILS: 'owner@example.org',
    }),
  );
});
void test('stable user ID allowlist takes precedence over display email', () => {
  assert.equal(
    accessRole(req('owner@example.org'), {
      ADMIN_USER_IDS: 'different',
      ADMIN_EMAILS: 'owner@example.org',
    }).role,
    'viewer',
  );
});
void test('admin candidate acceptance cannot smuggle a human-verified state', () => {
  const p = parsed();
  p.verificationStatus = 'human-verified';
  const next = approvePublication(
    data,
    p,
    'Inspected bibliographic record',
    'https://vault.test/api/imports',
  );
  assert.equal(next.publications.at(-1)?.verificationStatus, 'machine-curated');
  assert.equal(data.publications.length + 1, next.publications.length);
});
void test('import preview does not mutate catalogue and preserves source BibTeX provenance', () => {
  const before = JSON.stringify(data);
  const p = parseBibtex(bib, data.publications, 'library.bib');
  assert.equal(JSON.stringify(data), before);
  assert.equal(p.candidates[0].publication.originalBibtex, bib);
  assert.equal(
    p.candidates[0].publication.importProvenance?.[0].filename,
    'library.bib',
  );
});
void test('export scopes include only requested publication associations', () => {
  const t = data.techniques[0];
  const scope = exportScope(data, 'technique', [t.id]);
  assert.deepEqual(
    scope.techniques.map((x) => x.id),
    [t.id],
  );
  assert.ok(
    scope.publications.every((p) =>
      data.techniquePublications.some(
        (a) => a.publicationId === p.id && a.techniqueId === t.id,
      ),
    ),
  );
  assert.equal(
    exportScope(data, 'all-publications').publications.length,
    data.publications.length,
  );
});
void test('PDF/Crossref conflicts preserve both source values', () => {
  const a = parsed(),
    b = { ...a, title: 'Conflicting title' };
  const c = metadataConflicts(a, b);
  assert.equal(c[0].pdf, a.title);
  assert.equal(c[0].lookup, b.title);
});
void test('reference proposals are cites only, need review, and retain provenance', () => {
  const a = data.publications[0],
    b = data.publications[1];
  const next = proposeCitations(
    data,
    a.id,
    [
      {
        raw: 'Reference fixture',
        doi: b.doi,
        title: b.title,
        year: b.year,
        matchedPublicationId: b.id,
        matchMethod: 'DOI',
      },
    ],
    'https://dl.acm.org/doi/example',
    'ACM-DL',
    new Date().toISOString(),
  );
  const added = next.publicationRelationships.filter(
    (r) => !data.publicationRelationships.some((x) => x.id === r.id),
  );
  assert.ok(
    added.every(
      (r) =>
        r.type === 'cites' &&
        r.status === 'needs-evidence' &&
        r.verificationStatus === 'machine-curated',
    ),
  );
  validateCatalogue(next);
});
void test('cached reference requests reuse results and explicit refresh refetches', async () => {
  const { cachedReferences } = await import('../lib/reference-providers.ts');
  let value: import('../lib/reference-providers.ts').ReferenceRetrieval | null =
    null;
  let calls = 0,
    reservations = 0;
  const store = {
    get: async () => value,
    put: async (
      _id: string,
      v: import('../lib/reference-providers.ts').ReferenceRetrieval,
    ) => {
      value = v;
    },
    reserve: async () => {
      reservations++;
      return true;
    },
  };
  const p = { ...parsed(), doi: '10.1145/123' };
  const fetcher: typeof fetch = async () => {
    calls++;
    return new Response(
      '<ol class="references"><li>Fixture 10.1234/example</li></ol>',
    );
  };
  await cachedReferences(store, referenceProviders[0], p, [], false, fetcher);
  await cachedReferences(store, referenceProviders[0], p, [], false, fetcher);
  assert.equal(calls, 1);
  assert.equal(reservations, 1);
  await cachedReferences(store, referenceProviders[0], p, [], true, fetcher);
  assert.equal(calls, 2);
});
void test('publisher metadata parser reads only explicit citation tags', async () => {
  const { publicArticleMetadata } =
    await import('../lib/reference-providers.ts');
  assert.deepEqual(
    publicArticleMetadata(
      '<meta name="citation_title" content="Fixture"><meta content="Jane Smith" name="citation_author"><meta name="citation_publication_date" content="2020/01/01">',
    ),
    {
      title: 'Fixture',
      authors: ['Jane Smith'],
      year: 2020,
      doi: null,
      venue: null,
    },
  );
});
void test('JSON technique import demotes verification and prevents duplicate replacement', async () => {
  const { techniqueCandidate, approveTechnique } =
    await import('../lib/technique-import.ts');
  const t = structuredClone(data.techniques[0]);
  t.verificationStatus = 'human-verified';
  const c = techniqueCandidate(t, data, 'https://vault.test/api/imports');
  assert.equal(c.technique.verificationStatus, 'machine-curated');
  assert.equal(c.status, 'potential-duplicate');
  assert.throws(
    () =>
      approveTechnique(data, t, 'reviewed', 'https://vault.test/api/imports'),
    /Existing technique/,
  );
});
void test('PDF.js reads actual embedded PDF bytes before heuristic extraction', async () => {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const content =
    'BT /F1 12 Tf 40 740 Td (Offline fixture publication) Tj 0 -20 Td (DOI: 10.1234/pdf-fixture) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, '0') + ' 00000 n ')
    .join(
      '\n',
    )}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const task = getDocument({
    data: new TextEncoder().encode(pdf),
    useSystemFonts: true,
  });
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const text = (await page.getTextContent()).items
      .map((i) => ('str' in i ? i.str : ''))
      .join('\n');
    assert.match(text, /Offline fixture publication/);
    assert.equal(
      extractPdfText(text, [], 'fixture.pdf').publication.doi,
      '10.1234/pdf-fixture',
    );
  } finally {
    await task.destroy();
  }
});
void test('BibTeX source slices stay per-entry for same-line bibliographies', () => {
  const preview = parseBibtex('@misc{a,title={First}} @misc{b,title={Second}}');
  assert.equal(preview.candidates.length, 2);
  assert.equal(
    preview.candidates[0].publication.originalBibtex,
    '@misc{a,title={First}}',
  );
  assert.equal(
    preview.candidates[1].publication.originalBibtex,
    '@misc{b,title={Second}}',
  );
});
void test('admin curation can verify a DOI-only imported publication with explicit evidence', async () => {
  const { applyCuration } = await import('../lib/curation.ts');
  const p = parsed();
  const catalogue = approvePublication(
    data,
    p,
    'Bibliography reviewed',
    'https://vault.test/api/imports',
  );
  const result = applyCuration(catalogue, {
    id: 'fixture-confirm-doi',
    reviewer: 'Fixture Curator',
    reviewerId: 'fixture-admin',
    adminId: 'fixture-admin',
    timestamp: '2026-08-30T12:00:00Z',
    date: '2026-08-30',
    decision: 'confirm',
    entityType: 'publication',
    entityId: p.id,
    field: null,
    value: null,
    notes: 'Synthetic fixture test, not real scientific verification',
    evidence: [
      {
        publicationId: p.id,
        section: 'Fixture',
        page: null,
        quote: null,
        notes: 'Fixture evidence',
      },
    ],
  });
  assert.equal(
    result.publications.at(-1)?.verificationStatus,
    'human-verified',
  );
  assert.deepEqual(result.publications.at(-1)?.verification.sources, [
    'https://doi.org/10.1234/example',
  ]);
});
