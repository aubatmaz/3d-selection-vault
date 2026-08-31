import { vocabulary as v } from './model.ts';
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
const taxonomy = object({
  selectionMechanism: nullable(list(values(v.mechanisms), 1)),
  controlMapping: nullable(list(values(v.mappings), 1)),
  targetCardinality: nullable(list(values(v.cardinalities), 1)),
  environment: nullable(list(values(v.environments), 1)),
  targetProperties: nullable(list(values(v.targetProperties), 1)),
  confirmationMethod: nullable(list(values(v.confirmations), 1)),
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
      techniqueId: id,
      type: values(v.relationships),
      notes: nullable(text),
      evidence: list(evidence),
    }),
  ),
  evidence: list(evidence),
  implementations: list(
    object({
      id,
      name: text,
      url,
      license: nullable(text),
      language: nullable(text),
      platform: nullable(text),
      notes: nullable(text),
      evidence: list(evidence),
    }),
  ),
  ...shared,
});
export const publicationShape = object({
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
export const catalogueShape = object({
  schemaVersion: { const: 2 },
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
      entityType: values(['technique', 'publication']),
      entityId: id,
      reasons: list(text, 1),
      status: values(['open', 'resolved']),
    }),
  ),
});
export const jsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: '3D Interaction Vault knowledge base v2',
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
    shape.type === 'integer' &&
    (!Number.isInteger(value) ||
      Number(value) < (shape.minimum ?? -Infinity) ||
      Number(value) > (shape.maximum ?? Infinity))
  )
    fail('invalid integer.');
}
