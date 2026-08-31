import { validateVerification } from './verification.ts';
import type { Catalogue, EntityType, Evidence, Provenance } from './model.ts';
import { symmetricRelationshipTypes } from './model.ts';
export function entityExists(
  d: Catalogue,
  type: EntityType,
  id: string,
): boolean {
  switch (type) {
    case 'technique':
      return d.techniques.some((t) => t.id === id);
    case 'publication':
      return d.publications.some((p) => p.id === id);
    case 'publication-relationship':
      return d.publicationRelationships.some((r) => r.id === id);
    case 'technique-relationship':
      return d.techniques.some((t) => t.relationships.some((r) => r.id === id));
    case 'implementation':
      return d.techniques.some((t) =>
        t.implementations.some((i) => i.id === id),
      );
    case 'claim':
      return d.claims.some((c) => c.id === id);
    case 'similarity':
      return d.publicationSimilarities.some((s) => s.id === id);
    case 'candidate':
      return d.candidateLiterature.some((c) => c.id === id);
  }
}
export function validateGraph(d: Catalogue, references = true) {
  const unique = (items: string[], label: string) => {
    if (new Set(items).size !== items.length)
      throw new Error(`Duplicate ${label}`);
  };
  unique(
    d.publicationRelationships.map((r) => r.id),
    'publication relationship ID',
  );
  unique(
    d.claims.map((c) => c.id),
    'claim ID',
  );
  unique(
    d.curationDecisions.map((c) => c.id),
    'curation decision ID',
  );
  unique(
    d.candidateLiterature.map((c) => c.id),
    'candidate ID',
  );
  unique(
    d.publicationSimilarities.map((s) => s.id),
    'similarity ID',
  );
  unique(
    d.techniques.flatMap((t) => t.relationships.map((r) => r.id)),
    'technique relationship ID',
  );
  unique(
    d.techniques.flatMap((t) => t.implementations.map((i) => i.id)),
    'implementation ID',
  );
  const pair = (a: string, b: string) => [a, b].sort().join('|');
  unique(
    d.publicationRelationships.map(
      (r) =>
        `${r.type}|${(symmetricRelationshipTypes as readonly string[]).includes(r.type) ? pair(r.sourcePublicationId, r.targetPublicationId) : r.sourcePublicationId + '|' + r.targetPublicationId}`,
    ),
    'semantic relationship',
  );
  const evidence = (es: Evidence[]) => {
    for (const e of es) {
      if (!e.page && !e.section && !e.quote && !e.notes)
        throw new Error('Evidence needs a location or scope note');
      if (references && !d.publications.some((p) => p.id === e.publicationId))
        throw new Error('Evidence references nonexistent publication');
    }
  };
  const provenance = (ps: Provenance[]) => {
    if (references)
      for (const p of ps)
        if (
          p.discoveredFromPublicationId &&
          !entityExists(d, 'publication', p.discoveredFromPublicationId)
        )
          throw new Error('Provenance references nonexistent publication');
  };
  const verified = validateVerification;
  for (const r of d.publicationRelationships) {
    if (r.sourcePublicationId === r.targetPublicationId)
      throw new Error('Self publication relationship');
    if (
      (symmetricRelationshipTypes as readonly string[]).includes(r.type) &&
      r.sourcePublicationId > r.targetPublicationId
    )
      throw new Error(
        'Symmetric relationships require canonical sorted endpoints',
      );
    if (r.type !== 'cites' && !r.evidence.length)
      throw new Error(`${r.type} requires evidence`);
    if (
      references &&
      (!entityExists(d, 'publication', r.sourcePublicationId) ||
        !entityExists(d, 'publication', r.targetPublicationId))
    )
      throw new Error(
        'Publication relationship references nonexistent publication',
      );
    evidence(r.evidence);
    provenance(r.provenance);
    verified(r);
  }
  unique(
    d.publicationSimilarities.map((s) =>
      pair(s.publicationAId, s.publicationBId),
    ),
    'similarity pair',
  );
  for (const s of d.publicationSimilarities) {
    if (s.publicationAId >= s.publicationBId)
      throw new Error(
        'Similarity must be symmetric with canonical distinct endpoints',
      );
    if (!s.reasons.length) throw new Error('Similarity needs explanation');
    if (
      references &&
      (!entityExists(d, 'publication', s.publicationAId) ||
        !entityExists(d, 'publication', s.publicationBId))
    )
      throw new Error('Similarity references nonexistent publication');
    if (Object.values(s.provenance.weights).every((w) => w === 0))
      throw new Error('Similarity weights cannot all be zero');
  }
  for (const c of d.claims) {
    if (references && !entityExists(d, c.entityType, c.entityId))
      throw new Error('Claim references nonexistent entity');
    if (
      c.status === 'confirmed' &&
      (c.verificationStatus !== 'human-verified' || !c.evidence.length)
    )
      throw new Error(
        'Confirmed claim requires human verification and evidence',
      );
    evidence(c.evidence);
    verified(c);
  }
  for (const c of d.curationDecisions) {
    if (references && !entityExists(d, c.entityType, c.entityId))
      throw new Error('Curation decision references nonexistent entity');
    if (
      ['useful', 'misleading'].includes(c.decision) !==
      (c.entityType === 'similarity')
    )
      throw new Error(
        'Similarity feedback is separate from scientific verification',
      );
    if (c.decision === 'confirm' && !c.evidence.length)
      throw new Error('Confirmation requires evidence');
    if (/^(codex|machine|automated|ai)(\b|:)/i.test(c.reviewer))
      throw new Error('Curation requires a human reviewer');
    evidence(c.evidence);
  }
  for (const t of d.techniques) {
    for (const r of t.relationships) {
      provenance(r.provenance);
      if (
        r.relationshipSource === 'legacy-editorial' &&
        r.type !== 'conceptually-related'
      )
        throw new Error('Legacy editorial links cannot assert lineage');
    }
    for (const i of t.implementations) evidence(i.scientificBasis);
  }
  if (references)
    for (const r of d.reviewQueue)
      if (!entityExists(d, r.entityType, r.entityId))
        throw new Error('Review references nonexistent entity');
}
