import type { Catalogue, PublicationRelationship } from './model.ts';
import type { ReferenceCandidate } from './pdf-extraction.ts';
export function proposeCitations(
  data: Catalogue,
  sourceId: string,
  references: ReferenceCandidate[],
  sourceUrl: string,
  provider: string,
  timestamp: string,
) {
  const next = structuredClone(data);
  if (!next.publications.some((p) => p.id === sourceId))
    throw new Error('Unknown citing publication');
  for (const ref of references) {
    const target = ref.matchedPublicationId;
    if (
      !target ||
      target === sourceId ||
      !next.publications.some((p) => p.id === target)
    )
      continue;
    if (
      next.publicationRelationships.some(
        (r) =>
          r.sourcePublicationId === sourceId &&
          r.targetPublicationId === target &&
          r.type === 'cites',
      )
    )
      continue;
    const id = `citation-${crypto.randomUUID()}`;
    const r: PublicationRelationship = {
      id,
      sourcePublicationId: sourceId,
      targetPublicationId: target,
      type: 'cites',
      status: 'needs-evidence',
      verificationStatus: 'machine-curated',
      verification: {
        verifiedBy: null,
        verifiedDate: null,
        sources: [sourceUrl],
        notes:
          'Reference match proposal; not a lineage inference or human verification.',
      },
      evidence: [
        {
          publicationId: sourceId,
          section: 'References',
          page: null,
          quote: ref.raw.slice(0, 180) || null,
          notes: `${provider}; matched using ${ref.matchMethod}.`,
        },
      ],
      provenance: [
        {
          source: sourceUrl,
          discoveryMethod: 'backward-citation',
          discoveredFromPublicationId: sourceId,
          retrievedAt: timestamp.slice(0, 10),
          notes: `${provider}; matched using ${ref.matchMethod}`,
        },
      ],
      notes: 'Candidate citation requires admin review',
    };
    next.publicationRelationships.push(r);
    next.reviewQueue.push({
      id: `review-${id}`,
      entityType: 'publication-relationship',
      entityId: id,
      reasons: ['Machine-extracted reference match requires review'],
      status: 'open',
    });
  }
  return next;
}
