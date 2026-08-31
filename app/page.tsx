'use client';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Box, Search, ArrowUpRight, Upload, Download, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  TechniqueDetails,
  PublicationDetails,
  Comparison,
  VerificationBadge,
} from '@/components/vault-details';
import { ImportDashboard } from '@/components/import-dashboard';
import { ExportPanel } from '@/components/export-panel';
import { AdminAnalytics } from '@/components/visit-counter';
import { FirstVisitGuide } from '@/components/user-guidance';
import { publicationVenueTypes } from '@/lib/publication-venue';
import { GraphExplorer } from '@/components/graph-explorer';
import { SurveyBrowser } from '@/components/survey-browser';
import { CurationPanel } from '@/components/curation-panel';
import { searchPublications } from '@/lib/research';
import database from '@/data/techniques.json';
import {
  categories,
  categoryLabel,
  vocabulary,
  emptyFilters,
  buildSearchIndex,
  filterTechniques,
  validateCatalogue,
  type Technique,
  type Publication,
  type Filters,
  type Catalogue,
} from '@/lib/catalogue';
const seed = validateCatalogue(database);
function Choice({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="filter-control">
      <span className="filter-label">{label}</span>
      <Select
        value={value}
        onValueChange={(v) => v !== null && onChange(String(v))}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue>
            {values.find((v) => v.value === value)?.label ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {values.map((v) => (
            <SelectItem value={v.value} key={v.value}>
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
const choices = (items: readonly string[], unknown = false) => [
  { value: 'all', label: 'All' },
  ...items.map((v) => ({ value: v, label: categoryLabel(v) })),
  ...(unknown ? [{ value: 'unknown', label: 'Not specified' }] : []),
];
export default function Page() {
  const [surface, setSurface] = useState('catalogue');
  const [role, setRole] = useState('viewer');
  const [graphFocus, setGraphFocus] = useState<string | null>(null);
  const [graphRequest, setGraphRequest] = useState(0);
  const [revision, setRevision] = useState<number | null>(null);
  const [data, setData] = useState<Catalogue>(seed),
    [filters, setFilters] = useState<Filters>(emptyFilters),
    [sort, setSort] = useState('name'),
    [page, setPage] = useState(1);
  const [view, setView] = useState<'techniques' | 'publications'>('techniques');
  const [detail, setDetail] = useState<
    | { kind: 'technique'; record: Technique }
    | { kind: 'publication'; record: Publication }
    | null
  >(null);
  const [compareIds, setCompareIds] = useState<string[]>([]),
    [compareOpen, setCompareOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadStatus, setLoadStatus] = useState('Loading saved publications…');
  const [venueType, setVenueType] = useState('all');
  useEffect(() => {
    let active = true;
    void fetch('/api/curation')
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            'Saved catalogue unavailable. You can browse the bundled catalogue; reload to reconnect before curating.',
          );
        const result = (await r.json()) as {
          catalogue: unknown;
          role: string;
          revision: number;
        };
        if (active) {
          setData(validateCatalogue(result.catalogue));
          setRevision(result.revision);
          setRole(result.role);
          setLoadStatus('Saved catalogue loaded.');
        }
      })
      .catch((e) => {
        if (active) setLoadStatus(String(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const saved = (d: Catalogue, r: number) => {
    setData(validateCatalogue(d));
    setRevision(r);
  };
  const update = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const reset = () => {
    setFilters(emptyFilters);
    setVenueType('all');
    setPage(1);
  };
  const index = useMemo(() => buildSearchIndex(data), [data]);
  const records = useMemo(
    () =>
      filterTechniques(data, filters, index).sort((a, b) =>
        sort === 'name'
          ? a.name.localeCompare(b.name)
          : sort === 'oldest'
            ? (a.introducedYear ?? 9999) - (b.introducedYear ?? 9999) ||
              a.name.localeCompare(b.name)
            : (b.introducedYear ?? 0) - (a.introducedYear ?? 0) ||
              a.name.localeCompare(b.name),
      ),
    [data, filters, index, sort],
  );
  const publications = useMemo(
    () =>
      searchPublications(data, filters.query)
        .filter(
          (p) =>
            venueType === 'all' ||
            (p.publicationVenueType || 'unknown') === venueType,
        )
        .filter(
          (p) =>
            filters.verification === 'all' ||
            p.verificationStatus === filters.verification,
        )
        .sort((a, b) => (a.title ?? a.id).localeCompare(b.title ?? b.id)),
    [data, filters.query, filters.verification, venueType],
  );
  const count = view === 'techniques' ? records.length : publications.length,
    pages = Math.ceil(count / 12);
  const showTechnique = (t: Technique) =>
      setDetail({ kind: 'technique', record: t }),
    showPublication = (p: Publication) =>
      setDetail({ kind: 'publication', record: p });
  const toggleCompare = (id: string) =>
    setCompareIds((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length < 6
          ? [...ids, id]
          : ids,
    );
  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Box size={21} />
          </span>
          3D Interaction Vault
          <span className="brand-tag">RESEARCH LIBRARY</span>
        </Link>
        <div className="header-actions">
          <Button
            variant={surface === 'catalogue' ? 'default' : 'ghost'}
            onClick={() => setSurface('catalogue')}
          >
            Catalogue
          </Button>
          <Button
            variant={surface === 'graph' ? 'default' : 'ghost'}
            onClick={() => setSurface('graph')}
          >
            3D graph & compare
          </Button>
          {role === 'admin' && (
            <Button
              variant={surface === 'curation' ? 'default' : 'ghost'}
              onClick={() => setSurface('curation')}
            >
              Curation
            </Button>
          )}
          <Button
            variant={surface === 'surveys' ? 'default' : 'ghost'}
            onClick={() => setSurface('surveys')}
          >
            Surveys & Reviews
          </Button>
          <Link href="/how-to-use" className="help-link">
            How to use
          </Link>
          <Button variant="ghost" onClick={() => setAboutOpen(true)}>
            About
          </Button>
          <Button variant="outline" onClick={() => setSurface('exports')}>
            <Download />
            Export
          </Button>
          {role === 'admin' && (
            <Button
              onClick={() => {
                setSurface('imports');
              }}
            >
              <Upload />
              Import records
            </Button>
          )}
        </div>
      </header>
      <div className="location-bar">
        <nav aria-label="Breadcrumb">
          <button onClick={() => setSurface('catalogue')}>Home</button> ›{' '}
          {
            (
              {
                catalogue: 'Catalogue',
                graph: '3D graph',
                surveys: 'Surveys & Reviews',
                curation: 'Admin curation',
                imports: 'Admin imports',
                exports: 'Export',
              } as Record<string, string>
            )[surface]
          }
        </nav>
        <output aria-live="polite">{loadStatus}</output>
      </div>
      <FirstVisitGuide />
      {surface === 'imports' && role === 'admin' && (
        <ImportDashboard onSaved={saved} />
      )}
      {surface === 'exports' && (
        <ExportPanel data={data} results={publications} techniques={records} />
      )}
      {surface === 'surveys' && (
        <SurveyBrowser
          data={data}
          onPublication={showPublication}
          onGraph={(id) => {
            setGraphFocus(id);
            setGraphRequest((n) => n + 1);
            setSurface('graph');
          }}
        />
      )}
      {surface === 'graph' && (
        <GraphExplorer
          key={`${graphFocus || 'all'}-${graphRequest}`}
          data={data}
          onPublication={showPublication}
          onTechnique={showTechnique}
          initialFocus={graphFocus}
        />
      )}
      {surface === 'curation' && role === 'admin' && (
        <>
          <CurationPanel data={data} revision={revision} onSaved={saved} />
          <div className="extension-workspace">
            <AdminAnalytics />
          </div>
        </>
      )}
      {surface === 'catalogue' && (
        <main id="main-content" tabIndex={-1} className="workspace">
          <aside>
            <div className="section-label">KNOWLEDGE BASE</div>
            <div className="view-switch">
              <Button
                variant={view === 'techniques' ? 'default' : 'outline'}
                onClick={() => {
                  setView('techniques');
                  setPage(1);
                }}
              >
                Techniques
              </Button>
              <Button
                variant={view === 'publications' ? 'default' : 'outline'}
                onClick={() => {
                  setView('publications');
                  reset();
                }}
              >
                Publications ({data.publications.length})
              </Button>
            </div>
            {view === 'techniques' && (
              <>
                <nav aria-label="Primary interaction task">
                  <Button
                    variant="ghost"
                    className={
                      'nav-item ' + (filters.category === 'all' ? 'active' : '')
                    }
                    onClick={() => update('category', 'all')}
                    aria-pressed={filters.category === 'all'}
                  >
                    All techniques<span>{data.techniques.length}</span>
                  </Button>
                  {categories.map((c) => (
                    <Button
                      variant="ghost"
                      className={
                        'nav-item ' + (filters.category === c ? 'active' : '')
                      }
                      key={c}
                      onClick={() => update('category', c)}
                      aria-pressed={filters.category === c}
                    >
                      {categoryLabel(c)}
                      <span>
                        {
                          data.techniques.filter((t) => t.primaryTask === c)
                            .length
                        }
                      </span>
                    </Button>
                  ))}
                </nav>
                <p className="filter-help">
                  Browse by primary task. Supported-task filtering includes
                  secondary tasks.
                </p>
              </>
            )}
            <div className="filter-heading">
              <span className="section-label">REFINE RESULTS</span>
              <Button variant="link" onClick={reset}>
                Reset
              </Button>
            </div>
            <div className="filter-fields">
              {view === 'publications' && (
                <Choice
                  label="Venue type"
                  value={venueType}
                  onChange={setVenueType}
                  values={choices(publicationVenueTypes)}
                />
              )}
              <Choice
                label="Verification"
                value={filters.verification}
                values={choices(vocabulary.verification)}
                onChange={(v) => update('verification', v)}
              />
              {view === 'techniques' && (
                <>
                  <Choice
                    label="Supported task"
                    value={filters.task}
                    values={choices(categories)}
                    onChange={(v) => update('task', v)}
                  />
                  <Choice
                    label="Modality"
                    value={filters.modality}
                    values={choices(vocabulary.modalities)}
                    onChange={(v) => update('modality', v)}
                  />
                  <Choice
                    label="Input device"
                    value={filters.device}
                    values={choices(
                      [
                        ...new Set(
                          data.techniques.flatMap((t) => t.inputDevices),
                        ),
                      ].sort(),
                    )}
                    onChange={(v) => update('device', v)}
                  />
                  <Choice
                    label="Environment"
                    value={filters.environment}
                    values={choices(vocabulary.environments, true)}
                    onChange={(v) => update('environment', v)}
                  />
                  <Choice
                    label="Distance"
                    value={filters.distance}
                    values={choices(vocabulary.distances, true)}
                    onChange={(v) => update('distance', v)}
                  />
                  <Choice
                    label="Degrees of freedom"
                    value={filters.dof}
                    values={choices(
                      [
                        ...new Set(
                          data.techniques
                            .map((t) => t.degreesOfFreedom)
                            .filter((v) => v !== null),
                        ),
                      ]
                        .sort((a, b) => a - b)
                        .map(String),
                      true,
                    )}
                    onChange={(v) => update('dof', v)}
                  />
                  <Choice
                    label="Implementation availability"
                    value={filters.implementation}
                    values={[
                      { value: 'all', label: 'All' },
                      { value: 'yes', label: 'Documented' },
                      { value: 'no', label: 'Not documented' },
                    ]}
                    onChange={(v) => update('implementation', v)}
                  />
                  <div className="filter-control">
                    <span className="filter-label">
                      Introduction year (not publication year)
                    </span>
                    <div className="year-range">
                      <Input
                        type="number"
                        min={1800}
                        max={2100}
                        placeholder="From"
                        aria-label="Introduction year from"
                        value={filters.from}
                        onChange={(e) => update('from', e.target.value)}
                      />
                      <span>–</span>
                      <Input
                        type="number"
                        min={1800}
                        max={2100}
                        placeholder="To"
                        aria-label="Introduction year to"
                        value={filters.to}
                        onChange={(e) => update('to', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="aside-note">
              Unknown values stay unknown. Machine curation is scoped to
              recorded evidence, never equivalent to human review.
            </div>
          </aside>
          <section className="catalogue">
            <div className="eyebrow">THE INTERACTION INDEX</div>
            <h1>
              {view === 'publications'
                ? 'Follow the research.'
                : filters.category === 'all'
                  ? 'Explore the possibilities.'
                  : categoryLabel(filters.category) + ' techniques.'}
            </h1>
            <p className="intro">
              An open catalogue of interaction techniques for 3D user interfaces
            </p>
            {notice && (
              <output className="notice">
                <span>{notice}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Dismiss notice"
                  onClick={() => setNotice('')}
                >
                  <X />
                </Button>
              </output>
            )}
            <div className="searchbar">
              <Search size={20} />
              <Input
                aria-label="Search techniques and publications"
                placeholder="Search names, aliases, authors, publications, venues, or DOI…"
                value={filters.query}
                onChange={(e) => update('query', e.target.value)}
              />
              {filters.query && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Clear search"
                  onClick={() => update('query', '')}
                >
                  <X />
                </Button>
              )}
            </div>
            <div className="active-filters">
              {venueType !== 'all' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setVenueType('all')}
                >
                  Venue: {venueType} ×
                </Button>
              )}
              {(venueType !== 'all' ||
                Object.entries(filters).some(
                  ([k, v]) => v !== emptyFilters[k as keyof Filters],
                )) && (
                <Button size="sm" variant="ghost" onClick={reset}>
                  Clear all filters
                </Button>
              )}
              {Object.entries(filters)
                .filter(([k, v]) => v !== emptyFilters[k as keyof Filters])
                .map(([k, v]) => (
                  <Button
                    key={k}
                    size="sm"
                    variant="secondary"
                    aria-label={`Remove ${k} filter`}
                    onClick={() =>
                      update(
                        k as keyof Filters,
                        emptyFilters[k as keyof Filters],
                      )
                    }
                  >
                    {k}: {v}
                    <X size={12} />
                  </Button>
                ))}
            </div>
            <div className="results-header">
              <output aria-live="polite">
                {count} {view} found
              </output>
              {view === 'techniques' && (
                <Choice
                  label="Sort by"
                  value={sort}
                  values={[
                    { value: 'name', label: 'Name A–Z' },
                    { value: 'newest', label: 'Introduced: newest' },
                    { value: 'oldest', label: 'Introduced: oldest' },
                  ]}
                  onChange={(v) => {
                    setSort(v);
                    setPage(1);
                  }}
                />
              )}
            </div>
            {filters.from &&
              filters.to &&
              Number(filters.from) > Number(filters.to) && (
                <p className="form-error" role="alert">
                  Start year must not be later than end year.
                </p>
              )}
            {view === 'techniques' ? (
              <div className="cards">
                {records.slice((page - 1) * 12, page * 12).map((t) => (
                  <article className="technique-card" key={t.id}>
                    <div className="card-top">
                      <span className={'category ' + t.primaryTask}>
                        {categoryLabel(t.primaryTask)}
                      </span>
                      <span
                        className="mono"
                        title="Evidence-supported introduction year"
                      >
                        {t.introducedYear ?? 'YEAR —'}
                      </span>
                    </div>
                    <h2>
                      <button onClick={() => showTechnique(t)}>
                        {t.name}
                        <ArrowUpRight size={20} />
                      </button>
                    </h2>
                    <VerificationBadge status={t.verificationStatus} />
                    <p>{t.description}</p>
                    <div className="card-tags">
                      {t.interactionModalities.slice(0, 3).map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                      <span>
                        {t.interactionDistance?.join(' / ') ??
                          'Distance unspecified'}
                      </span>
                    </div>
                    <div className="card-footer">
                      <Button
                        variant={
                          compareIds.includes(t.id) ? 'secondary' : 'outline'
                        }
                        size="xs"
                        aria-pressed={compareIds.includes(t.id)}
                        disabled={
                          !compareIds.includes(t.id) && compareIds.length >= 6
                        }
                        onClick={() => toggleCompare(t.id)}
                      >
                        {compareIds.includes(t.id) ? '✓ Selected' : '+ Compare'}
                      </Button>
                      <Button
                        variant="link"
                        size="xs"
                        onClick={() => showTechnique(t)}
                      >
                        View evidence →
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="publication-grid">
                {publications.slice((page - 1) * 12, page * 12).map((p) => (
                  <article
                    className="technique-card publication-card"
                    key={p.id}
                  >
                    <div className="card-top">
                      <VerificationBadge status={p.verificationStatus} />
                      <span>{p.year ?? 'Year —'}</span>
                    </div>
                    <h2>
                      <button onClick={() => showPublication(p)}>
                        {p.title ??
                          p.legacyCitations[0] ??
                          'Untitled publication'}
                        <ArrowUpRight size={20} />
                      </button>
                    </h2>
                    <p>{p.authors.join('; ')}</p>
                    <div className="card-tags">
                      <span>{p.venue ?? 'Venue unspecified'}</span>
                      <span>{p.access}</span>
                    </div>
                    <Button variant="link" onClick={() => showPublication(p)}>
                      Publication & citation trail →
                    </Button>
                  </article>
                ))}
              </div>
            )}
            {!count && (
              <div className="empty-state">
                <Search size={32} />
                <h2>No matching records</h2>
                <p>
                  Try a broader search. Year filters exclude unknown
                  introduction years.
                </p>
                <Button onClick={reset}>Clear filters</Button>
              </div>
            )}
            {pages > 1 && (
              <nav className="pagination" aria-label="Results pages">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Previous
                </Button>
                <span>
                  Page {page} of {pages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </Button>
              </nav>
            )}
            <footer className="catalogue-footer">
              <span>3D INTERACTION VAULT</span>
              <span>
                {data.techniques.length} techniques · {data.publications.length}{' '}
                publications
              </span>
            </footer>
          </section>
        </main>
      )}
      {compareIds.length > 0 && (
        <section className="compare-tray" aria-label="Selected techniques">
          <span>Compare: {compareIds.length}/6 selected</span>
          <div>
            {compareIds.map((id) => (
              <Button
                size="sm"
                variant="secondary"
                key={id}
                onClick={() => toggleCompare(id)}
                aria-label={`Remove ${data.techniques.find((t) => t.id === id)!.name} from comparison`}
              >
                {data.techniques.find((t) => t.id === id)!.name}
                <X size={12} />
              </Button>
            ))}
          </div>
          <Button
            disabled={compareIds.length < 2}
            onClick={() => setCompareOpen(true)}
          >
            Compare
          </Button>
          <Button variant="ghost" onClick={() => setCompareIds([])}>
            Clear
          </Button>
        </section>
      )}
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="detail-dialog">
          {detail?.kind === 'technique' ? (
            <TechniqueDetails
              technique={
                data.techniques.find(
                  (t) => t.id === detail.record.id,
                ) as Technique
              }
              data={data}
              onTechnique={showTechnique}
              onPublication={showPublication}
            />
          ) : detail?.kind === 'publication' ? (
            <PublicationDetails
              publication={
                data.publications.find(
                  (p) => p.id === detail.record.id,
                ) as Publication
              }
              data={data}
              onGraph={(id) => {
                setDetail(null);
                setGraphFocus(id);
                setGraphRequest((n) => n + 1);
                setSurface('graph');
              }}
              onTechnique={showTechnique}
              onPublication={showPublication}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="comparison-dialog">
          {compareIds.length >= 2 && (
            <Comparison data={data} ids={compareIds} />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="import-dialog">
          <DialogTitle className="dialog-heading">
            3D Interaction Vault
          </DialogTitle>
          <DialogDescription>
            An open catalogue of interaction techniques for 3D user interfaces
          </DialogDescription>
          <div className="about-copy">
            <h3>Techniques and publications are separate</h3>
            <p>
              A paper can introduce, evaluate, compare, modify, reuse, or survey
              multiple techniques. Legacy references remain unclassified until
              their roles are evidenced. Introduction years are never inferred
              just from publication dates.
            </p>
            <h3>Evidence before certainty</h3>
            <p>
              All original 28 techniques are preserved. Migration is not
              scientific verification. Machine-verified records contain source
              and scope notes; human verification requires a named reviewer.
              Missing taxonomy remains unknown.
            </p>
            <h3>A bounded starting corpus</h3>
            <p>
              Four seed papers start an iterative discovery process, not an
              exhaustive list. Inaccessible contents and ambiguous identities
              remain in the review queue.
            </p>
            <h3>Import and export</h3>
            <p>
              Imports are admin-only candidates. Export the whole knowledge base
              to save your work. Permanent additions use the validated CLI
              importer and redeployment.
            </p>
            <a
              href="https://github.com/aubatmaz/3d-selection-vault"
              target="_blank"
              rel="noreferrer"
            >
              Original repository ↗
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
