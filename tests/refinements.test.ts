import { parseBibtex } from '../lib/bibtex-parser.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  normalizeVerification,
  validateVerification,
  verificationDefinitions,
} from '../lib/verification.ts';
import { newPublication, bibtexExport } from '../lib/bibliography.ts';
import { accessRole, requireAdmin } from '../lib/auth.ts';
import { validateCatalogue } from '../lib/catalogue.ts';
import { validateShape, publicationShape } from '../lib/schema.ts';
import { publicationVenueTypes, bibtexType } from '../lib/publication-venue.ts';
import {
  recordVisit,
  publicVisits,
  sessionVisit,
  createVisitReporter,
  validateVisitInput,
  type VisitDatabase,
  type VisitStatement,
} from '../lib/analytics.ts';
import { helpTopics } from '../lib/help.ts';
import {
  graphLayoutOptions,
  graph3d,
  defaultGraphOptions,
} from '../lib/graph3d.ts';
const data = validateCatalogue(
  JSON.parse(
    fs.readFileSync(
      new URL('../data/techniques.json', import.meta.url),
      'utf8',
    ),
  ),
);
const pub = () =>
  newPublication('test-publication', {
    source: 'bibtex-upload',
    filename: 'test.bib',
    originalKey: 'test',
    timestamp: '2026-08-30T12:00:00Z',
    url: null,
  });
void test('machine factories contain no human verifier or date', () => {
  const p = pub();
  assert.equal(p.verificationStatus, 'machine-curated');
  assert.equal(p.verification.verifiedBy, null);
  assert.equal(p.verification.verifiedDate, null);
  validateVerification(p);
  assert.throws(() =>
    validateVerification({
      ...p,
      verification: { ...p.verification, verifiedBy: 'Import parser' },
    }),
  );
});
void test('verification migration is idempotent and preserves previous attribution in provenance', () => {
  const old = structuredClone(data);
  const p = old.publications[0];
  p.verificationStatus = 'machine-curated';
  p.verification.verifiedBy = 'Import parser';
  p.verification.verifiedDate = '2026-08-30';
  const migrated = normalizeVerification(old);
  assert.equal(migrated.publications[0].verification.verifiedBy, null);
  assert.match(
    migrated.publications[0].provenance.at(-1)!.notes,
    /Import parser/,
  );
  assert.deepEqual(normalizeVerification(migrated), migrated);
  assert.deepEqual(migrated.curationDecisions, old.curationDecisions);
  validateCatalogue(migrated);
});
void test('human verification survives migration unchanged', () => {
  const d = structuredClone(data);
  d.publications[0].verificationStatus = 'human-verified';
  d.publications[0].verification = {
    verifiedBy: 'Research Curator',
    verifiedDate: '2026-08-30',
    sources: ['https://example.org/paper'],
    notes: 'Explicit fixture verification',
  };
  assert.deepEqual(normalizeVerification(d).publications[0], d.publications[0]);
});
const request = (id: string, email = '') =>
  new Request('https://vault.test/api/curation', {
    method: 'POST',
    headers: {
      origin: 'https://vault.test',
      'oai-authenticated-user-id': id,
      'oai-authenticated-user-email': email,
    },
  });
