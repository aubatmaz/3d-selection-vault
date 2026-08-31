import { bibtexType } from './publication-venue.ts';
import {
  emptyVerification,
  type Publication,
  type Catalogue,
  type ImportProvenance,
} from './model.ts';
import { publicationShape, validateShape } from './schema.ts';
export const normalizeTitle = (s: string) =>
  s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
export const normalizeDoi = (s: string | null | undefined) =>
  (s || '')
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .toLowerCase()
    .replace(/[.,;]+$/, '');
export function newPublication(
  id: string,
  source: ImportProvenance,
): Publication {
  return {
    id,
    title: null,
    authors: [],
    year: null,
    venue: null,
    doi: null,
    url: null,
    abstract: null,
    bibtex: null,
    legacyCitations: [],
    verificationStatus: 'machine-curated',
    verification: {
      ...emptyVerification(),
      verifiedBy: null,
      verifiedDate: null,
      sources: source.url ? [source.url] : [],
      notes: 'Machine extraction; not scientific verification.',
    },
    provenance: [
      {
        source: source.url,
        discoveryMethod: 'import',
        discoveredFromPublicationId: null,
        retrievedAt: source.timestamp.slice(0, 10),
        notes: `${source.source}: ${source.filename || 'input'}`,
      },
    ],
    access: 'metadata-only',
    legacyMetadata: null,
    methodology: null,
    keywords: [],
    publicationType: 'unknown',
    publicationVenueType: 'unknown',
    bibtexKey: null,
    originalBibtex: null,
    bibliographic: {
      entryType: null,
      journal: null,
      booktitle: null,
      volume: null,
      issue: null,
      pages: null,
      publisher: null,
    },
    importProvenance: [source],
  };
}
export function matchPublication(p: Publication, existing: Publication[]) {
  const doi = normalizeDoi(p.doi);
  const exact = doi ? existing.filter((x) => normalizeDoi(x.doi) === doi) : [];
  if (exact.length)
    return {
      status: 'exact-duplicate' as const,
      matches: exact.map((x) => x.id),
      reason: 'DOI',
    };
  const title = normalizeTitle(p.title || '');
  const potential = existing.filter(
    (x) =>
      (title && normalizeTitle(x.title || '') === title) ||
      (p.bibtexKey &&
        (x.bibtexKey === p.bibtexKey ||
          x.bibtexKey === p.importProvenance?.[0]?.originalKey)) ||
      (p.year &&
        p.year === x.year &&
        p.authors.length &&
        normalizeTitle(p.authors.join(' ')) ===
          normalizeTitle(x.authors.join(' '))),
  );
  return {
    status: potential.length
      ? ('potential-duplicate' as const)
      : ('new' as const),
    matches: potential.map((x) => x.id),
    reason: potential.length
      ? 'Title, authors/year, or key requires review'
      : null,
  };
}
export interface ImportCandidate {
  id: string;
  publication: Publication;
  status: 'new' | 'exact-duplicate' | 'potential-duplicate';
  matches: string[];
  reason: string | null;
}
export interface ImportPreview {
  techniqueCandidates?: import('./technique-import.ts').TechniqueCandidate[];
  candidates: ImportCandidate[];
  errors: { entry: number; message: string }[];
  metrics: {
    total: number;
    parsed: number;
    exactDuplicates: number;
    potentialDuplicates: number;
    errors: number;
    candidates: number;
  };
}
export function previewPublications(
  papers: Publication[],
  existing: Publication[],
  errors: ImportPreview['errors'] = [],
  total = papers.length,
): ImportPreview {
  const seen = [...existing];
  const candidates: ImportCandidate[] = [];
  for (const publication of papers) {
    try {
      validateShape(publication, publicationShape);
      const match = matchPublication(publication, seen);
      candidates.push({ id: publication.id, publication, ...match });
      seen.push(publication);
    } catch (e) {
      errors.push({
        entry: candidates.length + errors.length + 1,
        message: String(e),
      });
    }
  }
  return {
    candidates,
    errors,
    metrics: {
      total,
      parsed: candidates.length,
      exactDuplicates: candidates.filter((c) => c.status === 'exact-duplicate')
        .length,
      potentialDuplicates: candidates.filter(
        (c) => c.status === 'potential-duplicate',
      ).length,
      errors: errors.length,
      candidates: candidates.filter((c) => c.status !== 'exact-duplicate')
        .length,
    },
  };
}
const safeKey = (s: string) =>
  s.replace(/[^a-zA-Z0-9_:+.-]/g, '') || 'Publication';
