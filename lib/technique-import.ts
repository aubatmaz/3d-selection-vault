import type { Catalogue, Technique } from './model.ts';
import { techniqueShape, validateShape } from './schema.ts';
import { validateCatalogue } from './catalogue.ts';
import { normalizeTitle } from './bibliography.ts';
export interface TechniqueCandidate {
  id: string;
  technique: Technique;
  status: 'new' | 'potential-duplicate';
  matches: string[];
  reason: string | null;
}
export function techniqueCandidate(
  input: Technique,
  data: Catalogue,
  sourceUrl: string,
): TechniqueCandidate {
  const t = structuredClone(input);
  const timestamp = new Date().toISOString().slice(0, 10);
  t.verificationStatus = 'machine-curated';
  t.verification = {
    verifiedBy: null,
    verifiedDate: null,
    sources: [sourceUrl],
    notes:
      'Candidate technique imported from JSON; all scientific claims require admin review.',
  };
  t.provenance = [
    ...(t.provenance || []),
    {
      source: sourceUrl,
      discoveryMethod: 'import',
      discoveredFromPublicationId: null,
      retrievedAt: timestamp,
      notes:
        'JSON technique import. Original source file retained with the import job.',
    },
  ];
  if (t.introducedYear !== null) {
    t.legacyMetadata = {
      ...t.legacyMetadata,
      importedIntroductionClaim: {
        year: t.introducedYear,
        status: t.introductionStatus,
      },
    };
    t.introducedYear = null;
    t.introductionStatus = t.earliestIdentifiedYear
      ? 'earliest-identified'
      : 'not-established';
  }
  t.relationships = t.relationships.map((r) => ({
    ...r,
    status: 'needs-evidence',
    relationshipSource: 'machine-curated',
  }));
  validateShape(t, techniqueShape);
  const names = [t.name, ...t.aliases].map(normalizeTitle);
  const matches = data.techniques
    .filter(
      (x) =>
        x.id === t.id ||
        [x.name, ...x.aliases].some((n) => names.includes(normalizeTitle(n))),
    )
    .map((x) => x.id);
  return {
    id: `technique-${crypto.randomUUID()}`,
    technique: t,
    status: matches.length ? 'potential-duplicate' : 'new',
    matches,
    reason: matches.length
      ? 'Existing technique ID or name; review without destructive merging'
      : null,
  };
}
export function approveTechnique(
  data: Catalogue,
  input: Technique,
  notes: string,
  sourceUrl: string,
) {
  if (!notes.trim()) throw new Error('Review notes required');
  const c = techniqueCandidate(input, data, sourceUrl);
  if (c.matches.length)
    throw new Error(
      'Existing technique matches this record; edit the existing technique instead.',
    );
  const next = structuredClone(data);
  next.techniques.push(c.technique);
  next.reviewQueue.push({
    id: `review-${c.technique.id}`,
    entityType: 'technique',
    entityId: c.technique.id,
    reasons: ['Imported technique requires scientific verification'],
    status: 'open',
  });
  return validateCatalogue(next);
}
