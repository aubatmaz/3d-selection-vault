import { normalize, displayValue } from './catalogue.ts';
import {
  ancestryTypes,
  symmetricRelationshipTypes,
  similarityDimensions,
  type Catalogue,
  type Publication,
  type PublicationSimilarity,
  type SimilarityWeights,
  type SimilarityDimension,
} from './model.ts';
export const defaultWeights: SimilarityWeights = {
  techniques: 3,
  tasks: 2,
  modalities: 1,
  devices: 1,
  environment: 1,
  target: 1,
  taxonomy: 2,
  methodology: 2,
  keywords: 1,
};
export const paperProfile = (d: Catalogue, id: string) => {
  const links = d.techniquePublications.filter((l) => l.publicationId === id);
  const ts = d.techniques.filter((t) =>
    links.some((l) => l.techniqueId === t.id),
  );
  const p = d.publications.find((p) => p.id === id);
  const uniq = (a: string[]) => [...new Set(a.map(normalize))].sort();
  const flatten = (value: unknown, prefix = ''): string[] =>
    value === null
      ? []
      : Array.isArray(value)
        ? value.map((x) => prefix + String(x))
        : typeof value === 'object'
          ? Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
              flatten(v, k + ':'),
            )
          : [];
  return {
    techniques: uniq(ts.map((t) => t.id)),
    tasks: uniq(ts.flatMap((t) => t.tasks)),
    modalities: uniq(ts.flatMap((t) => t.interactionModalities)),
    devices: uniq(ts.flatMap((t) => t.inputDevices)),
    environment: uniq(ts.flatMap((t) => t.taxonomy.general.environment ?? [])),
    target: uniq(
      ts.flatMap((t) => t.taxonomy.selection?.targetProperties ?? []),
    ),
    taxonomy: uniq(
      ts.flatMap((t) =>
        flatten({
          ...t.taxonomy,
          general: {
            controlMapping: t.taxonomy.general.controlMapping,
            bodyParts: t.taxonomy.general.bodyParts,
            directness: t.taxonomy.general.directness,
            feedbackModalities: t.taxonomy.general.feedbackModalities,
          },
          selection: t.taxonomy.selection
            ? { ...t.taxonomy.selection, targetProperties: null }
            : null,
        }),
      ),
    ),
    methodology: uniq(p?.methodology ?? []),
    keywords: uniq(p?.keywords ?? []),
  };
};
export function publicationSimilarity(
  d: Catalogue,
  a: string,
  b: string,
  weights: SimilarityWeights = defaultWeights,
): PublicationSimilarity {
  if (
    a === b ||
    !d.publications.some((p) => p.id === a) ||
    !d.publications.some((p) => p.id === b)
  )
    throw new Error('Similarity requires two existing distinct papers');
  if (
    Object.values(weights).some((w) => !Number.isFinite(w) || w < 0) ||
    Object.values(weights).every((w) => w === 0)
  )
    throw new Error('Invalid similarity weights');
  const [first, second] = [a, b].sort();
  return scoreProfiles(
    first,
    second,
    paperProfile(d, first),
    paperProfile(d, second),
    weights,
  );
}
function scoreProfiles(
  first: string,
  second: string,
  x: ReturnType<typeof paperProfile>,
  y: ReturnType<typeof paperProfile>,
  weights: SimilarityWeights,
): PublicationSimilarity {
  const dimensions = {} as PublicationSimilarity['dimensions'];
  const reasons: string[] = [];
  let total = 0,
    available = 0;
  for (const key of similarityDimensions) {
    const xs = x[key],
      ys = y[key];
    if (!xs.length || !ys.length) {
      dimensions[key] = null;
      continue;
    }
    const common = xs.filter((v) => ys.includes(v));
    const score = common.length / new Set([...xs, ...ys]).size;
    dimensions[key] = score;
    total += score * weights[key];
    available += weights[key];
    if (common.length) reasons.push(`Shared ${key}: ${common.join(', ')}`);
    if (score < 1)
      reasons.push(
        `Different ${key}: ${xs.filter((v) => !ys.includes(v)).join(', ') || '—'} / ${ys.filter((v) => !xs.includes(v)).join(', ') || '—'}`,
      );
  }
  if (!reasons.length)
    reasons.push(
      'Insufficient shared structured metadata; similarity is not established.',
    );
  return {
    id: `sim-${first}-with-${second}`,
    publicationAId: first,
    publicationBId: second,
    score: available ? total / available : 0,
    dimensions,
    reasons,
    provenance: {
      algorithm: 'weighted-jaccard-v1',
      weights: { ...weights },
      coverage: available / Object.values(weights).reduce((a, b) => a + b, 0),
      notes:
        'Research similarity from associated technique metadata and recorded paper methodology/keywords. Technique properties are proxies, not verified experimental properties of each paper. Missing dimensions are excluded. This is not evidence of historical influence.',
    },
  };
}
export function computeSimilarities(
  d: Catalogue,
  threshold = 0.15,
  weights = defaultWeights,
) {
  // Inverted features avoid comparing pairs with no possible shared signal.
  const profiles = new Map(
    d.publications.map((p) => [p.id, paperProfile(d, p.id)]),
  );
  const inverted = new Map<string, string[]>();
  for (const p of d.publications) {
    const profile = profiles.get(p.id)!;
    for (const dimension of similarityDimensions)
      if (weights[dimension] > 0)
        for (const token of profile[dimension]) {
          const key = dimension + ':' + token;
          const ids = inverted.get(key) ?? [];
          ids.push(p.id);
          inverted.set(key, ids);
        }
  }
  const pairs = new Set<string>();
  for (const ids of inverted.values())
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        pairs.add([ids[i], ids[j]].sort().join('|'));
  return [...pairs]
    .map((pair) => {
      const [a, b] = pair.split('|');
      return scoreProfiles(a, b, profiles.get(a)!, profiles.get(b)!, weights);
    })
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
export function traversePublications(
  d: Catalogue,
  start: string,
  direction: 'ancestors' | 'descendants',
  includeCitations = false,
) {
  if (!d.publications.some((p) => p.id === start))
    throw new Error('Unknown starting paper');
  const visited = new Set([start]);
  const result: string[] = [];
  const queue = [start];
  while (queue.length) {
    const id = queue.shift()!;
    for (const r of d.publicationRelationships) {
      if (
        r.status !== 'active' ||
        (!(
          (ancestryTypes as readonly string[]).includes(r.type) &&
          r.evidence.length
        ) &&
          !(includeCitations && r.type === 'cites'))
      )
        continue;
      const source =
          direction === 'ancestors'
            ? r.sourcePublicationId
            : r.targetPublicationId,
        target =
          direction === 'ancestors'
            ? r.targetPublicationId
            : r.sourcePublicationId;
      if (source === id && !visited.has(target)) {
        visited.add(target);
        queue.push(target);
        result.push(target);
      }
    }
  }
  return result;
}
export interface GraphFilters {
  query: string;
  from: string;
  to: string;
  venue: string;
  technique: string;
  task: string;
  modality: string;
  device: string;
  environment: string;
  relationship: string;
  verification: string;
  threshold: number;
  citations: boolean;
  lineage: boolean;
  similarity: boolean;
  family: string;
}
export const emptyGraphFilters: GraphFilters = {
  query: '',
  from: '',
  to: '',
  venue: 'all',
  technique: 'all',
  task: 'all',
  modality: 'all',
  device: 'all',
  environment: 'all',
  relationship: 'all',
  verification: 'all',
  threshold: 0.5,
  citations: true,
  lineage: true,
  similarity: false,
  family: 'all',
};
export const paperFamilies = (d: Catalogue, id: string) => {
  const p = paperProfile(d, id);
  const f: string[] = [];
  const has = (value: string) => p.techniques.some((t) => t.includes(value));
  if (has('ray')) f.push('Ray-based research');
  if (has('hand') || has('go-go')) f.push('Virtual-hand research');
  if (has('bubble')) f.push('Bubble / area selection');
  if (has('squad') || has('expand')) f.push('Progressive refinement');
  if (p.modalities.includes('gaze')) f.push('Gaze interaction');
  if (p.modalities.length > 1) f.push('Multiple-modality research');
  if (p.tasks.includes('navigation')) f.push('Navigation research');
  if (p.tasks.includes('system-control')) f.push('System control research');
  if (p.taxonomy.includes('handedness:bimanual'))
    f.push('Bimanual manipulation');
  return f;
};
export function searchPublications(d: Catalogue, query: string) {
  const q = normalize(query);
  const relationPatterns: [RegExp, string[]][] = [
    [/^papers? (?:extending|that extend) (.+)$/, ['extends']],
    [
      /^papers? (?:based on|building on) (.+)$/,
      ['builds-on', 'uses-technique-from', 'uses-method-from'],
    ],
    [/^papers? evaluating (.+)$/, ['evaluates']],
  ];
  const resolve = (s: string) =>
    d.publications
      .filter((p) => p.id === s || normalize(p.title ?? '') === s)
      .map((p) => p.id)
      .concat(
        d.techniquePublications
          .filter((l) =>
            d.techniques.some(
              (t) =>
                t.id === l.techniqueId &&
                [t.id, t.name, ...t.aliases].some((n) => normalize(n) === s),
            ),
          )
          .map((l) => l.publicationId),
      );
  const similar = q.match(
    /^papers? (?:similar to|using the same techniques as) (.+)$/,
  );
  if (similar) {
    const ids = new Set(resolve(similar[1]));
    const related = new Set(
      d.publicationSimilarities
        .filter(
          (s) =>
            s.score > 0 &&
            (ids.has(s.publicationAId) || ids.has(s.publicationBId)),
        )
        .flatMap((s) => [s.publicationAId, s.publicationBId]),
    );
    return d.publications.filter((p) => related.has(p.id) && !ids.has(p.id));
  }
  for (const [pattern, types] of relationPatterns) {
    const match = q.match(pattern);
    if (match) {
      const ids = new Set(resolve(match[1]));
      const results = new Set(
        d.publicationRelationships
          .filter(
            (r) =>
              r.status === 'active' &&
              types.includes(r.type) &&
              ids.has(r.targetPublicationId),
          )
          .map((r) => r.sourcePublicationId),
      );
      if (types.includes('evaluates'))
        for (const l of d.techniquePublications)
          if (
            l.relationship === 'evaluated' &&
            d.techniques.some(
              (t) =>
                t.id === l.techniqueId &&
                [t.id, t.name, ...t.aliases].some(
                  (n) => normalize(n) === match[1],
                ),
            )
          )
            results.add(l.publicationId);
      return d.publications.filter((p) => results.has(p.id));
    }
  }
  const comparing = q.match(
    /^papers? comparing (.+) and (.+?)(?: interaction)?$/,
  );
  if (comparing)
    return d.publications.filter((p) => {
      const profile = paperProfile(d, p.id);
      return (
        [comparing[1], comparing[2]].every((x) =>
          profile.modalities.includes(x),
        ) &&
        d.techniquePublications.some(
          (l) => l.publicationId === p.id && l.relationship === 'compared',
        )
      );
    });
  const terms = q.split(/\s+/).filter(Boolean);
  return d.publications.filter((p) => {
    const text = normalize(
      [
        p.title,
        ...p.authors,
        p.venue,
        p.year,
        p.doi,
        p.abstract,
        ...p.legacyCitations,
        JSON.stringify(paperProfile(d, p.id)),
        ...d.techniques
          .filter((t) =>
            d.techniquePublications.some(
              (l) => l.publicationId === p.id && l.techniqueId === t.id,
            ),
          )
          .flatMap((t) => [t.name, ...t.aliases]),
      ].join(' '),
    );
    return terms.every((t) => text.includes(t));
  });
}
export function graphData(d: Catalogue, f: GraphFilters) {
  const nodes = searchPublications(d, f.query).filter((p) => {
    const x = paperProfile(d, p.id);
    return (
      (!f.from || (p.year !== null && p.year >= Number(f.from))) &&
      (!f.to || (p.year !== null && p.year <= Number(f.to))) &&
      (f.venue === 'all' || p.venue === f.venue) &&
      (f.verification === 'all' || p.verificationStatus === f.verification) &&
      (
        ['technique', 'task', 'modality', 'device', 'environment'] as const
      ).every(
        (k) =>
          f[k] === 'all' ||
          x[
            (
              {
                technique: 'techniques',
                task: 'tasks',
                modality: 'modalities',
                device: 'devices',
                environment: 'environment',
              } as const
            )[k]
          ].includes(normalize(f[k])),
      ) &&
      (f.family === 'all' || paperFamilies(d, p.id).includes(f.family))
    );
  });
  const ids = new Set(nodes.map((p) => p.id));
  const edges = d.publicationRelationships
    .filter(
      (r) =>
        r.status === 'active' &&
        ids.has(r.sourcePublicationId) &&
        ids.has(r.targetPublicationId) &&
        (f.relationship === 'all' || r.type === f.relationship) &&
        (r.type === 'cites' ? f.citations : f.lineage),
    )
    .map((r) => ({
      id: r.id,
      source: r.sourcePublicationId,
      target: r.targetPublicationId,
      label: r.type as string,
      kind: r.type === 'cites' ? 'citation' : 'lineage',
      directed: !(symmetricRelationshipTypes as readonly string[]).includes(
        r.type,
      ),
      score: null as number | null,
    }));
  if (
    f.similarity &&
    (f.relationship === 'all' || f.relationship === 'similarity')
  )
    for (const s of d.publicationSimilarities)
      if (
        s.score >= f.threshold &&
        ids.has(s.publicationAId) &&
        ids.has(s.publicationBId)
      )
        edges.push({
          id: s.id,
          source: s.publicationAId,
          target: s.publicationBId,
          label: `Research similarity ${Math.round(s.score * 100)}%`,
          kind: 'similarity',
          directed: false,
          score: s.score,
        });
  return { nodes, edges };
}
export function publicationComparison(d: Catalogue, ids: string[]) {
  if (ids.length < 2 || ids.length > 6 || new Set(ids).size !== ids.length)
    throw new Error('Compare 2–6 distinct papers');
  const papers = ids.map((id) => {
    const p = d.publications.find((p) => p.id === id);
    if (!p) throw new Error('Unknown paper');
    return p;
  });
  const fields: [string, (p: Publication) => unknown][] = [
    ['Year', (p) => p.year],
    ['Venue', (p) => p.venue],
    ...(
      [
        'techniques',
        'tasks',
        'modalities',
        'devices',
        'environment',
        'methodology',
      ] as SimilarityDimension[]
    ).map(
      (k) =>
        [k, (p: Publication) => paperProfile(d, p.id)[k]] as [
          string,
          (p: Publication) => unknown,
        ],
    ),
    [
      'Technique roles',
      (p) =>
        d.techniquePublications
          .filter((l) => l.publicationId === p.id)
          .map((l) => `${l.techniqueId}: ${l.relationship}`),
    ],
    [
      'Citation / semantic links',
      (p) =>
        d.publicationRelationships
          .filter(
            (r) => r.sourcePublicationId === p.id && r.status === 'active',
          )
          .map((r) => r.type + ': ' + r.targetPublicationId),
    ],
    [
      'Similarity to first paper',
      (p) =>
        p.id === ids[0]
          ? '—'
          : Math.round(publicationSimilarity(d, ids[0], p.id).score * 100) +
            '% metadata similarity',
    ],
  ];
  return {
    papers,
    rows: fields.map(([label, get]) => ({
      label,
      values: papers.map((p) => displayValue(get(p))),
    })),
  };
}
export const timelineData = (d: Catalogue) => ({
  papers: d.publications
    .filter((p) => p.year !== null)
    .map((p) => ({ id: p.id, year: p.year!, title: p.title }))
    .sort((a, b) => a.year - b.year),
  relationships: d.publicationRelationships.filter(
    (r) =>
      r.status === 'active' &&
      (ancestryTypes as readonly string[]).includes(r.type) &&
      r.evidence.length,
  ),
});
