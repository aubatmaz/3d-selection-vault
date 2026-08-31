import { normalizeVerification } from './verification.ts';
import { validateCatalogue, displayValue } from './catalogue.ts';
import { entityExists } from './graph-validation.ts';
import { computeSimilarities } from './research.ts';
import {
  emptyVerification,
  claimFields,
  type Catalogue,
  type CurationDecision,
  type EntityType,
  type JsonValue,
  type Evidence,
} from './model.ts';
export function getEntity(
  d: Catalogue,
  type: EntityType,
  id: string,
): Record<string, unknown> | undefined {
  const item =
    type === 'technique'
      ? d.techniques.find((t) => t.id === id)
      : type === 'publication'
        ? d.publications.find((p) => p.id === id)
        : type === 'claim'
          ? d.claims.find((c) => c.id === id)
          : type === 'publication-relationship'
            ? d.publicationRelationships.find((r) => r.id === id)
            : type === 'technique-relationship'
              ? d.techniques
                  .flatMap((t) => t.relationships)
                  .find((r) => r.id === id)
              : type === 'implementation'
                ? d.techniques
                    .flatMap((t) => t.implementations)
                    .find((i) => i.id === id)
                : type === 'candidate'
                  ? d.candidateLiterature.find((c) => c.id === id)
                  : d.publicationSimilarities.find((s) => s.id === id);
  return item as unknown as Record<string, unknown> | undefined;
}
export const editableFields: Record<EntityType, string[]> = {
  technique: [
    'name',
    'aliases',
    'description',
    'tasks',
    'primaryTask',
    'earliestIdentifiedYear',
    'introducedYear',
    'interactionModalities',
    'inputDevices',
    'interactionDistance',
    'degreesOfFreedom',
    'taxonomy',
    'advantages',
    'limitations',
    'implementations',
  ],
  publication: [
    'publicationType',
    'publicationVenueType',
    'survey',
    'bibliographic',
    'bibtexKey',
    'title',
    'authors',
    'year',
    'venue',
    'doi',
    'url',
    'abstract',
    'methodology',
    'keywords',
  ],
  'publication-relationship': ['type', 'notes'],
  'technique-relationship': ['type', 'notes'],
  claim: ['value', 'notes'],
  implementation: [
    'name',
    'platform',
    'status',
    'repositoryUrl',
    'demoUrl',
    'documentationUrl',
    'programmingLanguage',
    'license',
    'notes',
  ],
  candidate: ['title', 'doi', 'track', 'notes'],
  similarity: [],
};
const mappedField: Record<string, string> = {
  alias: 'aliases',
  task: 'tasks',
  inputModality: 'interactionModalities',
  device: 'inputDevices',
  advantage: 'advantages',
  limitation: 'limitations',
  implementation: 'implementations',
};
export function applyCuration(
  base: Catalogue,
  decision: CurationDecision,
): Catalogue {
  validateCatalogue(base);
  const d = structuredClone(base);
  if (d.curationDecisions.some((x) => x.id === decision.id))
    throw new Error('Duplicate curation decision');
  if (!entityExists(d, decision.entityType, decision.entityId))
    throw new Error('Unknown curation entity');
  const entity = getEntity(d, decision.entityType, decision.entityId)!;
  const confirmation = decision.decision === 'confirm';
  const feedback = ['useful', 'misleading'].includes(decision.decision);
  if (feedback && decision.entityType !== 'similarity')
    throw new Error('Feedback only applies to similarity');
  if (!feedback && decision.entityType === 'similarity')
    throw new Error('Similarity feedback cannot verify science');
  const verification = {
    verifiedBy: decision.reviewer,
    verifiedDate: decision.date,
    sources: [
      ...new Set(
        decision.evidence
          .map((e) => {
            const p = d.publications.find((p) => p.id === e.publicationId);
            return (
              p?.url ||
              (p?.doi ? `https://doi.org/${p.doi}` : null) ||
              p?.provenance.find((s) => s.source)?.source ||
              p?.verification.sources[0] ||
              null
            );
          })
          .filter((s): s is string => !!s),
      ),
    ],
    notes: decision.notes,
  };
  if (
    confirmation &&
    (!decision.evidence.length || !verification.sources.length)
  )
    throw new Error('Confirm requires evidence with a publication source');
  const applyField = (
    type: EntityType,
    id: string,
    field: string,
    value: JsonValue,
    evidence: Evidence[],
  ) => {
    const target = getEntity(d, type, id)!;
    if (type === 'publication' && field === 'newRelationship') {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Relationship proposal required');
      const targetId = displayValue(value.targetPublicationId ?? '');
      const relationType = displayValue(
        value.type ?? 'cites',
      ) as Catalogue['publicationRelationships'][number]['type'];
      const [source, target] = ['compares-with', 'contrasts-with'].includes(
        relationType,
      )
        ? [id, targetId].sort()
        : [id, targetId];
      d.publicationRelationships.push({
        id: 'pr-' + decision.id,
        sourcePublicationId: source,
        targetPublicationId: target,
        type: relationType,
        evidence,
        provenance: [
          {
            source: d.publications.find((p) => p.id === id)?.url ?? null,
            discoveryMethod: 'manual',
            discoveredFromPublicationId: id,
            retrievedAt: decision.date,
            notes: decision.notes,
          },
        ],
        verificationStatus: 'machine-curated',
        verification: {
          ...verification,
          notes:
            'Human-submitted proposal; explicit confirmation still required. ' +
            decision.notes,
        },
        notes: decision.notes,
        status: 'needs-evidence',
      });
      d.reviewQueue.push({
        id: 'review-pr-' + decision.id,
        entityType: 'publication-relationship',
        entityId: 'pr-' + decision.id,
        reasons: [
          'Review proposed ' +
            relationType +
            ' relationship. ' +
            decision.notes,
        ],
        status: 'open',
      });
      return;
    }
    if (!editableFields[type].includes(field))
      throw new Error('This field is not editable through curation');
    if (
      type === 'publication-relationship' &&
      field === 'type' &&
      target.type === 'cites' &&
      value !== 'cites'
    )
      throw new Error(
        'Keep the citation; create a separate scholarly relationship instead.',
      );
    if (field === 'introducedYear' && type === 'technique') {
      if (!confirmation)
        throw new Error(
          'Introduction requires explicit Confirm with original-paper evidence',
        );
      if (typeof value !== 'number' || !Number.isInteger(value))
        throw new Error('Introduction requires a numeric year');
      const paper = d.publications.find(
        (p) => p.id === evidence[0]?.publicationId,
      );
      if (!paper || paper.year !== value)
        throw new Error(
          'Choose the original publication whose year matches the introduction claim',
        );
      target.introducedYear = value;
      target.introductionStatus = 'original-publication-confirmed';
      target.earliestIdentifiedYear = Math.min(
        Number(target.earliestIdentifiedYear ?? value),
        value,
      );
      if (
        !d.techniquePublications.some(
          (l) =>
            l.techniqueId === id &&
            l.publicationId === paper.id &&
            l.relationship === 'introduced',
        )
      )
        d.techniquePublications.push({
          techniqueId: id,
          publicationId: paper.id,
          relationship: 'introduced',
          evidence,
          notes: decision.notes,
        });
    } else target[field] = structuredClone(value);
    if (
      type === 'publication-relationship' &&
      ['compares-with', 'contrasts-with'].includes(displayValue(target.type))
    ) {
      const [a, b] = [
        displayValue(target.sourcePublicationId),
        displayValue(target.targetPublicationId),
      ].sort();
      target.sourcePublicationId = a;
      target.targetPublicationId = b;
    }
    if (type === 'technique') {
      const t = d.techniques.find((t) => t.id === id)!;
      if (field === 'taxonomy') {
        t.interactionDistance = t.taxonomy.general.interactionDistance;
        t.interactionModalities = t.taxonomy.general.interactionModalities;
        t.inputDevices = t.taxonomy.general.inputDevices;
      } else {
        t.taxonomy.general.interactionDistance = t.interactionDistance;
        t.taxonomy.general.interactionModalities = t.interactionModalities;
        t.taxonomy.general.inputDevices = t.inputDevices;
      }
    }
    if (type === 'technique' && field === 'tasks') {
      const t = d.techniques.find((t) => t.id === id)!;
      for (const [section, task] of [
        ['selection', 'selection'],
        ['manipulation', 'manipulation'],
        ['navigation', 'navigation'],
        ['systemControl', 'system-control'],
      ] as const)
        if (!t.tasks.includes(task) && t.taxonomy[section])
          throw new Error(
            'Remove task-specific taxonomy before removing its task',
          );
    }
  };
  if (decision.entityType === 'claim') {
    const claim = d.claims.find((c) => c.id === decision.entityId)!;
    if (
      claim.status === 'confirmed' &&
      ['reject', 'modify', 'need-more-evidence'].includes(decision.decision)
    ) {
      const target = getEntity(d, claim.entityType, claim.entityId)!;
      target.verificationStatus = 'migrated';
      target.verification = {
        ...emptyVerification(),
        notes: 'A previously confirmed claim was reopened: ' + decision.notes,
      };
      if (
        claim.field === 'introducedYear' &&
        claim.entityType === 'technique'
      ) {
        target.introducedYear = null;
        target.introductionStatus =
          target.earliestIdentifiedYear === null
            ? 'not-established'
            : 'earliest-identified';
        d.techniquePublications = d.techniquePublications.filter(
          (l) =>
            !(
              l.techniqueId === claim.entityId &&
              l.relationship === 'introduced'
            ),
        );
      }
      claim.verificationStatus = 'machine-curated';
      claim.verification = {
        ...emptyVerification(),
        notes:
          'Reopened for review. Prior approval remains in decision history.',
      };
    }
    if (decision.decision === 'modify') {
      claim.value = decision.value;
      claim.status = 'open';
      claim.verificationStatus = 'machine-curated';
      claim.verification = { ...emptyVerification(), notes: decision.notes };
      claim.evidence = decision.evidence.length
        ? decision.evidence
        : claim.evidence;
    }
    if (confirmation) {
      if (decision.field === 'value' && decision.value !== null)
        claim.value = decision.value;
      applyField(
        claim.entityType,
        claim.entityId,
        mappedField[claim.field] ?? claim.field,
        claim.value,
        decision.evidence,
      );
      claim.status = 'confirmed';
      claim.verificationStatus = 'human-verified';
      claim.verification = verification;
      claim.evidence = decision.evidence;
    }
    if (decision.decision === 'reject') claim.status = 'rejected';
    if (decision.decision === 'need-more-evidence')
      claim.status = 'needs-evidence';
  } else if (!feedback) {
    if (decision.decision === 'modify' || (confirmation && decision.field)) {
      if (!decision.field) throw new Error('Choose a field to modify');
      applyField(
        decision.entityType,
        decision.entityId,
        decision.field,
        decision.value,
        decision.evidence,
      );
      if (
        'verificationStatus' in entity &&
        decision.field !== 'newRelationship'
      ) {
        if (!verification.sources.length)
          throw new Error(
            'Record edits require a supporting publication source; use Need more evidence when it is unavailable.',
          );
        entity.verificationStatus = 'machine-curated';
        entity.verification = {
          ...verification,
          notes:
            'Edited field only; record-wide verification must be repeated. ' +
            decision.notes,
        };
      }
    }
    if (
      decision.entityType === 'publication-relationship' &&
      decision.decision === 'modify'
    ) {
      entity.status = 'needs-evidence';
      if (decision.evidence.length) entity.evidence = decision.evidence;
    }
    if (confirmation) {
      if (!decision.field) {
        if ('verificationStatus' in entity) {
          entity.verificationStatus = 'human-verified';
          entity.verification = verification;
        }
        if ('relationshipSource' in entity) {
          entity.relationshipSource = 'human-verified';
          entity.evidence = decision.evidence;
          entity.status = 'active';
        }
      }
      if (decision.entityType === 'publication-relationship') {
        entity.status = 'active';
        entity.evidence = decision.evidence;
      }
      if (decision.entityType === 'candidate') entity.status = 'accepted';
      if (
        decision.field &&
        ['technique', 'publication'].includes(decision.entityType)
      ) {
        const field =
          Object.entries(mappedField).find(
            ([, v]) => v === decision.field,
          )?.[0] ?? decision.field;
        if ((claimFields as readonly string[]).includes(field)) {
          const existing = d.claims.find(
            (c) =>
              c.entityType === decision.entityType &&
              c.entityId === decision.entityId &&
              c.field === field,
          );
          const claim = {
            id: existing?.id ?? 'claim-' + decision.id,
            entityType: decision.entityType as 'technique' | 'publication',
            entityId: decision.entityId,
            field: field as Catalogue['claims'][number]['field'],
            value: decision.value,
            evidence: decision.evidence,
            verificationStatus: 'human-verified' as const,
            verification,
            notes: decision.notes,
            status: 'confirmed' as const,
          };
          if (existing) Object.assign(existing, claim);
          else d.claims.push(claim);
          for (const item of d.reviewQueue)
            if (item.entityType === 'claim' && item.entityId === claim.id)
              item.status = 'resolved';
        }
      }
    }
    if (decision.decision === 'reject') {
      if (
        [
          'publication-relationship',
          'technique-relationship',
          'candidate',
        ].includes(decision.entityType)
      )
        entity.status = 'rejected';
      if ('verificationStatus' in entity) {
        entity.verificationStatus = 'migrated';
        entity.verification = {
          ...emptyVerification(),
          notes:
            'Rejected/reopened by ' + decision.reviewer + ': ' + decision.notes,
        };
      }
    }
    if (
      decision.decision === 'need-more-evidence' &&
      ['publication-relationship', 'technique-relationship'].includes(
        decision.entityType,
      )
    )
      entity.status = 'needs-evidence';
    if (
      decision.entityType === 'technique-relationship' &&
      (decision.decision === 'reject' ||
        decision.decision === 'need-more-evidence')
    )
      entity.notes = `${decision.decision.toUpperCase()}: ${decision.notes}. Previous: ${displayValue(entity.notes ?? '')}`;
  }
  d.curationDecisions.push(structuredClone(decision));
  for (const item of d.reviewQueue)
    if (
      item.entityType === decision.entityType &&
      item.entityId === decision.entityId
    )
      item.status = ['confirm', 'reject'].includes(decision.decision)
        ? 'resolved'
        : 'open';
  if (
    decision.decision === 'need-more-evidence' &&
    !d.reviewQueue.some(
      (r) =>
        r.entityType === decision.entityType &&
        r.entityId === decision.entityId &&
        r.status === 'open',
    )
  )
    d.reviewQueue.push({
      id: 'review-' + decision.id,
      entityType: decision.entityType,
      entityId: decision.entityId,
      reasons: [decision.notes],
      status: 'open',
    });
  // Preserve previously rated pairs so feedback references survive weight/metadata changes.
  const previous = d.publicationSimilarities;
  d.publicationSimilarities = computeSimilarities(d);
  for (const s of previous)
    if (
      d.curationDecisions.some(
        (c) => c.entityType === 'similarity' && c.entityId === s.id,
      ) &&
      !d.publicationSimilarities.some((x) => x.id === s.id)
    )
      d.publicationSimilarities.push(s);
  return validateCatalogue(normalizeVerification(d));
}