void test('configured stable admin ID works without email', () => {
  assert.equal(
    requireAdmin(request('owner-id'), {
      ADMIN_USER_IDS: 'owner-id',
      ADMIN_EMAILS: 'someone@example.org',
    }).role,
    'admin',
  );
  assert.equal(
    accessRole(request('wrong', 'someone@example.org'), {
      ADMIN_USER_IDS: 'owner-id',
      ADMIN_EMAILS: 'someone@example.org',
    }).role,
    'viewer',
  );
});
void test('email fallback only applies without configured IDs', () => {
  assert.equal(
    accessRole(request('', 'OWNER@example.org'), {
      ADMIN_EMAILS: 'owner@example.org',
    }).role,
    'admin',
  );
  assert.equal(accessRole(request('owner-id'), {}).role, 'viewer');
});
void test('venue forms round trip through every requested BibTeX type', () => {
  for (const [type, venue] of Object.entries({
    article: 'journal',
    inproceedings: 'conference',
    book: 'book',
    incollection: 'book-chapter',
    phdthesis: 'thesis',
    mastersthesis: 'thesis',
    techreport: 'technical-report',
    misc: 'unknown',
  })) {
    const p = parseBibtex(`@${type}{key,title={Fixture},year={2020}}`)
      .candidates[0].publication;
    assert.equal(p.publicationVenueType, venue);
    assert.equal(bibtexType(p), type);
    const roundtrip = parseBibtex(bibtexExport([p])).candidates[0].publication;
    assert.equal(roundtrip.publicationVenueType, venue);
    assert.equal(roundtrip.bibliographic?.entryType, type);
  }
});
void test('document category does not invent venue type or thesis degree', () => {
  const p = pub();
  p.publicationType = 'survey';
  assert.equal(bibtexType(p), 'misc');
  p.publicationVenueType = 'journal';
  assert.equal(bibtexType(p), 'article');
  p.publicationVenueType = 'thesis';
  assert.equal(bibtexType(p), 'misc');
  for (const t of publicationVenueTypes)
    validateShape({ ...p, publicationVenueType: t }, publicationShape);
  assert.throws(() =>
    validateShape({ ...p, publicationVenueType: 'guessed' }, publicationShape),
  );
});
function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    fs.readFileSync(
      new URL('../drizzle/0003_fast_alex_power.sql', import.meta.url),
      'utf8',
    ),
  );
  const statements = new WeakMap<
    VisitStatement,
    { sql: string; args: (string | number)[] }
  >();
  const db: VisitDatabase = {
    prepare(sql) {
      const metadata = { sql, args: [] as (string | number)[] };
      const statement: VisitStatement = {
        bind(...args) {
          metadata.args = args;
          return statement;
        },
        async first<T>() {
          return (sqlite.prepare(sql).get(...metadata.args) ||
            null) as T | null;
        },
      };
      statements.set(statement, metadata);
      return statement;
    },
    async batch(items) {
      sqlite.exec('BEGIN');
      try {
        const results = items.map((s) => {
          const m = statements.get(s)!;
          return sqlite.prepare(m.sql).run(...m.args);
        });
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { db, sqlite };
}
const session = '12345678-1234-4123-8123-123456789012';
void test('real counter starts at zero and counts a session once despite concurrent repeats', async () => {
  const { db, sqlite } = database();
  try {
    assert.equal((await publicVisits(db)).total, 0);
    await Promise.all(
      Array.from({ length: 10 }, () =>
        recordVisit(db, session, new Date('2026-08-30T12:00:00Z')),
      ),
    );
    assert.equal((await publicVisits(db)).total, 1);
    assert.equal(
      sqlite.prepare('SELECT total FROM visit_daily').get()!.total,
      1,
    );
  } finally {
    sqlite.close();
  }
});
void test('new UTC day counts once; old deduplication hashes expire without losing aggregate totals', async () => {
  const { db, sqlite } = database();
  try {
    await recordVisit(db, session, new Date('2026-08-28T12:00:00Z'));
    await recordVisit(db, session, new Date('2026-08-30T12:00:00Z'));
    assert.equal((await publicVisits(db)).total, 2);
    assert.equal(
      sqlite.prepare('SELECT count(*) AS n FROM visit_sessions').get()!.n,
      1,
    );
    assert.equal(
      sqlite.prepare('SELECT count(*) AS n FROM visit_daily').get()!.n,
      2,
    );
  } finally {
    sqlite.close();
  }
});
void test('rerender/remount reporting shares one promise and failures remain nonfatal', async () => {
  const report = createVisitReporter();
  let calls = 0;
  const call = () => {
    calls++;
    return Promise.resolve({ total: 1 });
  };
  await Promise.all([report(call), report(call), report(call)]);
  assert.equal(calls, 1);
  const failed = createVisitReporter();
  assert.equal(await failed(() => Promise.reject(new Error('offline'))), null);
});
void test('internal navigation and reload reuse the anonymous tab session identifier', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  assert.equal(
    sessionVisit(storage, '2026-08-30', () => session).sessionId,
    sessionVisit(storage, '2026-08-30', () => crypto.randomUUID()).sessionId,
  );
});
void test('public callers cannot set analytics totals or supply personal information', () => {
  assert.equal(validateVisitInput({ sessionId: session }), session);
  assert.throws(() => validateVisitInput({ sessionId: session, total: 9000 }));
  assert.throws(() =>
    validateVisitInput({ sessionId: session, email: 'person@example.org' }),
  );
  assert.throws(() => validateVisitInput({ total: 500 }));
});
void test('how-to topics reuse exact verification definitions and cover all primary workflows', () => {
  const copy = helpTopics.map((t) => t.text).join(' ');
  for (const definition of Object.values(verificationDefinitions))
    assert.ok(copy.includes(definition));
  for (const id of [
    'find-technique',
    'find-publication',
    'surveys',
    'compare',
    'graph',
    'modes',
    'relationships',
    'verification',
    'exports',
    'imports',
    'similarity',
    'privacy',
  ])
    assert.ok(helpTopics.some((t) => t.id === id));
  assert.equal(new Set(helpTopics.map((t) => t.id)).size, helpTopics.length);
});
void test('Interaction Tasks replaces Research Families; future Technique Families is unavailable', () => {
  assert.ok(
    graphLayoutOptions.some(
      (l) => l.name === 'Interaction Tasks' && l.available,
    ),
  );
  assert.ok(
    graphLayoutOptions.some(
      (l) => l.name === 'Technique Families' && !l.available,
    ),
  );
  const empty = graph3d(data, {
    ...defaultGraphOptions,
    query: 'no-matching-fixture-string',
  });
  assert.equal(empty.nodes.length, 0);
  assert.ok(
    graph3d(data, { ...defaultGraphOptions, layout: 'Interaction Tasks' }).nodes
      .length > 0,
  );
});
