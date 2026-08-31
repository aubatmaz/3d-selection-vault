'use client';
import { isSurvey } from '@/lib/surveys';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { ContextHelp } from './user-guidance';
import { WebGLGraph } from './webgl-graph';
import { ResearchWorkbench } from './research-workbench';
import {
  graph3d,
  defaultGraphOptions,
  type GraphEdge,
  type GraphNode,
} from '@/lib/graph3d';
import { downloadRecords } from '@/lib/bibliography';
import type { Catalogue, Publication, Technique } from '@/lib/model';
export function GraphExplorer({
  data,
  onPublication,
  onTechnique,
  initialFocus,
}: {
  data: Catalogue;
  onPublication: (p: Publication) => void;
  onTechnique: (t: Technique) => void;
  initialFocus?: string | null;
}) {
  const [options, setOptions] = useState({
    ...defaultGraphOptions,
    focus: initialFocus || null,
  });
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [edge, setEdge] = useState<GraphEdge | null>(null);
  const [reset, setReset] = useState(0);
  const [camera, setCamera] = useState<string | null>(null);
  const graph = useMemo(() => graph3d(data, options), [data, options]);
  const update = (v: Partial<typeof options>) =>
    setOptions((o) => ({ ...o, ...v }));
  const select = (n: GraphNode) => {
    setSelected(n);
    if (n.kind === 'technique') {
      const t = data.techniques.find((t) => t.id === n.recordId);
      if (t) onTechnique(t);
    } else {
      const p = data.publications.find((p) => p.id === n.recordId);
      if (p) onPublication(p);
    }
  };
  return (
    <main id="main-content" tabIndex={-1} className="extension-workspace">
      <div className="section-label">RESEARCH SPACE · THREE DIMENSIONS</div>
      <h1>3D knowledge graph</h1>
      <p>
        Citation, evidence-backed lineage, and computed similarity remain
        separate. Timeline depth represents year; undated records occupy a
        separate plane.
      </p>
      {options.focus &&
        data.publications.some(
          (p) => `p:${p.id}` === options.focus && isSurvey(p),
        ) && (
          <Button
            onClick={() =>
              update({
                ...defaultGraphOptions,
                focus: options.focus,
                hops: 1,
                similarity: false,
                lineage: false,
              })
            }
          >
            Expand survey coverage
          </Button>
        )}
      <div className="extension-controls">
        <ContextHelp title="Research Kinship">
          Shows papers with similar research characteristics. Similarity does
          not imply influence or historical lineage.
        </ContextHelp>
        <ContextHelp title="Scholarly lineage">
          Only evidence-backed relationships support extends or builds-on
          claims. Citation alone is not enough.
        </ContextHelp>
        <ContextHelp title="Layouts">
          Interaction Tasks groups recorded interaction tasks. Technique
          Families is reserved for future curated membership. Similarity
          Clusters are similarity groupings, not lineage.
        </ContextHelp>
      </div>
      <div className="extension-controls">
        <label>
          Perspective
          <NativeSelect
            value={options.perspective}
            onChange={(e) =>
              update({
                perspective: e.target.value,
                similarity:
                  e.target.value === 'Research Kinship' || options.similarity,
              })
            }
          >
            {[
              'Research Lineage',
              'Citation Network',
              'Research Kinship',
              'Technique Evolution',
              'Combined Graph',
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </NativeSelect>
        </label>
        <label>
          Layout
          <NativeSelect
            value={options.layout}
            onChange={(e) => update({ layout: e.target.value })}
          >
            {['Timeline', 'Interaction Tasks', 'Similarity Clusters'].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </NativeSelect>
        </label>
        <label htmlFor="graph-search">
          Find publication or technique
          <Input
            id="graph-search"
            value={options.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Title, author, DOI or technique"
          />
        </label>
        <label htmlFor="graph-threshold">
          Similarity ≥ {options.threshold.toFixed(2)}
          <Input
            id="graph-threshold"
            type="range"
            min="0"
            max="1"
            step=".05"
            value={options.threshold}
            onChange={(e) => update({ threshold: Number(e.target.value) })}
          />
        </label>
        <label htmlFor="graph-top">
          Similar neighbors
          <NativeSelect
            id="graph-top"
            value={options.top}
            onChange={(e) => update({ top: Number(e.target.value) })}
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
          </NativeSelect>
        </label>
      </div>
      <div className="extension-controls">
        {(
          [
            'techniques',
            'publications',
            'citations',
            'lineage',
            'similarity',
            'relations',
            'surveysOnly',
          ] as const
        ).map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(e) =>
                update({
                  [key]: e.target.checked,
                  focus: key === 'surveysOnly' ? null : options.focus,
                })
              }
            />{' '}
            {key.replace('surveysOnly', 'Only surveys / reviews')}
          </label>
        ))}
      </div>
      <div className="extension-controls">
        <Button
          variant="outline"
          onClick={() => {
            setReset((x) => x + 1);
            setCamera(null);
          }}
        >
          Reset camera
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setOptions({ ...defaultGraphOptions });
            setCamera(null);
            setSelected(null);
            setEdge(null);
            setReset((x) => x + 1);
          }}
        >
          Reset graph
        </Button>
        <Button disabled={!selected} onClick={() => setCamera(selected!.id)}>
          Focus selected node
        </Button>
        <Button
          disabled={!selected}
          onClick={() => update({ focus: selected!.id, hops: 1, query: '' })}
        >
          Isolate branch
        </Button>
        <Button
          disabled={!options.focus}
          onClick={() => update({ hops: Math.min(5, options.hops + 1) })}
        >
          Expand one level ({options.hops})
        </Button>
        <Button disabled={!options.focus} onClick={() => update({ hops: 0 })}>
          Collapse to selected
        </Button>
        <Button
          variant="outline"
          onClick={() => update({ focus: null, hops: 1, query: '' })}
        >
          Show all
        </Button>
        <Button
          variant="outline"
          onClick={() => update({ limit: Math.min(1000, options.limit + 200) })}
        >
          Load 200 more
        </Button>
      </div>
      <p>
        {graph.nodes.length} of {graph.total} matching nodes ·{' '}
        {graph.edges.length} visible edges. Labels simplify above 100 nodes.
      </p>
      {!graph.edges.length && (
        <section className="extension-card">
          <h2>No relationships are visible</h2>
          <p>
            Try lowering the similarity threshold, enabling citations, or
            clearing graph filters.
          </p>
          <Button
            onClick={() => {
              setOptions({ ...defaultGraphOptions });
              setCamera(null);
              setSelected(null);
              setEdge(null);
              setReset((x) => x + 1);
            }}
          >
            Reset graph
          </Button>
        </section>
      )}
      <WebGLGraph
        nodes={graph.nodes}
        edges={graph.edges}
        onNode={select}
        onEdge={setEdge}
        focus={camera}
        reset={reset}
      />
      <p>
        <strong>Shapes:</strong> sphere = publication; cube = technique; pyramid
        = survey/review; octahedron = systematic review; ring = taxonomy.{' '}
        <strong>Edges:</strong> thin blue arrows = cites; amber arrows =
        lineage; purple dashed, no arrow = similarity; teal = typed
        technique–paper association.
      </p>
      <div className="extension-controls">
        {(['json', 'bib', 'csv'] as const).map((format) => (
          <Button
            key={format}
            variant="outline"
            onClick={() =>
              downloadRecords(
                {
                  publications: data.publications.filter((p) =>
                    graph.nodes.some((n) => n.id === `p:${p.id}`),
                  ),
                  techniques: data.techniques.filter((t) =>
                    graph.nodes.some((n) => n.id === `t:${t.id}`),
                  ),
                },
                format,
              )
            }
          >
            Export visible graph .{format}
          </Button>
        ))}
      </div>
      <details>
        <summary>Hide relationship types</summary>
        <div className="extension-controls">
          {[
            ...new Set(
              graph.edges.map((e) => e.type).concat(options.hiddenTypes),
            ),
          ].map((type) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={!options.hiddenTypes.includes(type)}
                onChange={(e) =>
                  update({
                    hiddenTypes: e.target.checked
                      ? options.hiddenTypes.filter((x) => x !== type)
                      : [...options.hiddenTypes, type],
                  })
                }
              />
              {type}
            </label>
          ))}
        </div>
      </details>
      {edge && (
        <section className="extension-card">
          <h2>
            {edge.type} · {edge.directed ? 'directed' : 'undirected'}
          </h2>
          <p>
            {edge.source} → {edge.target}
          </p>
          <pre>{JSON.stringify(edge.details, null, 2)}</pre>
          <Button onClick={() => setEdge(null)}>Close evidence</Button>
        </section>
      )}
      <details>
        <summary>Accessible node list ({graph.nodes.length})</summary>
        <div className="extension-list">
          {graph.nodes.map((n) => (
            <div key={n.id}>
              <Button variant="link" onClick={() => select(n)}>
                {n.label}
              </Button>{' '}
              <span>
                {n.kind} · {n.year || 'undated'}
              </span>
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(n);
                  setCamera(n.id);
                }}
              >
                Focus
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  update({
                    focus: n.id,
                    hops: 1,
                    query: '',
                    surveysOnly: false,
                  })
                }
              >
                Neighbors
              </Button>
            </div>
          ))}
        </div>
      </details>
      <details>
        <summary>Accessible edge list and evidence</summary>
        {graph.edges.map((e) => (
          <p key={e.id}>
            <Button variant="link" onClick={() => setEdge(e)}>
              {e.source} — {e.type} — {e.target}
            </Button>
          </p>
        ))}
      </details>
      <details>
        <summary>Advanced paper filters, comparison and 2D fallback</summary>
        <ResearchWorkbench data={data} onPublication={onPublication} />
      </details>
    </main>
  );
}
