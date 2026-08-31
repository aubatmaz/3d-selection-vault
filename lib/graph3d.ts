import type { Catalogue } from './model.ts';
import { isSurvey } from './surveys.ts';
export interface GraphNode {
  id: string;
  recordId: string;
  kind: 'technique' | 'paper' | 'survey' | 'systematic-review' | 'taxonomy';
  label: string;
  year: number | null;
  task: string;
  x: number;
  y: number;
  z: number;
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  kind: 'citation' | 'lineage' | 'similarity' | 'association' | 'technique';
  directed: boolean;
  details: unknown;
}
export interface GraphOptions {
  perspective: string;
  layout: string;
  query: string;
  threshold: number;
  top: number;
  techniques: boolean;
  publications: boolean;
  citations: boolean;
  lineage: boolean;
  similarity: boolean;
  relations: boolean;
  surveysOnly: boolean;
  focus: string | null;
  hops: number;
  limit: number;
  hiddenTypes: string[];
}
export const defaultGraphOptions: GraphOptions = {
  perspective: 'Combined Graph',
  layout: 'Timeline',
  query: '',
  threshold: 0.7,
  top: 5,
  techniques: true,
  publications: true,
  citations: true,
  lineage: true,
  similarity: false,
  relations: true,
  surveysOnly: false,
  focus: null,
  hops: 1,
  limit: 200,
  hiddenTypes: [],
};
export function neighbors(
  nodes: GraphNode[],
  edges: GraphEdge[],
  focus: string,
  hops: number,
) {
  const visible = new Set([focus]);
  for (let i = 0; i < hops; i++) {
    const add = new Set<string>();
    for (const e of edges) {
      if (visible.has(e.source)) add.add(e.target);
      if (visible.has(e.target)) add.add(e.source);
    }
    for (const id of add) visible.add(id);
  }
  return nodes.filter((n) => visible.has(n.id));
}
export function graph3d(d: Catalogue, o: GraphOptions) {
  const mode = o.perspective;
  let nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  if (o.publications && mode !== 'Technique only')
    for (const p of d.publications) {
      const tech = d.techniques.find((t) =>
        d.techniquePublications.some(
          (a) => a.techniqueId === t.id && a.publicationId === p.id,
        ),
      );
      nodes.push({
        id: `p:${p.id}`,
        recordId: p.id,
        kind:
          p.publicationType === 'systematic-review'
            ? 'systematic-review'
            : p.publicationType === 'taxonomy'
              ? 'taxonomy'
              : isSurvey(p)
                ? 'survey'
                : 'paper',
        label: p.title || p.id,
        year: p.year,
        task: p.survey?.tasks[0] || tech?.primaryTask || 'general-3d',
        x: 0,
        y: 0,
        z: 0,
      });
    }
  if (o.techniques && ['Combined Graph', 'Technique Evolution'].includes(mode))
    for (const t of d.techniques)
      nodes.push({
        id: `t:${t.id}`,
        recordId: t.id,
        kind: 'technique',
        label: t.name,
        year: t.earliestIdentifiedYear,
        task: t.primaryTask,
        x: 0,
        y: 0,
        z: 0,
      });
  for (const r of d.publicationRelationships) {
    if (r.status !== 'active') continue;
    const citation = r.type === 'cites';
    if (
      citation
        ? !(
            o.citations &&
            [
              'Citation Network',
              'Combined Graph',
              'Technique Evolution',
            ].includes(mode)
          )
        : !(
            o.lineage &&
            mode !== 'Citation Network' &&
            mode !== 'Research Kinship' &&
            r.evidence.length
          )
    )
      continue;
    edges.push({
      id: r.id,
      source: `p:${r.sourcePublicationId}`,
      target: `p:${r.targetPublicationId}`,
      type: r.type,
      kind: citation ? 'citation' : 'lineage',
      directed: !['compares-with', 'contrasts-with'].includes(r.type),
      details: r,
    });
  }
  if (o.similarity && ['Research Kinship', 'Combined Graph'].includes(mode)) {
    const counts = new Map<string, number>();
    for (const s of [...d.publicationSimilarities]
      .filter((s) => s.score >= o.threshold)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))) {
      if (
        (counts.get(s.publicationAId) || 0) >= o.top ||
        (counts.get(s.publicationBId) || 0) >= o.top
      )
        continue;
      counts.set(s.publicationAId, (counts.get(s.publicationAId) || 0) + 1);
      counts.set(s.publicationBId, (counts.get(s.publicationBId) || 0) + 1);
      edges.push({
        id: s.id,
        source: `p:${s.publicationAId}`,
        target: `p:${s.publicationBId}`,
        type: `similarity ${s.score.toFixed(2)}`,
        kind: 'similarity',
        directed: false,
        details: s,
      });
    }
  }
  if (['Combined Graph', 'Technique Evolution'].includes(mode)) {
    for (const a of d.techniquePublications)
      edges.push({
        id: `a:${a.techniqueId}:${a.publicationId}:${a.relationship}`,
        source: `t:${a.techniqueId}`,
        target: `p:${a.publicationId}`,
        kind: 'association',
        type: a.relationship,
        directed: true,
        details: a,
      });
    if (o.relations)
      for (const t of d.techniques)
        for (const r of t.relationships.filter((r) => r.status === 'active'))
          edges.push({
            id: r.id,
            source: `t:${t.id}`,
            target: `t:${r.techniqueId}`,
            kind: 'technique',
            type: r.type,
            directed: !['conceptually-related', 'compared-with'].includes(
              r.type,
            ),
            details: r,
          });
  }
  const visibleEdges = edges.filter((e) => !o.hiddenTypes.includes(e.type));
  if (o.focus) nodes = neighbors(nodes, visibleEdges, o.focus, o.hops);
  else if (o.surveysOnly)
    nodes = nodes.filter((n) =>
      ['survey', 'systematic-review', 'taxonomy'].includes(n.kind),
    );
  if (o.query.trim()) {
    const q = o.query.toLowerCase();
    nodes = nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.recordId.includes(q) ||
        (n.kind !== 'technique' &&
          JSON.stringify(d.publications.find((p) => p.id === n.recordId))
            .toLowerCase()
            .includes(q)),
    );
  }
  const total = nodes.length;
  nodes = nodes
    .sort((a, b) => (a.year || 0) - (b.year || 0) || a.id.localeCompare(b.id))
    .slice(0, o.limit);
  const groups = [
    'selection',
    'manipulation',
    'navigation',
    'system-control',
    'general-3d',
  ];
  const parent = new Map(nodes.map((n) => [n.id, n.id]));
  const root = (id: string): string =>
    parent.get(id) !== id && parent.has(id) ? root(parent.get(id)!) : id;
  if (o.layout === 'Similarity Clusters')
    for (const s of d.publicationSimilarities.filter(
      (s) => s.score >= o.threshold,
    )) {
      const a = `p:${s.publicationAId}`,
        b = `p:${s.publicationBId}`;
      if (parent.has(a) && parent.has(b)) parent.set(root(a), root(b));
    }
  const clusters = [...new Set(nodes.map((n) => root(n.id)))];
  const positions = new Map<string, number>();
  for (const n of nodes) {
    const group =
      o.layout === 'Similarity Clusters'
        ? clusters.indexOf(root(n.id))
        : Math.max(0, groups.indexOf(n.task));
    const key = String(group);
    const i = positions.get(key) || 0;
    positions.set(key, i + 1);
    const angle = i * 2.399963;
    const radius = 20 + Math.sqrt(i) * 14;
    if (o.layout === 'Timeline') {
      n.x = group * 110 - 220 + Math.cos(angle) * radius;
      n.y = Math.sin(angle) * radius;
      n.z = n.year ? (n.year - 2000) * 9 : -300;
    } else {
      const theta =
        (group /
          Math.max(
            1,
            o.layout === 'Similarity Clusters' ? clusters.length : 5,
          )) *
        Math.PI *
        2;
      n.x = Math.cos(theta) * 190 + Math.cos(angle) * radius;
      n.y = Math.sin(theta) * 190 + Math.sin(angle) * radius;
      n.z = n.year ? (n.year - 2000) * 5 : -160;
    }
  }
  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    edges: visibleEdges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .slice(0, 1500),
    total,
  };
}

// Reserved extension point. Membership must be curated with evidence, never guessed from citation or task proximity.
export interface CuratedTechniqueFamily {
  id: string;
  label: string;
  techniqueIds: string[];
  evidence: import('./model.ts').Evidence[];
}
export const graphLayoutOptions = [
  { name: 'Timeline', available: true },
  { name: 'Interaction Tasks', available: true },
  { name: 'Similarity Clusters', available: true },
  {
    name: 'Technique Families',
    available: false,
    reason: 'Requires curated family membership and evidence.',
  },
] as const;
