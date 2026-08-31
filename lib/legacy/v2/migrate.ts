import {
  emptyCatalogue,
  emptyTaxonomy,
  emptyVerification,
  type Catalogue,
  type Publication,
  type Task,
  type Technique,
} from './model.ts';
import { normalize, validateCatalogue } from './catalogue.ts';
export interface LegacyTechnique {
  id: string;
  title: string;
  category: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  description: string;
  interactionModality: string[];
  inputDevice: string[];
  interactionDistance: string;
  degreesOfFreedom: number | null;
  advantages: string[];
  limitations: string[];
  relatedTechniques: string[];
  tags: string[];
  howItWorks: string;
  citation: string;
  sourceUrl: string | null;
  metadataNotes: string[];
}
export interface LegacyCatalogue {
  schemaVersion: 1;
  techniques: LegacyTechnique[];
}
export function migrateV1(input: LegacyCatalogue): Catalogue {
  if (input.schemaVersion !== 1 || !Array.isArray(input.techniques))
    throw new Error('Expected a version 1 catalogue.');
  const d = emptyCatalogue(),
    byCitation = new Map<string, string>();
  for (const old of input.techniques) {
    const provenance = [
      {
        source: old.sourceUrl,
        discoveryMethod: 'migration' as const,
        discoveredFromPublicationId: null,
        retrievedAt: null,
        notes:
          'Lossless migration from catalogue schema v1. ' +
          old.metadataNotes.join(' '),
      },
    ];
    const yearMatch = old.citation.match(/\((\d{4})[^)]*\)\.\s*/);
    const title = yearMatch
      ? old.citation
          .slice(yearMatch.index! + yearMatch[0].length)
          .split(/\.\s+/)[0]
          .trim()
          .replace(/\.$/, '')
      : null;
    const key = old.doi
      ? `doi:${old.doi.toLowerCase()}`
      : normalize(old.citation);
    let publicationId = byCitation.get(key);
    if (!publicationId) {
      publicationId = `legacy-paper-${old.id}`;
      byCitation.set(key, publicationId);
      const p: Publication = {
        id: publicationId,
        title: title || null,
        authors: [...old.authors],
        year: yearMatch ? Number(yearMatch[1]) : null,
        venue: null,
        doi: old.doi,
        url: old.doi ? `https://doi.org/${old.doi}` : old.sourceUrl,
        abstract: null,
        bibtex: null,
        legacyCitations: [old.citation],
        verificationStatus: 'migrated',
        verification: {
          ...emptyVerification(),
          notes:
            'Title and publication year parsed from the original citation; not independently verified. Venue and missing identifiers remain unknown.',
        },
        provenance: [...provenance],
        access: 'metadata-only',
        legacyMetadata: {
          citation: old.citation,
          authors: old.authors,
          year: old.year,
          sourceUrl: old.sourceUrl,
        },
      };
      d.publications.push(p);
    }
    const modalityMap: Record<
      string,
      Technique['interactionModalities'][number]
    > = {
      'Controller pointing': 'controller',
      'Hand gesture': 'hand',
      Gaze: 'gaze',
      Voice: 'voice',
      'Head orientation': 'head',
    };
    const modalities = Array.from(
      new Set(old.interactionModality.map((m) => modalityMap[m] ?? 'other')),
    );
    const distance: Technique['interactionDistance'] =
      old.interactionDistance === 'unknown'
        ? null
        : old.interactionDistance === 'both'
          ? ['near', 'far']
          : old.interactionDistance === 'near'
            ? ['near']
            : old.interactionDistance === 'far'
              ? ['far']
              : old.interactionDistance === 'not-applicable'
                ? ['not-applicable']
                : null;
    const t: Technique = {
      id: old.id,
      name: old.title,
      aliases: [],
      description: old.description,
      introducedYear: null,
      primaryTask: old.category as Task,
      tasks: [old.category as Task],
      interactionModalities: modalities,
      modalityDetails: old.interactionModality.join('; ') || null,
      inputDevices: [...old.inputDevice],
      deviceDetails: old.inputDevice.join('; ') || null,
      interactionDistance: distance,
      degreesOfFreedom: old.degreesOfFreedom,
      taxonomy: emptyTaxonomy(),
      tags: [...old.tags],
      advantages: [...old.advantages],
      limitations: [...old.limitations],
      howItWorks: old.howItWorks,
      relationships: old.relatedTechniques.map((id) => ({
        techniqueId: id,
        type: 'conceptually-related',
        notes:
          'Preserved v1 editorial relationship; no historical derivation asserted.',
        evidence: [],
      })),
      evidence: [],
      verificationStatus: 'migrated',
      verification: emptyVerification(),
      provenance: [...provenance],
      implementations: [],
      legacyMetadata: structuredClone(old) as unknown as Record<
        string,
        unknown
      >,
    };
    d.techniques.push(t);
    d.techniquePublications.push({
      techniqueId: t.id,
      publicationId,
      relationship: 'unclassified',
      evidence: [],
      notes:
        'Legacy citation retained. Its role is not established by migration.',
    });
    d.reviewQueue.push({
      id: `review-${t.id}`,
      entityType: 'technique',
      entityId: t.id,
      status: 'open',
      reasons: [
        'Introduction year and citation role need scientific review.',
        ...old.metadataNotes.filter((n) => n.includes('differs from')),
      ],
    });
  }
  return validateCatalogue(d);
}
