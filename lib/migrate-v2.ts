import { normalizeVerification } from './verification.ts';
import type { Catalogue as V2 } from './legacy/v2/model.ts';
import { validateCatalogue as validateV2 } from './legacy/v2/catalogue.ts';
import {
  emptyCatalogue,
  emptyTaxonomy,
  emptyVerification,
  type Catalogue,
  type Technique,
  type PublicationRelationship,
  type VerificationStatus,
} from './model.ts';
import { validateCatalogue } from './catalogue.ts';
const status = (s: string): VerificationStatus =>
  s === 'machine-verified' ? 'machine-curated' : (s as VerificationStatus);
export function migrateV2(input: V2): Catalogue {
  const old = structuredClone(validateV2(input));
  const d = emptyCatalogue();
  d.publications = old.publications.map((p) => ({
    ...p,
    verificationStatus: status(p.verificationStatus),
    methodology: null,
    keywords: [],
  }));
  d.techniquePublications = old.techniquePublications.map((l) =>
    l.relationship === 'introduced'
      ? {
          ...l,
          relationship: 'earliest-identified',
          notes:
            'v3 migration: previous introduced role was qualified as earliest identified. Original role/evidence retained in catalogue-v2.json. ' +
            (l.notes ?? ''),
        }
      : l,
  );
  d.publicationCitations = old.publicationCitations;
  d.reviewQueue = old.reviewQueue;
  d.techniques = old.techniques.map((t) => {
    const taxonomy = emptyTaxonomy();
    taxonomy.general.interactionDistance = t.interactionDistance;
    taxonomy.general.interactionModalities = t.interactionModalities;
    taxonomy.general.inputDevices = t.inputDevices;
    taxonomy.general.environment = t.taxonomy.environment;
    taxonomy.general.controlMapping = t.taxonomy.controlMapping;
    if (
      t.tasks.includes('selection') &&
      [
        t.taxonomy.selectionMechanism,
        t.taxonomy.targetCardinality,
        t.taxonomy.targetProperties,
        t.taxonomy.confirmationMethod,
      ].some((x) => x !== null)
    )
      taxonomy.selection = {
        selectionMechanism: t.taxonomy.selectionMechanism,
        targetCardinality: t.taxonomy.targetCardinality,
        targetProperties: t.taxonomy.targetProperties,
        confirmationMethod: t.taxonomy.confirmationMethod,
      };
    const years = d.techniquePublications
      .filter((l) => l.techniqueId === t.id)
      .map((l) => d.publications.find((p) => p.id === l.publicationId)?.year)
      .filter((y): y is number => typeof y === 'number');
    const earliest = years.length ? Math.min(...years) : null;
    const result: Technique = {
      ...t,
      taxonomy,
      verificationStatus: status(t.verificationStatus),
      introducedYear: null,
      earliestIdentifiedYear: earliest,
      introductionStatus:
        earliest === null ? 'not-established' : 'earliest-identified',
      relationships: t.relationships.map((r, i) => ({
        ...r,
        status: 'active',
        id: `tr-${t.id}-${i + 1}`,
        relationshipSource: r.evidence.length
          ? 'machine-curated'
          : 'legacy-editorial',
        provenance: [
          {
            source: null,
            discoveryMethod: 'migration',
            discoveredFromPublicationId: null,
            retrievedAt: null,
            notes: r.evidence.length
              ? 'Existing evidence-backed relationship retained.'
              : 'Legacy editorial association, not confirmed lineage.',
          },
        ],
      })),
      implementations: t.implementations.map((i) => ({
        id: i.id,
        name: i.name,
        platform: 'other',
        status: 'prototype',
        repositoryUrl: i.url,
        demoUrl: null,
        documentationUrl: null,
        programmingLanguage: i.language,
        license: i.license,
        notes: i.notes,
        scientificBasis: i.evidence,
        provenance: {
          implementedBy: null,
          implementationDate: null,
          repository: i.url,
          source: null,
          notes:
            'Migrated implementation. Prior free-text platform: ' +
            (i.platform ?? 'unknown'),
        },
      })),
    };
    if (t.introducedYear !== null) {
      result.legacyMetadata = {
        ...t.legacyMetadata,
        v2Introduction: {
          year: t.introducedYear,
          verification: t.verification,
          notes:
            'Reclassified as earliest identified; original v2 record preserved in snapshot.',
        },
      };
      d.claims.push({
        id: `claim-${t.id}-introduction`,
        entityType: 'technique',
        entityId: t.id,
        field: 'introducedYear',
        value: t.introducedYear,
        evidence: t.evidence,
        verificationStatus: 'machine-curated',
        verification: {
          ...t.verification,
          notes:
            'Unconfirmed introduction claim carried from v2 for explicit human review.',
        },
        notes:
          'Earliest found does not establish originality. Confirm only after inspecting original evidence.',
        status: 'needs-evidence',
      });
      d.reviewQueue.push({
        id: `review-claim-${t.id}-introduction`,
        entityType: 'claim',
        entityId: `claim-${t.id}-introduction`,
        reasons: [
          'Original introduction is not established; earliest identified year is stored separately.',
        ],
        status: 'open',
      });
    }
    return result;
  });
  const byPair = new Map<string, PublicationRelationship>();
  for (const c of old.publicationCitations) {
    const key = c.citingPublicationId + '-to-' + c.citedPublicationId;
    let r = byPair.get(key);
    if (!r) {
      r = {
        id: 'pr-cites-' + key,
        sourcePublicationId: c.citingPublicationId,
        targetPublicationId: c.citedPublicationId,
        type: 'cites',
        evidence: [],
        provenance: [],
        verificationStatus: 'machine-curated',
        verification: emptyVerification(),
        notes:
          'Bibliographic citation only; no intellectual dependency inferred.',
        status: 'active',
      };
      byPair.set(key, r);
    }
    for (const e of c.evidence)
      if (!r.evidence.some((x) => JSON.stringify(x) === JSON.stringify(e)))
        r.evidence.push(e);
    r.provenance.push({
      source:
        d.publications.find((p) => p.id === c.citingPublicationId)?.url ?? null,
      discoveryMethod: c.discoveryMethod,
      discoveredFromPublicationId:
        c.discoveryMethod === 'backward-citation'
          ? c.citingPublicationId
          : c.citedPublicationId,
      retrievedAt: null,
      notes: 'Preserved v2 citation discovery; original record retained.',
    });
  }
  d.publicationRelationships = [...byPair.values()];
  return validateCatalogue(normalizeVerification(d));
}
