'use client';
import { useMemo, useState, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  graphData,
  emptyGraphFilters,
  paperFamilies,
  publicationComparison,
  traversePublications,
  type GraphFilters,
} from '@/lib/research';
import {
  publicationRelationshipTypes,
  vocabulary,
  type Catalogue,
  type Publication,
} from '@/lib/model';
export function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (s: string) => void;
}) {
  const inputId = useId();
  return (
    <label htmlFor={inputId} className="filter-control">
      <span className="filter-label">{label}</span>
      <NativeSelect
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <NativeSelectOption key={o} value={o}>
            {o === 'all' ? 'All' : o}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}
export function PaperResearch({
  data,
  paper,
  onPublication,
}: {
  data: Catalogue;
  paper: Publication;
  onPublication: (p: Publication) => void;
}) {
  const relations = data.publicationRelationships.filter(
    (r) =>
      r.status === 'active' &&
      (r.sourcePublicationId === paper.id ||
        r.targetPublicationId === paper.id),
  );
  const kin = data.publicationSimilarities
    .filter(
      (s) => s.publicationAId === paper.id || s.publicationBId === paper.id,
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const [includeCitations, setIncludeCitations] = useState(false);
  const navigate = (id: string) =>
    onPublication(data.publications.find((p) => p.id === id)!);
  return (
    <section className="detail-section">
      <h3>Research connections</h3>
      <p className="muted">
        Citation ≠ intellectual dependency. Research similarity ≠ historical
        influence.
      </p>
      <p>
        Research families (associated-metadata groups, not ancestry):{' '}
        {paperFamilies(data, paper.id).join(' · ') || 'Not established'}
      </p>
      <ul>
        {relations.map((r) => (
          <li key={r.id}>
            {r.targetPublicationId === paper.id ? 'Incoming: ' : 'Outgoing: '}
            <strong>{r.type}</strong>{' '}
            <Button
              variant="link"
              onClick={() =>
                navigate(
                  r.sourcePublicationId === paper.id
                    ? r.targetPublicationId
                    : r.sourcePublicationId,
                )
              }
            >
              {
                data.publications.find(
                  (p) =>
                    p.id ===
                    (r.sourcePublicationId === paper.id
                      ? r.targetPublicationId
                      : r.sourcePublicationId),
                )?.title
              }
            </Button>
            <small>{r.verificationStatus}</small>
            <p>{r.notes}</p>
            {r.evidence.map((e, i) => (
              <p key={i}>
                {e.section} {e.page} · {e.notes}
              </p>
            ))}
          </li>
        ))}
      </ul>
      {!relations.length && (
        <p>No evidence-backed paper connections established.</p>
      )}
      <h3>Ancestry & descendants</h3>
      <label>
        <input
          type="checkbox"
          checked={includeCitations}
          onChange={(e) => setIncludeCitations(e.target.checked)}
        />{' '}
        Include bibliographic citations (not ancestry claims)
      </label>
      {(['ancestors', 'descendants'] as const).map((direction) => (
        <div key={direction}>
          <h4>{direction}</h4>
          {traversePublications(
            data,
            paper.id,
            direction,
            includeCitations,
          ).map((id) => (
            <Button key={id} variant="link" onClick={() => navigate(id)}>
              {data.publications.find((p) => p.id === id)?.title}
            </Button>
          ))}
          {!traversePublications(data, paper.id, direction, includeCitations)
            .length && (
            <p>None established by the selected relationship types.</p>
          )}
        </div>
      ))}
      <h3>Research kinship</h3>
      {kin.map((s) => (
        <details key={s.id}>
          <summary>
            {Math.round(s.score * 100)}% metadata similarity ·{' '}
            {
              data.publications.find(
                (p) =>
                  p.id ===
                  (s.publicationAId === paper.id
                    ? s.publicationBId
                    : s.publicationAId),
              )?.title
            }
          </summary>
          <p>
            Metadata coverage: {Math.round(s.provenance.coverage * 100)}%.{' '}
            {s.provenance.notes}
          </p>
          <ul>
            {s.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <Button
            onClick={() =>
              navigate(
                s.publicationAId === paper.id
                  ? s.publicationBId
                  : s.publicationAId,
              )
            }
          >
            Open research kin
          </Button>
        </details>
      ))}
    </section>
  );
}
export function ResearchWorkbench({
  data,
  onPublication,
}: {
  data: Catalogue;
  onPublication: (p: Publication) => void;
}) {
  const [filters, setFilters] = useState<GraphFilters>(emptyGraphFilters),
    [mode, setMode] = useState('lineage'),
    [zoom, setZoom] = useState(1),
    [selected, setSelected] = useState<string[]>([]),
    [compare, setCompare] = useState(false),
    [edgeId, setEdgeId] = useState('');
  const graph = useMemo(() => graphData(data, filters), [data, filters]);
  const nodes = graph.nodes.slice(0, 80);
  const ids = new Set(nodes.map((p) => p.id));
  const edges = graph.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .slice(0, 150);
  const size = 1200;
  const positions = new Map(
    nodes.map((p, i) => [
      p.id,
      {
        x:
          size / 2 +
          460 * Math.cos((i / Math.max(nodes.length, 1)) * Math.PI * 2),
        y:
          size / 2 +
          460 * Math.sin((i / Math.max(nodes.length, 1)) * Math.PI * 2),
      },
    ]),
  );
  const edge = graph.edges.find((e) => e.id === edgeId);
  const sim = data.publicationSimilarities.find((s) => s.id === edgeId);
  const relationship = data.publicationRelationships.find(
    (r) => r.id === edgeId,
  );
  const update = <K extends keyof GraphFilters>(k: K, v: GraphFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));
  const compareData =
    compare && selected.length >= 2
      ? publicationComparison(data, selected)
      : null;
  return (
    <section
      aria-label="Advanced publication comparison"
      className="research-workbench"
    >
      <div className="research-heading">
        <div>
          <div className="eyebrow">CONNECTED RESEARCH</div>
          <h1>Explore the paper graph.</h1>
          <p>
            Citations, supported scholarly relationships, and explainable
            metadata similarity.
          </p>
        </div>
        <div>
          <Button
            variant={mode === 'lineage' ? 'default' : 'outline'}
            onClick={() => {
              setMode('lineage');
              setFilters((f) => ({
                ...f,
                citations: true,
                lineage: true,
                similarity: false,
              }));
            }}
          >
            Research lineage
          </Button>
          <Button
            variant={mode === 'kinship' ? 'default' : 'outline'}
            onClick={() => {
              setMode('kinship');
              setFilters((f) => ({
                ...f,
                citations: false,
                lineage: false,
                similarity: true,
              }));
            }}
          >
            Research kinship
          </Button>
        </div>
      </div>
      <div className="graph-filters">
        <label htmlFor="graph-query" className="filter-control">
          Publication / structured search
          <Input
            id="graph-query"
            value={filters.query}
            placeholder="papers extending Go-Go"
            onChange={(e) => update('query', e.target.value)}
          />
        </label>
        <label htmlFor="graph-from">
          Year from
          <Input
            id="graph-from"
            type="number"
            value={filters.from}
            onChange={(e) => update('from', e.target.value)}
          />
        </label>
        <label htmlFor="graph-to">
          Year to
          <Input
            id="graph-to"
            type="number"
            value={filters.to}
            onChange={(e) => update('to', e.target.value)}
          />
        </label>
        <FieldSelect
          label="Venue"
          value={filters.venue}
          options={[
            'all',
            ...new Set(
              data.publications
                .map((p) => p.venue)
                .filter((s): s is string => !!s),
            ),
          ]}
          onChange={(s) => update('venue', s)}
        />
        <FieldSelect
          label="Technique"
          value={filters.technique}
          options={['all', ...data.techniques.map((t) => t.id)]}
          onChange={(s) => update('technique', s)}
        />
        <FieldSelect
          label="Task"
          value={filters.task}
          options={['all', ...vocabulary.tasks]}
          onChange={(s) => update('task', s)}
        />
        <FieldSelect
          label="Modality"
          value={filters.modality}
          options={['all', ...vocabulary.modalities]}
          onChange={(s) => update('modality', s)}
        />
        <FieldSelect
          label="Device"
          value={filters.device}
          options={[
            'all',
            ...new Set(data.techniques.flatMap((t) => t.inputDevices)),
          ]}
          onChange={(s) => update('device', s)}
        />
        <FieldSelect
          label="Environment"
          value={filters.environment}
          options={['all', ...vocabulary.environments]}
          onChange={(s) => update('environment', s)}
        />
        <FieldSelect
          label="Relationship"
          value={filters.relationship}
          options={['all', ...publicationRelationshipTypes, 'similarity']}
          onChange={(s) => update('relationship', s)}
        />
        <FieldSelect
          label="Verification"
          value={filters.verification}
          options={['all', ...vocabulary.verification]}
          onChange={(s) => update('verification', s)}
        />
        <FieldSelect
          label="Research family (not lineage)"
          value={filters.family}
          options={[
            'all',
            ...new Set(
              data.publications.flatMap((p) => paperFamilies(data, p.id)),
            ),
          ]}
          onChange={(s) => update('family', s)}
        />
      </div>
      <div className="graph-toolbar">
        {(['citations', 'lineage', 'similarity'] as const).map((k) => (
          <label key={k}>
            <input
              type="checkbox"
              checked={filters[k]}
              onChange={(e) => update(k, e.target.checked)}
            />{' '}
            Show {k}
          </label>
        ))}
        <label>
          Minimum similarity {Math.round(filters.threshold * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step=".05"
            value={filters.threshold}
            onChange={(e) => update('threshold', Number(e.target.value))}
          />
        </label>
        <label>
          Zoom
          <input
            type="range"
            min=".5"
            max="2"
            step=".1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <Button variant="outline" onClick={() => setFilters(emptyGraphFilters)}>
          Reset filters
        </Button>
      </div>
      <p className="graph-legend">
        Thin arrow → citation · Thick labeled arrow → supported scholarly
        relation · Dashed line — research similarity (undirected). Symmetric
        comparisons have no arrowheads.
      </p>
      <output>
        {graph.nodes.length} papers · {graph.edges.length} connections.
        Rendering up to 80 papers and 150 edges; filter to narrow large graphs.
      </output>
      <div className="graph-scroll">
        <svg
          width={size * zoom}
          height={size * zoom}
          viewBox={`0 0 ${size} ${size}`}
          aria-label="Publication connections; equivalent clickable paper and edge lists follow"
        >
          <defs>
            <marker
              id="paper-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {edges.map((e) => {
            const a = positions.get(e.source)!,
              b = positions.get(e.target)!;
            const angle = Math.atan2(b.y - a.y, b.x - a.x);
            return (
              <g key={e.id}>
                <line
                  x1={a.x + 85 * Math.cos(angle)}
                  y1={a.y + 35 * Math.sin(angle)}
                  x2={b.x - 85 * Math.cos(angle)}
                  y2={b.y - 35 * Math.sin(angle)}
                  stroke={e.id === edgeId ? '#bf642d' : '#719487'}
                  strokeWidth={e.kind === 'lineage' ? 3 : 1}
                  strokeDasharray={e.kind === 'similarity' ? '6 5' : undefined}
                  markerEnd={e.directed ? 'url(#paper-arrow)' : undefined}
                />
                {e.kind !== 'similarity' && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2}
                    fontSize="11"
                    fill="#214e3d"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}
          {nodes.map((p) => {
            const pos = positions.get(p.id)!;
            return (
              <foreignObject
                key={p.id}
                x={pos.x - 88}
                y={pos.y - 30}
                width="176"
                height="68"
              >
                <button
                  className="graph-node"
                  onClick={() => onPublication(p)}
                  title={p.title ?? p.id}
                >
                  <span>{p.year ?? 'Year unknown'}</span>
                  {p.title ?? p.id}
                </button>
              </foreignObject>
            );
          })}
        </svg>
      </div>
      {edge && (
        <section className="edge-inspector">
          <h3>{edge.label}</h3>
          {sim ? (
            <>
              <p>
                {sim.provenance.notes} Coverage:{' '}
                {Math.round(sim.provenance.coverage * 100)}%
              </p>
              <ul>
                {sim.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p>
                {relationship?.verificationStatus} · {relationship?.notes}
              </p>
              {relationship?.evidence.map((e, i) => (
                <p key={i}>
                  {e.publicationId} · {e.section} · {e.page} · {e.notes}
                </p>
              ))}
            </>
          )}
        </section>
      )}
      <details>
        <summary>
          Accessible connection list ({graph.edges.length}) — inspect evidence
          and similarity explanations
        </summary>
        <ul>
          {graph.edges.map((e) => (
            <li key={e.id}>
              <Button variant="link" onClick={() => setEdgeId(e.id)}>
                {e.source} {e.directed ? '→' : '↔'} {e.target} · {e.label}
              </Button>
            </li>
          ))}
        </ul>
      </details>
      <h2>Papers & comparison</h2>
      <p>
        Select two to six papers. Comparison is separate from technique
        comparison.
      </p>
      <div className="paper-select-list">
        {graph.nodes.map((p) => (
          <div key={p.id}>
            <label>
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                disabled={!selected.includes(p.id) && selected.length >= 6}
                onChange={() =>
                  setSelected((s) =>
                    s.includes(p.id)
                      ? s.filter((id) => id !== p.id)
                      : [...s, p.id],
                  )
                }
              />
              <span>{p.year ?? '—'}</span>
            </label>
            <Button variant="link" onClick={() => onPublication(p)}>
              {p.title ?? p.id}
            </Button>
          </div>
        ))}
      </div>
      <Button disabled={selected.length < 2} onClick={() => setCompare(true)}>
        Compare {selected.length} papers
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          setSelected([]);
          setCompare(false);
        }}
      >
        Clear comparison
      </Button>
      {compareData && (
        <div className="paper-comparison">
          <table>
            <thead>
              <tr>
                <th>Dimension</th>
                {compareData.papers.map((p) => (
                  <th key={p.id}>{p.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareData.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {r.values.map((v, i) => (
                    <td key={compareData.papers[i].id}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
