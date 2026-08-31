export const vocabulary = {
  tasks: ['selection', 'manipulation', 'navigation', 'system-control'],
  modalities: [
    'hand',
    'gaze',
    'head',
    'controller',
    'voice',
    'body',
    'foot',
    'tangible',
    'multimodal',
    'other',
  ],
  environments: ['VR', 'AR', 'MR', 'desktop-3D', 'volumetric-display', 'other'],
  verification: ['migrated', 'machine-verified', 'human-verified'],
  distances: ['near', 'mid-range', 'far', 'variable', 'not-applicable'],
  mechanisms: [
    'pointing',
    'touching',
    'volume-based',
    'refinement',
    'disambiguation',
    'gaze',
    'semantic',
    'multimodal',
  ],
  mappings: ['direct', 'indirect', 'scaled', 'nonlinear', 'adaptive'],
  cardinalities: ['single', 'multiple'],
  targetProperties: [
    'visible',
    'occluded',
    'dense',
    'sparse',
    'small',
    'large',
    'moving',
    'static',
  ],
  confirmations: [
    'button',
    'pinch',
    'dwell',
    'voice',
    'gesture',
    'automatic',
    'other',
  ],
  relationships: [
    'derived-from',
    'variation-of',
    'extends',
    'predecessor-of',
    'successor-of',
    'combines',
    'uses',
    'conceptually-related',
    'compared-with',
  ],
  publicationRoles: [
    'introduced',
    'evaluated',
    'compared',
    'modified',
    'reused',
    'surveyed',
    'unclassified',
  ],
  discovery: [
    'migration',
    'seed',
    'backward-citation',
    'forward-citation',
    'metadata-verification',
    'manual',
    'import',
  ],
} as const;
export type Task = (typeof vocabulary.tasks)[number];
export type VerificationStatus = (typeof vocabulary.verification)[number];
export interface Evidence {
  publicationId: string;
  section: string | null;
  page: string | null;
  quote: string | null;
  notes: string | null;
}
export interface Provenance {
  source: string | null;
  discoveryMethod: (typeof vocabulary.discovery)[number];
  discoveredFromPublicationId: string | null;
  retrievedAt: string | null;
  notes: string;
}
export interface Verification {
  verifiedBy: string | null;
  verifiedDate: string | null;
  sources: string[];
  notes: string | null;
}
export interface TechniqueRelationship {
  techniqueId: string;
  type: (typeof vocabulary.relationships)[number];
  notes: string | null;
  evidence: Evidence[];
}
export interface Implementation {
  id: string;
  name: string;
  url: string;
  license: string | null;
  language: string | null;
  platform: string | null;
  notes: string | null;
  evidence: Evidence[];
}
export interface Taxonomy {
  selectionMechanism: (typeof vocabulary.mechanisms)[number][] | null;
  controlMapping: (typeof vocabulary.mappings)[number][] | null;
  targetCardinality: (typeof vocabulary.cardinalities)[number][] | null;
  environment: (typeof vocabulary.environments)[number][] | null;
  targetProperties: (typeof vocabulary.targetProperties)[number][] | null;
  confirmationMethod: (typeof vocabulary.confirmations)[number][] | null;
}
export interface Technique {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  introducedYear: number | null;
  primaryTask: Task;
  tasks: Task[];
  interactionModalities: (typeof vocabulary.modalities)[number][];
  modalityDetails: string | null;
  inputDevices: string[];
  deviceDetails: string | null;
  interactionDistance: (typeof vocabulary.distances)[number][] | null;
  degreesOfFreedom: number | null;
  taxonomy: Taxonomy;
  tags: string[];
  advantages: string[];
  limitations: string[];
  howItWorks: string | null;
  relationships: TechniqueRelationship[];
  evidence: Evidence[];
  verificationStatus: VerificationStatus;
  verification: Verification;
  provenance: Provenance[];
  implementations: Implementation[];
  legacyMetadata: Record<string, unknown> | null;
}
export interface Publication {
  id: string;
  title: string | null;
  authors: string[];
  year: number | null;
  venue: string | null;
  doi: string | null;
  url: string | null;
  abstract: string | null;
  bibtex: string | null;
  legacyCitations: string[];
  verificationStatus: VerificationStatus;
  verification: Verification;
  provenance: Provenance[];
  access: 'full-text' | 'metadata-only' | 'unavailable';
  legacyMetadata: Record<string, unknown> | null;
}
export interface TechniquePublication {
  techniqueId: string;
  publicationId: string;
  relationship: (typeof vocabulary.publicationRoles)[number];
  evidence: Evidence[];
  notes: string | null;
}
export interface PublicationCitation {
  citingPublicationId: string;
  citedPublicationId: string;
  discoveryMethod: 'backward-citation' | 'forward-citation';
  evidence: Evidence[];
}
export interface ReviewItem {
  id: string;
  entityType: 'technique' | 'publication';
  entityId: string;
  reasons: string[];
  status: 'open' | 'resolved';
}
export interface Catalogue {
  schemaVersion: 2;
  techniques: Technique[];
  publications: Publication[];
  techniquePublications: TechniquePublication[];
  publicationCitations: PublicationCitation[];
  reviewQueue: ReviewItem[];
}
export const emptyVerification = (): Verification => ({
  verifiedBy: null,
  verifiedDate: null,
  sources: [],
  notes: null,
});
export const emptyTaxonomy = (): Taxonomy => ({
  selectionMechanism: null,
  controlMapping: null,
  targetCardinality: null,
  environment: null,
  targetProperties: null,
  confirmationMethod: null,
});
export const emptyCatalogue = (): Catalogue => ({
  schemaVersion: 2,
  techniques: [],
  publications: [],
  techniquePublications: [],
  publicationCitations: [],
  reviewQueue: [],
});
export const categories = vocabulary.tasks;
export const categoryLabel = (s: string) =>
  s === 'system-control'
    ? 'System control'
    : s.charAt(0).toUpperCase() + s.slice(1).replaceAll('-', ' ');
