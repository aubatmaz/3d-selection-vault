'use client';
import { DetailDisclosure } from './detail-disclosure';
import { downloadRecords, exportScope } from '@/lib/bibliography';
import { isSurvey } from '@/lib/surveys';
import { ReferenceDiscovery } from '@/components/reference-discovery';
import { SurveyFacts } from '@/components/survey-browser';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { verificationDefinitions } from '@/lib/verification';
import { PaperResearch } from './research-workbench';
import { Button } from '@/components/ui/button';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  categoryLabel,
  displayValue,
  publicationsFor,
  comparisonData,
  vocabulary,
  type Catalogue,
  type Technique,
  type Publication,
  type Evidence,
  type VerificationStatus,
} from '@/lib/catalogue';
export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={'verification ' + status}
        aria-label={`${status}: ${verificationDefinitions[status]}`}
      >
        {status === 'migrated'
          ? '○ Migrated'
          : status === 'machine-curated'
            ? '◐ Machine-curated'
            : '● Human-verified'}
      </TooltipTrigger>
      <TooltipContent>{verificationDefinitions[status]}</TooltipContent>
    </Tooltip>
  );
}
export function EvidenceList({
  items,
  data,
  onPublication,
}: {
  items: Evidence[];
  data: Catalogue;
  onPublication: (p: Publication) => void;
}) {
  return items.length ? (
    <ul className="evidence-list">
      {items.map((e, i) => {
        const p = data.publications.find((p) => p.id === e.publicationId);
        return (
          <li key={i}>
            {p && (
              <Button variant="link" onClick={() => onPublication(p)}>
                {p.title ?? p.id}
              </Button>
            )}
            <span>
              {[e.section, e.page ? `p. ${e.page}` : null, e.notes]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {e.quote && <q>{e.quote}</q>}
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="muted">No evidence location recorded.</p>
  );
}
function ReviewNotes({ data, id }: { data: Catalogue; id: string }) {
  const items = data.reviewQueue.filter(
    (r) => r.entityId === id && r.status === 'open',
  );
  return items.length ? (
    <section className="detail-section">
      <h3>Requires human review</h3>
      <ul>
        {items
          .flatMap((r) => r.reasons)
          .map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
      </ul>
    </section>
  ) : null;
}
function Facts({ items }: { items: [string, unknown][] }) {
  return (
    <dl className="facts">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{displayValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
export function TechniqueDetails(props: {
  technique: Technique;
  data: Catalogue;
  onTechnique: (t: Technique) => void;
  onPublication: (p: Publication) => void;
}) {
  return <TechniqueDetailsBody key={props.technique.id} {...props} />;
}
function TechniqueDetailsBody({
  technique: t,
  data,
  onTechnique,
  onPublication,
}: {
  technique: Technique;
  data: Catalogue;
  onTechnique: (t: Technique) => void;
  onPublication: (p: Publication) => void;
}) {
  const links = publicationsFor(data, t.id);
  const roles: Record<string, string> = {
    introduced: 'Confirmed introduction',
    'earliest-identified': 'Earliest identified in (not confirmed original)',
    evaluated: 'Evaluated in',
    compared: 'Compared in',
    modified: 'Modified in',
    reused: 'Reused in',
    surveyed: 'Surveyed in',
    unclassified: 'Legacy references — role not established',
  };
  return (
    <>
      <div className="detail-kicker">
        <span className={'category ' + t.primaryTask}>
          {categoryLabel(t.primaryTask)}
        </span>
        <VerificationBadge status={t.verificationStatus} />
      </div>
      <DialogTitle className="detail-title">{t.name}</DialogTitle>
      <div className="extension-controls">
        {(['bib', 'json', 'csv'] as const).map((f) => (
          <Button
            key={f}
            variant="outline"
            onClick={() =>
              downloadRecords(exportScope(data, 'technique', [t.id]), f)
            }
          >
            Export technique + papers .{f}
          </Button>
        ))}
      </div>
      <DialogDescription className="detail-description">
        {t.description}
      </DialogDescription>
      {t.aliases.length > 0 && (
        <p className="muted">Also known as: {t.aliases.join(' · ')}</p>
      )}
      <Facts
        items={[
          ['Supported tasks', t.tasks],
          ['Introduced year', t.introducedYear],
          ['Earliest identified year', t.earliestIdentifiedYear],
          ['Introduction status', t.introductionStatus],
          ['Manipulation taxonomy', t.taxonomy.manipulation],
          ['Navigation taxonomy', t.taxonomy.navigation],
          ['System control taxonomy', t.taxonomy.systemControl],
          ['Interaction modalities', t.interactionModalities],
          ['Modality details', t.modalityDetails],
          ['Input devices', t.inputDevices],
          ['Device details', t.deviceDetails],
          ['Interaction distance', t.interactionDistance],
          ['Degrees of freedom', t.degreesOfFreedom],
          ['Selection mechanism', t.taxonomy.selection?.selectionMechanism],
          ['Control mapping', t.taxonomy.general.controlMapping],
          ['Target cardinality', t.taxonomy.selection?.targetCardinality],
          ['Environment', t.taxonomy.general.environment],
          ['Body parts', t.taxonomy.general.bodyParts],
          ['Directness', t.taxonomy.general.directness],
          ['Feedback modalities', t.taxonomy.general.feedbackModalities],
          ['Target properties', t.taxonomy.selection?.targetProperties],
          ['Confirmation', t.taxonomy.selection?.confirmationMethod],
        ]}
      />
      <DetailDisclosure scopeKey={t.id} title="How it works">
        <p>{t.howItWorks ?? 'Not specified'}</p>
      </DetailDisclosure>
      <div className="pros-cons">
        <section>
          <h3>Advantages</h3>
          <ul>
            {t.advantages.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {!t.advantages.length && <p>Not specified</p>}
        </section>
        <section>
          <h3>Limitations</h3>
          <ul>
            {t.limitations.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {!t.limitations.length && <p>Not specified</p>}
        </section>
      </div>
      {vocabulary.publicationRoles.map((role) => {
        const matches = links.filter((x) => x.link.relationship === role);
        return matches.length ? (
          <section className="citation" key={role}>
            <h3>{roles[role]}</h3>
            {matches.map(({ publication: p, link: l }) => (
              <div key={p.id}>
                <Button variant="link" onClick={() => onPublication(p)}>
                  {p.title ?? p.legacyCitations[0] ?? p.id} ↗
                </Button>
                <p>
                  {p.authors.join('; ')} · {p.year ?? 'Year unspecified'}
                </p>
                <VerificationBadge status={p.verificationStatus} />
                {l.notes && <p>{l.notes}</p>}
                <EvidenceList
                  items={l.evidence}
                  data={data}
                  onPublication={onPublication}
                />
              </div>
            ))}
          </section>
        ) : null;
      })}
      <section className="detail-section">
        <h3>Relationships · outgoing</h3>
        {t.relationships.length ? (
          t.relationships
            .filter((r) => r.status === 'active')
            .map((r) => {
              const target = data.techniques.find(
                (x) => x.id === r.techniqueId,
              )!;
              return (
                <div className="relationship" key={r.type + r.techniqueId}>
                  <span>
                    {categoryLabel(r.type)} ({r.relationshipSource}) →{' '}
                  </span>
                  <Button variant="outline" onClick={() => onTechnique(target)}>
                    {target.name}
                  </Button>
                  {r.notes && <p>{r.notes}</p>}
                  {r.evidence.length > 0 && (
                    <EvidenceList
                      items={r.evidence}
                      data={data}
                      onPublication={onPublication}
                    />
                  )}
                </div>
              );
            })
        ) : (
          <p className="muted">No relationships documented.</p>
        )}
      </section>
      <section className="detail-section">
        <h3>Implementations</h3>
        {t.implementations.length ? (
          t.implementations.map((i) => (
            <div key={i.id}>
              <a
                href={
                  i.repositoryUrl ??
                  i.demoUrl ??
                  i.documentationUrl ??
                  undefined
                }
                target="_blank"
                rel="noreferrer"
              >
                {i.name} ↗
              </a>
              <p>
                {[
                  i.status,
                  i.license,
                  i.programmingLanguage,
                  i.platform,
                  i.notes,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p>
                Implementation provenance:{' '}
                {i.provenance.implementedBy ?? 'Author not recorded'} ·{' '}
                {i.provenance.implementationDate ?? 'Date not recorded'} ·{' '}
                {i.provenance.notes}
              </p>
              {i.demoUrl && (
                <a href={i.demoUrl} target="_blank" rel="noreferrer">
                  Demo ↗
                </a>
              )}
              {i.documentationUrl && (
                <a href={i.documentationUrl} target="_blank" rel="noreferrer">
                  Documentation ↗
                </a>
              )}
              <h4>Scientific basis (separate from software authorship)</h4>
              <EvidenceList
                items={i.scientificBasis}
                data={data}
                onPublication={onPublication}
              />
            </div>
          ))
        ) : (
          <p>Not documented. This does not mean no implementation exists.</p>
        )}
      </section>
      {data.claims
        .filter((c) => c.entityType === 'technique' && c.entityId === t.id)
        .map((c) => (
          <section key={c.id} className="detail-section">
            <h3>Claim: {c.field}</h3>
            <p>
              {displayValue(c.value)} · {c.status} · {c.verificationStatus}
            </p>
            <p>{c.notes}</p>
            <EvidenceList
              items={c.evidence}
              data={data}
              onPublication={onPublication}
            />
          </section>
        ))}
      <ReviewNotes data={data} id={t.id} />
      <details className="provenance">
        <summary>Verification, evidence & provenance</summary>
        <p>
          {t.verification.notes ??
            'Migration does not establish scientific validity.'}
        </p>
        <p>
          {[t.verification.verifiedBy, t.verification.verifiedDate]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <EvidenceList
          items={t.evidence}
          data={data}
          onPublication={onPublication}
        />
        {t.provenance.map((p, i) => (
          <p key={i}>
            {p.discoveryMethod} · {p.notes}{' '}
            {p.source && (
              <a href={p.source} target="_blank" rel="noreferrer">
                Source ↗
              </a>
            )}
          </p>
        ))}
        {t.legacyMetadata && (
          <details>
            <summary>
              Preserved legacy metadata (not introduction claims)
            </summary>
            <pre>{JSON.stringify(t.legacyMetadata, null, 2)}</pre>
          </details>
        )}
      </details>
    </>
  );
}
export function PublicationDetails({
  publication: p,
  data,
  onTechnique,
  onPublication,
  onGraph,
}: {
  onGraph?: (id: string) => void;
  publication: Publication;
  data: Catalogue;
  onTechnique: (t: Technique) => void;
  onPublication: (p: Publication) => void;
}) {
  const links = data.techniquePublications.filter(
    (l) => l.publicationId === p.id,
  );
  return (
    <>
      <VerificationBadge status={p.verificationStatus} />
      <DialogTitle className="detail-title">
        {p.title ?? 'Publication title not specified'}
      </DialogTitle>
      <DialogDescription>
        {p.authors.join('; ') || 'Authors not specified'}
      </DialogDescription>
      <Facts
        items={[
          ['Publication type', p.publicationType || 'unknown'],
          ['Venue type', p.publicationVenueType || 'unknown'],
          ['Publication year', p.year],
          ['Venue', p.venue],
          ['DOI', p.doi],
          ['Content access', p.access],
          ['Methodology', p.methodology],
          ['Keywords', p.keywords],
        ]}
      />
      <ReferenceDiscovery id={p.id} />
      {isSurvey(p) && (
        <SurveyFacts
          data={data}
          p={p}
          onTechnique={onTechnique}
          onPublication={onPublication}
          onGraph={onGraph}
        />
      )}
      <div className="extension-controls">
        {(['bib', 'json', 'csv'] as const).map((f) => (
          <Button
            key={f}
            variant="outline"
            onClick={() =>
              downloadRecords({ publications: [p], techniques: [] }, f)
            }
          >
            Export .{f}
          </Button>
        ))}
      </div>
      {p.doi && (
        <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">
          Resolve DOI ↗
        </a>
      )}
      {p.url && (
        <a href={p.url} target="_blank" rel="noreferrer">
          Publication source ↗
        </a>
      )}
      <section className="detail-section">
        <h3>Abstract</h3>
        <p>{p.abstract ?? 'Not stored; consult the publication source.'}</p>
      </section>
      <section className="detail-section">
        <h3>Associated techniques</h3>
        {links.length ? (
          links.map((l) => (
            <div key={l.techniqueId + l.relationship}>
              <Button
                variant="outline"
                onClick={() =>
                  onTechnique(
                    data.techniques.find((t) => t.id === l.techniqueId)!,
                  )
                }
              >
                {data.techniques.find((t) => t.id === l.techniqueId)!.name}
              </Button>
              <span> · {l.relationship}</span>
              <EvidenceList
                items={l.evidence}
                data={data}
                onPublication={onPublication}
              />
            </div>
          ))
        ) : (
          <p>No content-level technique associations established.</p>
        )}
      </section>
      <section className="detail-section">
        <h3>Citation discovery history</h3>
        {data.publicationCitations
          .filter(
            (l) =>
              l.citingPublicationId === p.id || l.citedPublicationId === p.id,
          )
          .map((l, i) => {
            const outgoing = l.citingPublicationId === p.id,
              target = data.publications.find(
                (x) =>
                  x.id ===
                  (outgoing ? l.citedPublicationId : l.citingPublicationId),
              )!;
            return (
              <p key={i}>
                {outgoing ? 'Cites' : 'Cited by'}{' '}
                <Button variant="link" onClick={() => onPublication(target)}>
                  {target.title ?? target.id}
                </Button>{' '}
                · {l.discoveryMethod}
              </p>
            );
          })}
      </section>
      <PaperResearch data={data} paper={p} onPublication={onPublication} />
      <ReviewNotes data={data} id={p.id} />
      <section className="provenance">
        <h3>Verification scope</h3>
        <p>{p.verification.notes ?? 'Not independently verified.'}</p>
        <p>
          {[p.verification.verifiedBy, p.verification.verifiedDate]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {p.provenance.map((s, i) => (
          <p key={i}>
            {s.discoveryMethod}: {s.notes}{' '}
            {s.source && (
              <a href={s.source} target="_blank" rel="noreferrer">
                Source ↗
              </a>
            )}
          </p>
        ))}
      </section>
      {p.legacyCitations.length > 0 && (
        <details className="citation">
          <summary>Preserved citation text</summary>
          {p.legacyCitations.map((c, i) => (
            <p key={i}>{c}</p>
          ))}
        </details>
      )}
      <details className="citation">
        <summary>BibTeX</summary>
        <pre>{p.bibtex ?? 'Not available'}</pre>
      </details>
    </>
  );
}
export function Comparison({ data, ids }: { data: Catalogue; ids: string[] }) {
  const result = comparisonData(data, ids);
  return (
    <>
      <DialogTitle className="dialog-heading">Compare techniques</DialogTitle>
      <DialogDescription>
        Missing values are shown as —. Introduction claims and publication dates
        are separate; machine curation is not human review.
      </DialogDescription>
      <Table className="comparison-table">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Dimension</TableHead>
            {result.techniques.map((t) => (
              <TableHead scope="col" key={t.id}>
                {t.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((r) => (
            <TableRow key={r.label}>
              <TableHead scope="row">{r.label}</TableHead>
              {r.values.map((v, i) => (
                <TableCell key={result.techniques[i].id}>{v}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
