import { catalogueShape, validateShape } from './schema.ts';
import {
  emptyCatalogue,
  type Catalogue,
  type Technique,
  type Publication,
  type Evidence,
  type Provenance,
} from './model.ts';
export * from './model.ts';
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
export const doiKey = (s: string) => s.trim().toLowerCase();
export function publicationKey(p: Publication): string | null {
  return p.doi
    ? `doi:${doiKey(p.doi)}`
    : p.title && p.authors.length && p.year !== null
      ? `citation:${normalize(p.title)}|${p.authors.map(normalize).join('|')}|${p.year}`
      : null;
}
function unique<T>(items: T[], key: (x: T) => string, label: string) {
  const found = new Set<string>();
  for (const item of items) {
    const k = key(item);
    if (found.has(k)) throw new Error(`Duplicate ${label}: ${k}`);
    found.add(k);
  }
}
export function validateCatalogue(
  input: unknown,
  options: { references?: boolean } = {},
): Catalogue {
  validateShape(input, catalogueShape);
  const d = input as Catalogue;
  unique(d.techniques, (t) => t.id, 'technique ID');
  unique(d.publications, (p) => p.id, 'publication ID');
  unique(d.reviewQueue, (r) => r.id, 'review ID');
  const named = new Map<string, string>();
  for (const t of d.techniques) {
    if (!t.tasks.includes(t.primaryTask))
      throw new Error(`${t.id}: primaryTask must belong to tasks.`);
    if (
      t.interactionDistance?.includes('not-applicable') &&
      t.interactionDistance.length > 1
    )
      throw new Error(`${t.id}: not-applicable distance cannot be combined.`);
    for (const name of [t.name, ...t.aliases]) {
      const k = normalize(name);
      if (named.has(k))
        throw new Error(
          `Duplicate technique name/alias ${name}: ${named.get(k)} / ${t.id}`,
        );
      named.set(k, t.id);
    }
    unique(
      t.relationships,
      (r) => `${r.type}|${r.techniqueId}`,
      `${t.id} relationship`,
    );
    unique(t.implementations, (i) => i.id, `${t.id} implementation ID`);
    for (const r of t.relationships) {
      if (r.techniqueId === t.id)
        throw new Error(`${t.id}: self relationship.`);
      if (!['conceptually-related'].includes(r.type) && !r.evidence.length)
        throw new Error(`${t.id}: ${r.type} requires evidence.`);
    }
    for (const i of t.implementations)
      if (!i.evidence.length)
        throw new Error(
          `${t.id}: implementation ${i.id} requires publication evidence.`,
        );
    if (
      t.introducedYear !== null &&
      !d.techniquePublications.some(
        (l) =>
          l.techniqueId === t.id &&
          l.relationship === 'introduced' &&
          l.evidence.length,
      )
    )
      throw new Error(
        `${t.id}: introducedYear requires an evidenced introduced association.`,
      );
  }
  const publicationKeys = d.publications
    .map((p) => ({ p, key: publicationKey(p) }))
    .filter((x) => x.key !== null);
  unique(
    publicationKeys,
    (x) => x.key!,
    'publication DOI/title-author-year identity',
  );
  for (const r of [...d.techniques, ...d.publications]) {
    if (
      r.verificationStatus !== 'migrated' &&
      (!r.verification.verifiedBy ||
        !r.verification.verifiedDate ||
        !r.verification.sources.length ||
        !r.verification.notes)
    )
      throw new Error(
        `${r.id}: verified status requires actor, date, sources and scope notes.`,
      );
    if (
      r.verificationStatus === 'human-verified' &&
      r.verification.verifiedBy &&
      /^(codex|machine|automated|ai)(\b|:)/i.test(r.verification.verifiedBy)
    )
      throw new Error(
        `${r.id}: automated actors cannot assert human verification.`,
      );
  }
  unique(
    d.techniquePublications,
    (l) => `${l.techniqueId}|${l.publicationId}|${l.relationship}`,
    'technique-publication link',
  );
  for (const l of d.techniquePublications)
    if (l.relationship !== 'unclassified' && !l.evidence.length)
      throw new Error(
        `${l.techniqueId}: classified publication role requires evidence.`,
      );
  unique(
    d.publicationCitations,
    (l) =>
      `${l.citingPublicationId}|${l.citedPublicationId}|${l.discoveryMethod}`,
    'publication citation',
  );
  if (options.references !== false) assertRelations(d);
  return d;
}
export function assertRelations(d: Catalogue): void {
  const t = new Set(d.techniques.map((x) => x.id)),
    p = new Set(d.publications.map((x) => x.id));
  const requireId = (set: Set<string>, id: string, where: string) => {
    if (!set.has(id))
      throw new Error(`${where}: reference to nonexistent record ${id}`);
  };
  const evidence = (list: Evidence[], where: string) =>
    list.forEach((e) => requireId(p, e.publicationId, where));
  const provenance = (list: Provenance[], where: string) =>
    list.forEach((e) => {
      if (e.discoveredFromPublicationId)
        requireId(p, e.discoveredFromPublicationId, where);
    });
  for (const x of d.techniques) {
    for (const r of x.relationships) {
      requireId(t, r.techniqueId, x.id);
      evidence(r.evidence, x.id);
    }
    evidence(x.evidence, x.id);
    x.implementations.forEach((i) => evidence(i.evidence, x.id));
    provenance(x.provenance, x.id);
  }
  for (const x of d.publications) provenance(x.provenance, x.id);
  for (const l of d.techniquePublications) {
    requireId(t, l.techniqueId, 'technique-publication');
    requireId(p, l.publicationId, 'technique-publication');
    evidence(l.evidence, 'technique-publication');
  }
  for (const l of d.publicationCitations) {
    requireId(p, l.citingPublicationId, 'citation');
    requireId(p, l.citedPublicationId, 'citation');
    if (l.citedPublicationId === l.citingPublicationId)
      throw new Error('Self publication citation');
    evidence(l.evidence, 'citation');
  }
  for (const r of d.reviewQueue)
    requireId(r.entityType === 'technique' ? t : p, r.entityId, 'review queue');
}
export function mergeCatalogue(
  current: Catalogue,
  incoming: unknown,
): Catalogue {
  validateCatalogue(current);
  const batch = validateCatalogue(incoming, { references: false });
  for (const t of batch.techniques)
    if (current.techniques.some((x) => x.id === t.id))
      throw new Error(
        `Technique ID ${t.id} already exists; additive import never overwrites.`,
      );
  const merged: Catalogue = {
    schemaVersion: 2,
    techniques: [...current.techniques, ...batch.techniques],
    publications: [...current.publications, ...batch.publications],
    techniquePublications: [
      ...current.techniquePublications,
      ...batch.techniquePublications,
    ],
    publicationCitations: [
      ...current.publicationCitations,
      ...batch.publicationCitations,
    ],
    reviewQueue: [...current.reviewQueue, ...batch.reviewQueue],
  };
  return validateCatalogue(merged);
}
export type Filters = {
  query: string;
  category: string;
  task: string;
  modality: string;
  device: string;
  environment: string;
  distance: string;
  dof: string;
  verification: string;
  implementation: string;
  from: string;
  to: string;
};
export const emptyFilters: Filters = {
  query: '',
  category: 'all',
  task: 'all',
  modality: 'all',
  device: 'all',
  environment: 'all',
  distance: 'all',
  dof: 'all',
  verification: 'all',
  implementation: 'all',
  from: '',
  to: '',
};
export function publicationsFor(d: Catalogue, id: string) {
  const byId = new Map(d.publications.map((p) => [p.id, p]));
  return d.techniquePublications
    .filter((l) => l.techniqueId === id)
    .map((l) => ({ link: l, publication: byId.get(l.publicationId)! }));
}
export function buildSearchIndex(d: Catalogue): Map<string, string> {
  const pub = new Map(
    d.publications.map((p) => [
      p.id,
      [p.title, ...p.authors, p.venue, p.doi, p.year, ...p.legacyCitations]
        .filter((x) => x !== null)
        .join(' '),
    ]),
  );
  const associations = new Map<string, string[]>();
  for (const l of d.techniquePublications) {
    const list = associations.get(l.techniqueId) ?? [];
    list.push(pub.get(l.publicationId) ?? '');
    associations.set(l.techniqueId, list);
  }
  return new Map(
    d.techniques.map((t) => [
      t.id,
      normalize(
        [
          t.name,
          ...t.aliases,
          t.description,
          ...t.tags,
          ...t.tasks,
          ...t.interactionModalities,
          ...t.inputDevices,
          t.modalityDetails,
          t.deviceDetails,
          ...Object.values(t.taxonomy).flat(),
          ...(t.interactionDistance ?? []),
          ...t.advantages,
          ...t.limitations,
          t.howItWorks,
          ...(associations.get(t.id) ?? []),
        ]
          .filter((x) => x !== null)
          .join(' '),
      ),
    ]),
  );
}
export function filterTechniques(
  d: Catalogue,
  f: Filters,
  index = buildSearchIndex(d),
): Technique[] {
  const terms = normalize(f.query).split(/\s+/).filter(Boolean);
  return d.techniques.filter(
    (t) =>
      terms.every((term) => index.get(t.id)?.includes(term)) &&
      (f.category === 'all' || t.primaryTask === f.category) &&
      (f.task === 'all' ||
        t.tasks.includes(f.task as Technique['primaryTask'])) &&
      (f.modality === 'all' ||
        t.interactionModalities.some((m) => m === f.modality)) &&
      (f.device === 'all' || t.inputDevices.includes(f.device)) &&
      (f.environment === 'all' ||
        (f.environment === 'unknown'
          ? t.taxonomy.environment === null
          : t.taxonomy.environment?.some((v) => v === f.environment))) &&
      (f.distance === 'all' ||
        (f.distance === 'unknown'
          ? t.interactionDistance === null
          : t.interactionDistance?.some((v) => v === f.distance))) &&
      (f.dof === 'all' || String(t.degreesOfFreedom ?? 'unknown') === f.dof) &&
      (f.verification === 'all' || t.verificationStatus === f.verification) &&
      (f.implementation === 'all' ||
        (f.implementation === 'yes'
          ? t.implementations.length > 0
          : t.implementations.length === 0)) &&
      (!f.from ||
        (t.introducedYear !== null && t.introducedYear >= Number(f.from))) &&
      (!f.to ||
        (t.introducedYear !== null && t.introducedYear <= Number(f.to))),
  );
}
export function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value))
    return value.length ? value.map(displayValue).join(', ') : '—';
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  )
    return String(value);
  return JSON.stringify(value) ?? '—';
}
export function comparisonData(d: Catalogue, ids: string[]) {
  if (ids.length < 2 || ids.length > 6 || new Set(ids).size !== ids.length)
    throw new Error('Compare requires 2–6 distinct techniques.');
  const techniques = ids.map((id) => {
    const t = d.techniques.find((t) => t.id === id);
    if (!t) throw new Error(`Unknown technique ${id}`);
    return t;
  });
  const fields: [string, (t: Technique) => unknown][] = [
    ['Primary task', (t) => t.primaryTask],
    ['Supported tasks', (t) => t.tasks],
    ['Modalities', (t) => t.interactionModalities],
    ['Input devices', (t) => t.inputDevices],
    ['Distance', (t) => t.interactionDistance],
    ['Degrees of freedom', (t) => t.degreesOfFreedom],
    ['Environment', (t) => t.taxonomy.environment],
    ['Target properties', (t) => t.taxonomy.targetProperties],
    ['Selection mechanism', (t) => t.taxonomy.selectionMechanism],
    ['Control mapping', (t) => t.taxonomy.controlMapping],
    ['Confirmation method', (t) => t.taxonomy.confirmationMethod],
    ['Introduction year', (t) => t.introducedYear],
    [
      'Introduced in (evidence)',
      (t) =>
        publicationsFor(d, t.id)
          .filter((p) => p.link.relationship === 'introduced')
          .map((p) => p.publication.title ?? p.publication.id),
    ],
    ['Verification', (t) => t.verificationStatus],
    ['Implementations', (t) => t.implementations.map((i) => i.name)],
  ];
  return {
    techniques,
    rows: fields.map(([label, get]) => ({
      label,
      values: techniques.map((t) => displayValue(get(t))),
    })),
  };
}
export function emptyImport(): Catalogue {
  return emptyCatalogue();
}