export function bibtexExport(papers: Publication[]) {
  const keys = new Set<string>();
  return papers
    .map((p) => {
      const root = safeKey(
        p.bibtexKey ||
          `${p.authors[0]?.split(/[ ,]/)[0] || 'Unknown'}${p.year || 'Undated'}${p.title?.split(/\s+/).find((x) => x.length > 3) || 'Paper'}`,
      );
      let key = root;
      let n = 2;
      while (keys.has(key)) key = `${root}${n++}`;
      keys.add(key);
      const b = p.bibliographic;
      const type = bibtexType(p);
      const fields: Record<string, string | null | undefined> = {
        title: p.title,
        author: p.authors.join(' and '),
        year: p.year?.toString(),
        journal: b?.journal,
        booktitle: b?.booktitle,
        volume: b?.volume,
        number: b?.issue,
        pages: b?.pages,
        publisher: b?.publisher,
        doi: p.doi,
        url: p.url,
        abstract: p.abstract,
        keywords: p.keywords.join(', '),
      };
      return `@${type}{${key},\n${Object.entries(fields)
        .filter(([, v]) => v)
        .map(
          ([k, v]) =>
            `  ${k} = {${v!.replace(/[\r\n]+/g, ' ').replace(/(?<!\\)%/g, '\\%')}},`,
        )
        .join('\n')}\n}`;
    })
    .join('\n\n');
}
export function exportScope(
  d: Catalogue,
  scope: 'all-publications' | 'all-techniques' | 'publications' | 'technique',
  ids: string[] = [],
) {
  const techniques =
    scope === 'all-techniques'
      ? d.techniques
      : scope === 'technique'
        ? d.techniques.filter((t) => ids.includes(t.id))
        : [];
  const pubIds = new Set(
    scope === 'technique'
      ? d.techniquePublications
          .filter((a) => ids.includes(a.techniqueId))
          .map((a) => a.publicationId)
      : ids,
  );
  const publications =
    scope === 'all-publications'
      ? d.publications
      : scope === 'all-techniques'
        ? []
        : d.publications.filter((p) => pubIds.has(p.id));
  return { publications, techniques };
}
export function downloadRecords(
  records: { publications: Publication[]; techniques: Catalogue['techniques'] },
  format: 'json' | 'bib' | 'csv',
) {
  const status =
    typeof document !== 'undefined'
      ? document.getElementById('export-status')
      : null;
  const description = `${records.publications.length} publications and ${records.techniques.length} techniques`;
  if (status)
    status.textContent = `Preparing ${description} as ${format.toUpperCase()}…`;
  const csv = (v: unknown) =>
    `"${(typeof v === 'string' ? v : (JSON.stringify(v) ?? '')).replace(/"/g, '""')}"`;
  const text =
    format === 'bib'
      ? bibtexExport(records.publications)
      : format === 'json'
        ? JSON.stringify(records, null, 2)
        : [
            'id,title,authors,year,doi,publicationType,publicationVenueType,provenance',
            ...records.publications.map((p) =>
              [
                p.id,
                p.title,
                p.authors,
                p.year,
                p.doi,
                p.publicationType || 'unknown',
                p.publicationVenueType || 'unknown',
                p.importProvenance || p.provenance,
              ]
                .map(csv)
                .join(','),
            ),
            ...records.techniques.map((t) =>
              [
                t.id,
                t.name,
                '',
                t.earliestIdentifiedYear,
                '',
                'technique',
                '',
                t.provenance,
              ]
                .map(csv)
                .join(','),
            ),
          ].join('\n');
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/plain;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `vault-export.${format}`;
  a.click();
  if (status)
    status.textContent = `${description} sent to your browser as ${format.toUpperCase()}. Check Downloads if the file does not open.`;
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
