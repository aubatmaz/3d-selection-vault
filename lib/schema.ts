import { publicationVenueTypes } from './publication-venue.ts';
import {
  vocabulary as v,
  publicationRelationshipTypes,
  publicationTypes,
  entityTypes,
  claimFields,
  similarityDimensions,
} from './model.ts';
export interface Shape {
  type?: string;
  enum?: readonly string[];
  const?: number;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  pattern?: string;
  format?: string;
  properties?: Record<string, Shape>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Shape;
  anyOf?: Shape[];
}
const text: Shape = { type: 'string', minLength: 1 };
const nullable = (shape: Shape): Shape => ({
  anyOf: [shape, { type: 'null' }],
});
const values = (enums: readonly string[]): Shape => ({
  type: 'string',
  enum: enums,
});
const list = (items: Shape, minItems = 0): Shape => ({
  type: 'array',
  items,
  minItems,
  uniqueItems: true,
  maxItems: 20000,
});
const object = (properties: Record<string, Shape>): Shape => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const id = { ...text, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' };
const url: Shape = { type: 'string', format: 'uri', pattern: '^https?://' };
const year: Shape = nullable({ type: 'integer', minimum: 1800, maximum: 2100 });
const legacy: Shape = nullable({ type: 'object', additionalProperties: true });
const evidence = object({
  publicationId: id,
  section: nullable(text),
  page: nullable(text),
  quote: nullable({ ...text, maxLength: 180 }),
  notes: nullable(text),
});
const verification = object({
  verifiedBy: nullable(text),
  verifiedDate: nullable({ type: 'string', format: 'date' }),
  sources: list(url),
  notes: nullable(text),
});
const provenance = object({
  source: nullable(url),
  discoveryMethod: values(v.discovery),
  discoveredFromPublicationId: nullable(id),
  retrievedAt: nullable({ type: 'string', format: 'date' }),
  notes: text,
});
const dimension = (items: readonly string[]) =>
  nullable(list(values(items), 1));
const taxonomy = object({
  general: object({
    interactionDistance: dimension(v.distances),
    interactionModalities: list(values(v.modalities)),
    inputDevices: list(text),
    environment: dimension(v.environments),
    controlMapping: dimension(v.mappings),
    bodyParts: nullable(list(text, 1)),
    directness: dimension(['direct', 'indirect', 'hybrid']),
    feedbackModalities: dimension(['visual', 'auditory', 'haptic', 'other']),
  }),
  selection: nullable(
    object({
      selectionMechanism: dimension([...v.mechanisms, 'other']),
      targetCardinality: dimension(v.cardinalities),
      targetProperties: dimension(v.targetProperties),
      confirmationMethod: dimension(v.confirmations),
    }),
  ),
  manipulation: nullable(
    object({
      manipulationMapping: dimension([
        'direct',
        'indirect',
        'scaled',
        'nonlinear',
        'constraint-based',
        'adaptive',
        'other',
      ]),
      handedness: dimension(['unimanual', 'bimanual', 'variable']),
      manipulatedComponents: dimension(['translation', 'rotation', 'scale']),
      attachmentMechanism: dimension([
        'direct',
        'ray-mediated',
        'proxy',
        'other',
      ]),
      referenceFrame: dimension([
        'hand',
        'body',
        'head',
        'object',
        'world',
        'other',
      ]),
    }),
  ),
  navigation: nullable(
    object({
      locomotionMechanism: dimension([
        'physical-walking',
        'steering',
        'teleportation',
        'redirected-walking',
        'world-manipulation',
        'viewpoint-manipulation',
        'walking-in-place',
        'arm-swing',
        'other',
      ]),
      continuity: dimension(['continuous', 'discrete', 'hybrid']),
      referenceFrame: dimension(['body', 'head', 'hand', 'world', 'other']),
      physicalMovementRequired: dimension([
        'none',
        'limited',
        'full-body',
        'variable',
      ]),
    }),
  ),
  systemControl: nullable(
    object({
      controlType: dimension([
        'menu',
        'gesture-command',
        'voice-command',
        'mode-switch',
        'tool-palette',
        'widget',
        'multimodal',
        'other',
      ]),
      menuStructure: dimension([
        'radial',
        'linear',
        'hierarchical',
        'spatial',
        'contextual',
        'other',
      ]),
    }),
  ),
});
export const implementationShape = object({
  id,
  name: text,
  platform: values([
    'Unity',
    'Unreal',
    'WebXR',
    'JavaScript',
    'reference',
    'other',
  ]),
  status: values([
    'pseudocode',
    'prototype',
    'reference-implementation',
    'validated',
  ]),
  repositoryUrl: nullable(url),
  demoUrl: nullable(url),
  documentationUrl: nullable(url),
  programmingLanguage: nullable(text),
  license: nullable(text),
  notes: nullable(text),
  scientificBasis: list(evidence),
  provenance: object({
    implementedBy: nullable(text),
    implementationDate: nullable({ type: 'string', format: 'date' }),
    repository: nullable(url),
    source: nullable(url),
    notes: nullable(text),
  }),
});
export const relationshipShape = object({
  id,
  sourcePublicationId: id,
  targetPublicationId: id,
  type: values(publicationRelationshipTypes),
  evidence: list(evidence),
  provenance: list(provenance, 1),
  verificationStatus: values(v.verification),
  verification,
  notes: nullable(text),
  status: values(['active', 'rejected', 'needs-evidence']),
});
const score: Shape = { type: 'number', minimum: 0, maximum: 1 };
const weights = object(
  Object.fromEntries(
    similarityDimensions.map((k) => [
      k,
      { type: 'number', minimum: 0, maximum: 100 },
    ]),
  ),
);
export const similarityShape = object({
  id,
  publicationAId: id,
  publicationBId: id,
  score,
  dimensions: object(
    Object.fromEntries(similarityDimensions.map((k) => [k, nullable(score)])),
  ),
  reasons: list(text, 1),
  provenance: object({
    algorithm: text,
    weights,
    coverage: score,
    notes: text,
  }),
});
export const claimShape = object({
  id,
  entityType: values([
    'technique',
    'publication',
    'publication-relationship',
    'technique-relationship',
    'implementation',
  ]),
  entityId: id,
  field: values(claimFields),
  value: {},
  evidence: list(evidence),
  verificationStatus: values(v.verification),
  verification,
  notes: nullable(text),
  status: values(['open', 'confirmed', 'rejected', 'needs-evidence']),
});
export const decisionShape = object({
  id,
  reviewer: text,
  reviewerId: text,
  date: { type: 'string', format: 'date' },
  decision: values([
    'confirm',
    'reject',
    'modify',
    'need-more-evidence',
    'useful',
    'misleading',
  ]),
  entityType: values(entityTypes),
  entityId: id,
  field: nullable(text),
  value: {},
  notes: text,
  evidence: list(evidence),
});
const candidateShape = object({
  id,
  title: text,
  doi: nullable({ type: 'string', pattern: '^10\\.\\d{4,9}/\\S+$' }),
  track: text,
  source: url,
  notes: text,
  status: values(['open', 'accepted', 'rejected']),
});
const shared = {
  verificationStatus: values(v.verification),
  verification,
  provenance: list(provenance, 1),
  legacyMetadata: legacy,
};
export const techniqueShape = object({
  id,
  name: text,
  aliases: list(text),
  description: text,
  introducedYear: year,
  earliestIdentifiedYear: year,
  introductionStatus: values([
    'not-established',
    'earliest-identified',
    'original-publication-confirmed',
  ]),
  primaryTask: values(v.tasks),
  tasks: list(values(v.tasks), 1),
  interactionModalities: list(values(v.modalities)),
  modalityDetails: nullable(text),
  inputDevices: list(text),
  deviceDetails: nullable(text),
  interactionDistance: nullable(list(values(v.distances), 1)),
  degreesOfFreedom: nullable({ type: 'integer', minimum: 0, maximum: 100 }),
  taxonomy,
  tags: list(text),
  advantages: list(text),
  limitations: list(text),
  howItWorks: nullable(text),
  relationships: list(
    object({
      id,
      status: values(['active', 'rejected', 'needs-evidence']),
      relationshipSource: values([
        'legacy-editorial',
        'machine-curated',
        'human-verified',
      ]),
      provenance: list(provenance, 1),
      techniqueId: id,
      type: values(v.relationships),
      notes: nullable(text),
      evidence: list(evidence),
    }),
  ),
  evidence: list(evidence),
  implementations: list(implementationShape),
  ...shared,
});
export const publicationShape = object({
  methodology: nullable(list(text, 1)),
  keywords: list(text),
  id,
  title: nullable(text),
  authors: list(text),
  year,
  venue: nullable(text),
  doi: nullable({ type: 'string', pattern: '^10\\.\\d{4,9}/\\S+$' }),
  url: nullable(url),
  abstract: nullable(text),
  bibtex: nullable(text),
  legacyCitations: list(text),
  access: values(['full-text', 'metadata-only', 'unavailable']),
  ...shared,
});
// Optional additive fields preserve all schema-v3 snapshots and stored curation history.
Object.assign(claimShape.properties!, { provenance: list(provenance) });
Object.assign(publicationShape.properties!, {
  publicationVenueType: values(publicationVenueTypes),
  publicationType: values(publicationTypes),
  bibtexKey: nullable(text),
  originalBibtex: nullable(text),
  bibliographic: object({
    entryType: nullable(text),
    journal: nullable(text),
    booktitle: nullable(text),
    volume: nullable(text),
    issue: nullable(text),
    pages: nullable(text),
    publisher: nullable(text),
  }),
  importProvenance: list(
    object({
      source: text,
      filename: nullable(text),
      originalKey: nullable(text),
      timestamp: text,
      url: nullable(url),
    }),
  ),
  survey: object({
    scope: nullable(text),
    yearsCovered: nullable(text),
    taxonomyIntroduced: nullable(text),
    tasks: list(text),
  }),
});
Object.assign(decisionShape.properties!, {
  adminId: text,
  timestamp: text,
  previousValue: {},
  newValue: {},
});
export const catalogueShape = object({
  schemaVersion: { const: 3 },
  claims: list(claimShape),
  publicationRelationships: list(relationshipShape),
  publicationSimilarities: list(similarityShape),
  curationDecisions: list(decisionShape),
  candidateLiterature: list(candidateShape),
  techniques: list(techniqueShape),
  publications: list(publicationShape),
  techniquePublications: list(
    object({
      techniqueId: id,
      publicationId: id,
      relationship: values(v.publicationRoles),
      evidence: list(evidence),
      notes: nullable(text),
    }),
  ),
  publicationCitations: list(
    object({
      citingPublicationId: id,
      citedPublicationId: id,
      discoveryMethod: values(['backward-citation', 'forward-citation']),
      evidence: list(evidence),
    }),
  ),
  reviewQueue: list(
    object({
      id,
      entityType: values(entityTypes),
      entityId: id,
      reasons: list(text, 1),
      status: values(['open', 'resolved']),
    }),
  ),
});
export const jsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: '3D Interaction Vault knowledge base v3',
  ...catalogueShape,
};
export function validateShape(
  value: unknown,
  shape: Shape,
  path = 'catalogue',
): void {
  const fail = (message: string): never => {
    throw new Error(`${path}: ${message}`);
  };
  if (shape.anyOf) {
    if (
      shape.anyOf.some((s) => {
        try {
          validateShape(value, s, path);
          return true;
        } catch {
          return false;
        }
      })
    )
      return;
    fail('value does not match an allowed type or vocabulary.');
  }
  if (shape.const !== undefined && value !== shape.const)
    fail(`must equal ${shape.const}.`);
  if (shape.type === 'null' && value !== null) fail('must be null.');
  if (shape.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      fail('expected an object.');
    const item = value as Record<string, unknown>;
    for (const key of shape.required ?? [])
      if (!(key in item)) fail(`missing required field ${key}.`);
    for (const [key, field] of Object.entries(item)) {
      const spec = shape.properties?.[key];
      if (spec) validateShape(field, spec, `${path}.${key}`);
      else if (shape.additionalProperties === false)
        fail(`unknown field ${key}.`);
    }
  }
  if (shape.type === 'array') {
    if (!Array.isArray(value)) fail('expected an array.');
    const a = value as unknown[];
    if (
      a.length < (shape.minItems ?? 0) ||
      a.length > (shape.maxItems ?? Infinity)
    )
      fail('array length is outside the allowed range.');
    if (
      shape.uniqueItems &&
      new Set(a.map((x) => JSON.stringify(x))).size !== a.length
    )
      fail('duplicate array values.');
    a.forEach((x, i) => {
      if (shape.items) validateShape(x, shape.items, `${path}[${i}]`);
    });
  }
  if (shape.type === 'string') {
    if (typeof value !== 'string') fail('expected text.');
    const s = value as string;
    if (
      !s.trim() ||
      s.length < (shape.minLength ?? 0) ||
      s.length > (shape.maxLength ?? Infinity)
    )
      fail('empty or overlong text.');
    if (shape.enum && !shape.enum.includes(s))
      fail(`invalid controlled value ${s}.`);
    if (shape.pattern && !new RegExp(shape.pattern).test(s))
      fail('invalid format.');
    if (shape.format === 'uri') {
      try {
        const u = new URL(s);
        if (
          !['http:', 'https:'].includes(u.protocol) ||
          u.username ||
          u.password
        )
          fail('only credential-free HTTP(S) URLs are allowed.');
      } catch {
        fail('invalid URL.');
      }
    }
    if (
      shape.format === 'date' &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(s) ||
        Number.isNaN(Date.parse(s)) ||
        new Date(s).toISOString().slice(0, 10) !== s)
    )
      fail('expected a real ISO date.');
  }
  if (
    shape.type === 'number' &&
    (typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < (shape.minimum ?? -Infinity) ||
      value > (shape.maximum ?? Infinity))
  )
    fail('invalid number');
  if (
    shape.type === 'integer' &&
    (!Number.isInteger(value) ||
      Number(value) < (shape.minimum ?? -Infinity) ||
      Number(value) > (shape.maximum ?? Infinity))
  )
    fail('invalid integer.');
}
