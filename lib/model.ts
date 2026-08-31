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
  verification: ['migrated', 'machine-curated', 'human-verified'],
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
    'earliest-identified',
    'introduced',
    'evaluated',
    'compared',
    'modified',
    'reused',
    'surveyed',
    'reviewed',
    'classified',
    'included',
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
  status: 'active' | 'rejected' | 'needs-evidence';
  id: string;
  relationshipSource: 'legacy-editorial' | 'machine-curated' | 'human-verified';
  provenance: Provenance[];
  techniqueId: string;
  type: (typeof vocabulary.relationships)[number];
  notes: string | null;
  evidence: Evidence[];
}
export interface Implementation {
  id: string;
  name: string;
  platform: 'Unity' | 'Unreal' | 'WebXR' | 'JavaScript' | 'reference' | 'other';
  status: 'pseudocode' | 'prototype' | 'reference-implementation' | 'validated';
  repositoryUrl: string | null;
  demoUrl: string | null;
  documentationUrl: string | null;
  programmingLanguage: string | null;
  license: string | null;
  notes: string | null;
  scientificBasis: Evidence[];
  provenance: {
    implementedBy: string | null;
    implementationDate: string | null;
    repository: string | null;
    source: string | null;
    notes: string | null;
  };
}
export interface GeneralTaxonomy {
  interactionDistance: (typeof vocabulary.distances)[number][] | null;
  interactionModalities: (typeof vocabulary.modalities)[number][];
  inputDevices: string[];
  environment: (typeof vocabulary.environments)[number][] | null;
  controlMapping: (typeof vocabulary.mappings)[number][] | null;
  bodyParts: string[] | null;
  directness: ('direct' | 'indirect' | 'hybrid')[] | null;
  feedbackModalities: ('visual' | 'auditory' | 'haptic' | 'other')[] | null;
}
export interface Taxonomy {
  general: GeneralTaxonomy;
  selection: {
    selectionMechanism:
      | ((typeof vocabulary.mechanisms)[number] | 'other')[]
      | null;
    targetCardinality: (typeof vocabulary.cardinalities)[number][] | null;
    targetProperties: (typeof vocabulary.targetProperties)[number][] | null;
    confirmationMethod: (typeof vocabulary.confirmations)[number][] | null;
  } | null;
  manipulation: {
    manipulationMapping:
      | (
          | 'direct'
          | 'indirect'
          | 'scaled'
          | 'nonlinear'
          | 'constraint-based'
          | 'adaptive'
          | 'other'
        )[]
      | null;
    handedness: ('unimanual' | 'bimanual' | 'variable')[] | null;
    manipulatedComponents: ('translation' | 'rotation' | 'scale')[] | null;
    attachmentMechanism:
      | ('direct' | 'ray-mediated' | 'proxy' | 'other')[]
      | null;
    referenceFrame:
      | ('hand' | 'body' | 'head' | 'object' | 'world' | 'other')[]
      | null;
  } | null;
  navigation: {
    locomotionMechanism:
      | (
          | 'physical-walking'
          | 'steering'
          | 'teleportation'
          | 'redirected-walking'
          | 'world-manipulation'
          | 'viewpoint-manipulation'
          | 'walking-in-place'
          | 'arm-swing'
          | 'other'
        )[]
      | null;
    continuity: ('continuous' | 'discrete' | 'hybrid')[] | null;
    referenceFrame: ('body' | 'head' | 'hand' | 'world' | 'other')[] | null;
    physicalMovementRequired:
      | ('none' | 'limited' | 'full-body' | 'variable')[]
      | null;
  } | null;
  systemControl: {
    controlType:
      | (
          | 'menu'
          | 'gesture-command'
          | 'voice-command'
          | 'mode-switch'
          | 'tool-palette'
          | 'widget'
          | 'multimodal'
          | 'other'
        )[]
      | null;
    menuStructure:
      | (
          | 'radial'
          | 'linear'
          | 'hierarchical'
          | 'spatial'
          | 'contextual'
          | 'other'
        )[]
      | null;
  } | null;
}
export interface Technique {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  introducedYear: number | null;
  earliestIdentifiedYear: number | null;
  introductionStatus:
    | 'not-established'
    | 'earliest-identified'
    | 'original-publication-confirmed';
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
export const publicationTypes = [
  'research-article',
  'survey',
  'systematic-review',
  'literature-review',
  'taxonomy',
  'meta-analysis',
  'position-paper',
  'workshop-paper',
  'thesis',
  'book',
  'book-chapter',
  'other',
  'unknown',
] as const;
export interface ImportProvenance {
  source: string;
  filename: string | null;
  originalKey: string | null;
  timestamp: string;
  url: string | null;
}
export interface Publication {
  publicationVenueType?: import('./publication-venue.ts').PublicationVenueType;
  publicationType?: (typeof publicationTypes)[number];
  bibtexKey?: string | null;
  originalBibtex?: string | null;
  bibliographic?: {
    entryType: string | null;
    journal: string | null;
    booktitle: string | null;
    volume: string | null;
    issue: string | null;
    pages: string | null;
    publisher: string | null;
  };
  importProvenance?: ImportProvenance[];
  survey?: {
    scope: string | null;
    yearsCovered: string | null;
    taxonomyIntroduced: string | null;
    tasks: string[];
  };

