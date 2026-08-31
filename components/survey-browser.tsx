'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { surveyFilter, surveySummary } from '@/lib/surveys';
import { downloadRecords } from '@/lib/bibliography';
import type { Catalogue, Publication, Technique } from '@/lib/model';
export function SurveyBrowser({
  data,
  onPublication,
  onGraph,
}: {
  data: Catalogue;
  onPublication: (p: Publication) => void;
  onGraph: (id: string) => void;
}) {
  const [task, setTask] = useState('');
  const [query, setQuery] = useState('');
  const results = surveyFilter(data, task).filter((p) =>
    JSON.stringify(p).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main id="main-content" tabIndex={-1} className="extension-workspace">
      <div className="section-label">LITERATURE MAP</div>
      <h1>Surveys & Reviews</h1>
      <p>
        Survey, systematic review, literature review, taxonomy and meta-analysis
        records. Counts reflect only evidenced associations indexed in this
        Vault.
      </p>
      <div className="extension-controls">
        <label>
          Research area
          <NativeSelect value={task} onChange={(e) => setTask(e.target.value)}>
            {[
              '',
              'selection',
              'manipulation',
              'navigation',
              'system-control',
              'general-3d',
            ].map((t) => (
              <option key={t} value={t}>
                {t || 'All surveys / reviews'}
              </option>
            ))}
          </NativeSelect>
        </label>
        <Input
          aria-label="Search surveys"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search survey literature"
        />
        <Button
          onClick={() =>
            downloadRecords({ publications: results, techniques: [] }, 'bib')
          }
        >
          Export results .bib
        </Button>
      </div>
      {!results.length && (
        <Button
          variant="outline"
          onClick={() => {
            setTask('');
            setQuery('');
          }}
        >
          Clear survey filters
        </Button>
      )}
      {!results.length && (
        <p>
          No survey papers match this area yet. Unknown publication types are
          not inferred from citations.
        </p>
      )}
      <div className="extension-list">
        {results.map((p) => {
          const s = surveySummary(data, p);
          return (
            <article key={p.id} className="extension-card">
              <span className="section-label">
                {p.publicationType} · {p.year || 'Year unknown'}
              </span>
              <h2>{p.title}</h2>
              <p>{p.authors.join('; ')}</p>
              <p>
                {s.techniques.length} evidenced techniques ·{' '}
                {s.referenced.length} indexed references ·{' '}
                {s.tasks.join(', ') || 'Scope not specified'}
              </p>
              <Button onClick={() => onPublication(p)}>
                Read paper record
              </Button>{' '}
              <Button variant="outline" onClick={() => onGraph(`p:${p.id}`)}>
                Explore in 3D
              </Button>
            </article>
          );
        })}
      </div>
    </main>
  );
}
export function SurveyFacts({
  data,
  p,
  onTechnique,
  onPublication,
  onGraph,
}: {
  data: Catalogue;
  p: Publication;
  onTechnique: (t: Technique) => void;
  onPublication: (p: Publication) => void;
  onGraph?: (id: string) => void;
}) {
  const s = surveySummary(data, p);
  return (
    <section className="extension-card">
      <h3>Survey scope</h3>
      <p>{p.survey?.scope || 'Not specified'}</p>
      <p>
        Years covered: {p.survey?.yearsCovered || 'Not specified'} · Taxonomy
        introduced: {p.survey?.taxonomyIntroduced || 'Not established'}
      </p>
      <p>
        Tasks: {s.tasks.join(', ') || 'Not specified'} · Evidenced techniques in
        Vault: {s.techniques.length} · Indexed references: {s.referenced.length}{' '}
        · Explicitly covered papers: {s.covered.length}
      </p>
      <h3>Techniques covered</h3>
      <p>
        {s.techniques.length} techniques represented in the Vault. This counts
        indexed surveyed associations, not a completion percentage.
      </p>
      {p.id === 'seed-argelaguet-2013' && (
        <p>
          Extraction scope: all 31 named Table 1 entries, plus
          World-in-Miniature from section 4.3. Supporting design patterns
          outside this scope are not claimed complete.
        </p>
      )}
      <ul className="survey-coverage-list">
        {s.techniques.map((t) => (
          <li key={t.id}>
            <Button variant="link" onClick={() => onTechnique(t)}>
              {t.name}
            </Button>
          </li>
        ))}
      </ul>
      <h3>Referenced papers</h3>
      <details>
        <summary>
          {s.referenced.length} indexed references — show papers
        </summary>
        <ul>
          {s.referenced.map((id) => {
            const item = data.publications.find((x) => x.id === id);
            return item ? (
              <li key={id}>
                <Button variant="link" onClick={() => onPublication(item)}>
                  {item.title || id}
                </Button>
              </li>
            ) : null;
          })}
        </ul>
      </details>
      <h3>Interaction families</h3>
      <p>
        Curated technique-family membership is not established. Selection
        mechanisms shown here are descriptive categories, not lineage:{' '}
        {[
          ...new Set(
            s.techniques.flatMap(
              (t) => t.taxonomy.selection?.selectionMechanism || [],
            ),
          ),
        ].join(', ') || 'not recorded'}
        .
      </p>
      {onGraph && (
        <Button onClick={() => onGraph(`p:${p.id}`)}>
          Expand survey coverage
        </Button>
      )}
      <p>
        Later evidenced surveys:{' '}
        {s.later.map((p) => p.title).join('; ') || 'None indexed'}. Citation
        alone is not survey coverage or lineage.
      </p>
    </section>
  );
}