  methodology: string[] | null;
  keywords: string[];
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
  entityType: EntityType;
  entityId: string;
  reasons: string[];
  status: 'open' | 'resolved';
}
export interface Catalogue {
  schemaVersion: 3;
  claims: ClaimEvidence[];
  publicationRelationships: PublicationRelationship[];
  publicationSimilarities: PublicationSimilarity[];
  curationDecisions: CurationDecision[];
  candidateLiterature: CandidateLiterature[];
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
  general: {
    interactionDistance: null,
    interactionModalities: [],
    inputDevices: [],
    environment: null,
    controlMapping: null,
    bodyParts: null,
    directness: null,
    feedbackModalities: null,
  },
  selection: null,
  manipulation: null,
  navigation: null,
  systemControl: null,
});
export const emptyCatalogue = (): Catalogue => ({
  schemaVersion: 3,
  techniques: [],
  publications: [],
  techniquePublications: [],
  publicationCitations: [],
  reviewQueue: [],
  claims: [],
  publicationRelationships: [],
  publicationSimilarities: [],
  curationDecisions: [],
  candidateLiterature: [],
});
export const publicationRelationshipTypes = [
  'cites',
  'builds-on',
  'extends',
  'adapts',
  'modifies',
  'applies',
  'evaluates',
  'compares-with',
  'replicates',
  'classifies',
  'includes',
  'surveys',
  'reviews',
  'uses-method-from',
  'uses-technique-from',
  'introduces-variant-of',
  'contrasts-with',
] as const;
export const symmetricRelationshipTypes = [
  'compares-with',
  'contrasts-with',
] as const;
export const ancestryTypes = [
  'builds-on',
  'extends',
  'adapts',
  'modifies',
  'introduces-variant-of',
  'replicates',
  'uses-method-from',
  'uses-technique-from',
] as const;
export type EntityType =
  | 'technique'
  | 'publication'
  | 'publication-relationship'
  | 'technique-relationship'
  | 'claim'
  | 'implementation'
  | 'candidate'
  | 'similarity';
export const entityTypes = [
  'technique',
  'publication',
  'publication-relationship',
  'technique-relationship',
  'claim',
  'implementation',
  'candidate',
  'similarity',
] as const;
export const claimFields = [
  'name',
  'alias',
  'introducedYear',
  'earliestIdentifiedYear',
  'description',
  'task',
  'taxonomy',
  'relationship',
  'inputModality',
  'device',
  'advantage',
  'limitation',
  'implementation',
  'methodology',
  'keywords',
] as const;
export type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };
export interface ClaimEvidence {
  provenance?: Provenance[];
  id: string;
  entityType:
    | 'technique'
    | 'publication'
    | 'publication-relationship'
    | 'technique-relationship'
    | 'implementation';
  entityId: string;
  field: (typeof claimFields)[number];
  value: JsonValue;
  evidence: Evidence[];
  verificationStatus: VerificationStatus;
  verification: Verification;
  notes: string | null;
  status: 'open' | 'confirmed' | 'rejected' | 'needs-evidence';
}
export interface PublicationRelationship {
  id: string;
  sourcePublicationId: string;
  targetPublicationId: string;
  type: (typeof publicationRelationshipTypes)[number];
  evidence: Evidence[];
  provenance: Provenance[];
  verificationStatus: VerificationStatus;
  verification: Verification;
  notes: string | null;
  status: 'active' | 'rejected' | 'needs-evidence';
}
export const similarityDimensions = [
  'techniques',
  'tasks',
  'modalities',
  'devices',
  'environment',
  'target',
  'taxonomy',
  'methodology',
  'keywords',
] as const;
export type SimilarityDimension = (typeof similarityDimensions)[number];
export type SimilarityWeights = Record<SimilarityDimension, number>;
export interface PublicationSimilarity {
  id: string;
  publicationAId: string;
  publicationBId: string;
  score: number;
  dimensions: Record<SimilarityDimension, number | null>;
  reasons: string[];
  provenance: {
    algorithm: string;
    weights: SimilarityWeights;
    coverage: number;
    notes: string;
  };
}
export interface CurationDecision {
  adminId?: string;
  timestamp?: string;
  previousValue?: JsonValue;
  newValue?: JsonValue;
  id: string;
  reviewer: string;
  reviewerId: string;
  date: string;
  decision:
    | 'confirm'
    | 'reject'
    | 'modify'
    | 'need-more-evidence'
    | 'useful'
    | 'misleading';
  entityType: EntityType;
  entityId: string;
  field: string | null;
  value: JsonValue;
  notes: string;
  evidence: Evidence[];
}
export interface CandidateLiterature {
  id: string;
  title: string;
  doi: string | null;
  track: string;
  source: string;
  notes: string;
  status: 'open' | 'accepted' | 'rejected';
}
export const categories = vocabulary.tasks;
export const categoryLabel = (s: string) =>
  s === 'system-control'
    ? 'System control'
    : s.charAt(0).toUpperCase() + s.slice(1).replaceAll('-', ' ');
