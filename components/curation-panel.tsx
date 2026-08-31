'use client';
import { useState, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldSelect } from './research-workbench';
import { displayValue } from '@/lib/catalogue';
import { getEntity, editableFields } from '@/lib/curation';
import {
  techniqueShape,
  publicationShape,
  relationshipShape,
  implementationShape,
  type Shape,
} from '@/lib/schema';
import {
  publicationRelationshipTypes,
  entityTypes,
  type Catalogue,
  type CurationDecision,
  type EntityType,
  type JsonValue,
} from '@/lib/model';
const infer = (v: JsonValue): Shape => ({
  type: Array.isArray(v) ? 'array' : v === null ? 'string' : typeof v,
  items: { type: 'string' },
});
function blank(shape: Shape): JsonValue {
  const s = shape.anyOf?.find((s) => s.type !== 'null') ?? shape;
  if (shape.anyOf) return null;
  if (s.type === 'object')
    return Object.fromEntries(
      Object.entries(s.properties ?? {}).map(([k, v]) => [k, blank(v)]),
    );
  if (s.type === 'array') return [];
  if (s.type === 'integer' || s.type === 'number') return 0;
  return s.enum?.[0] ?? '';
}
function ValueEditor({
  label,
  value,
  shape,
  onChange,
}: {
  label: string;
  value: JsonValue;
  shape: Shape;
  onChange: (v: JsonValue) => void;
}) {
  const inputId = useId();
  const spec = shape.anyOf?.find((s) => s.type !== 'null') ?? shape;
  if (spec.type === 'object') {
    if (value === null)
      return (
        <Button
          variant="outline"
          onClick={() =>
            onChange(
              Object.fromEntries(
                Object.entries(spec.properties ?? {}).map(([k, v]) => [
                  k,
                  blank(v),
                ]),
              ),
            )
          }
        >
          Specify {label}
        </Button>
      );
    const obj = value as Record<string, JsonValue>;
    return (
      <fieldset className="curation-object">
        <legend>{label}</legend>
        {Object.entries(spec.properties ?? {}).map(([k, v]) => (
          <ValueEditor
            key={k}
            label={k}
            value={obj[k] ?? null}
            shape={v}
            onChange={(x) => onChange({ ...obj, [k]: x })}
          />
        ))}
        {shape.anyOf && (
          <Button variant="ghost" onClick={() => onChange(null)}>
            Set {label} unknown
          </Button>
        )}
      </fieldset>
    );
  }
  if (spec.type === 'array' && spec.items?.type === 'object') {
    const list = Array.isArray(value) ? value : [];
    return (
      <fieldset>
        <legend>{label}</legend>
        {list.map((v, i) => (
          <div key={i}>
            <ValueEditor
              label={`${label} ${i + 1}`}
              value={v}
              shape={spec.items!}
              onChange={(x) =>
                onChange(list.map((old, j) => (j === i ? x : old)))
              }
            />
            <Button
              variant="ghost"
              onClick={() => onChange(list.filter((_, j) => j !== i))}
            >
              Remove draft item
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => onChange([...list, blank(spec.items!)])}
        >
          Add {label}
        </Button>
      </fieldset>
    );
  }
  if (spec.type === 'array' && spec.items?.enum) {
    const list = Array.isArray(value) ? value : [];
    return (
      <fieldset className="vocabulary-editor">
        <legend>{label}</legend>
        {spec.items.enum.map((s) => (
          <label key={s}>
            <input
              type="checkbox"
              checked={list.includes(s)}
              onChange={() =>
                onChange(
                  list.includes(s)
                    ? list.length === 1 && shape.anyOf
                      ? null
                      : list.filter((x) => x !== s)
                    : [...list, s],
                )
              }
            />
            {s}
          </label>
        ))}
      </fieldset>
    );
  }
  if (spec.enum)
    return (
      <FieldSelect
        label={label}
        value={displayValue(value ?? spec.enum[0])}
        options={[...spec.enum]}
        onChange={onChange}
      />
    );
  if (spec.type === 'array')
    return (
      <label htmlFor={inputId}>
        {label} (one value per line)
        <Textarea
          id={inputId}
          value={Array.isArray(value) ? value.map(displayValue).join('\n') : ''}
          onChange={(e) =>
            onChange(
              e.target.value.trim()
                ? e.target.value.split('\n').filter(Boolean)
                : shape.anyOf
                  ? null
                  : [],
            )
          }
        />
      </label>
    );
  return (
    <label htmlFor={inputId}>
      {label}
      <Input
        id={inputId}
        type={
          spec.type === 'integer' || spec.type === 'number'
            ? 'number'
            : spec.format === 'date'
              ? 'date'
              : 'text'
        }
        value={value === null ? '' : displayValue(value)}
        onChange={(e) =>
          onChange(
            !e.target.value
              ? null
              : spec.type === 'integer' || spec.type === 'number'
                ? Number(e.target.value)
                : e.target.value,
          )
        }
      />
    </label>
  );
}
function ReviewForm({
  data,
  type,
  id,
  revision,
  onSaved,
}: {
  data: Catalogue;
  type: EntityType;
  id: string;
  revision: number | null;
  onSaved: (d: Catalogue, r: number) => void;
}) {
  const entity = getEntity(data, type, id)!;
  const [field, setField] = useState('record'),
    [value, setValue] = useState<JsonValue>(null),
    [notes, setNotes] = useState(''),
    [paper, setPaper] = useState(
      displayValue(
        (entity.evidence as { publicationId: string }[] | undefined)?.[0]
          ?.publicationId ?? 'none',
      ),
    ),
    [page, setPage] = useState(''),
    [section, setSection] = useState(''),
    [inspected, setInspected] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const shape =
    (type === 'technique'
      ? techniqueShape
      : type === 'publication'
        ? publicationShape
        : type === 'publication-relationship'
          ? relationshipShape
          : type === 'implementation'
            ? implementationShape
            : null
    )?.properties?.[field] ?? infer(value);
  async function decide(decision: CurationDecision['decision']) {
    if (
      !window.confirm(
        decision === 'confirm'
          ? 'Confirm that you reviewed the cited evidence and want to verify this claim or record? This decision will be recorded in the shared audit history.'
          : 'Save this curation decision to the shared Vault? The previous value remains in audit history.',
      )
    )
      return;
    setBusy(true);
    setMessage('Saving curation decision…');
    try {
      if (!notes.trim())
        throw new Error('Please record the reason for this decision.');
      if (decision === 'confirm' && !inspected)
        throw new Error(
          'Confirm that you inspected the evidence before verifying.',
        );
      if (revision === null)
        throw new Error(
          'Persistent curation is not connected. Reload after signing in.',
        );
      const payload = {
        id: 'decision-' + crypto.randomUUID(),
        reviewer: 'server-assigned',
        reviewerId: 'server-assigned',
        date: new Date().toISOString().slice(0, 10),
        decision,
        entityType: type,
        entityId: id,
        field: field === 'record' ? null : field,
        value,
        notes,
        evidence:
          paper === 'none'
            ? []
            : [
                {
                  publicationId: paper,
                  section: section || null,
                  page: page || null,
                  quote: null,
                  notes,
                },
              ],
      };
      const response = await fetch('/api/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision, decision: payload }),
      });
      const result = (await response.json()) as {
        error?: string;
        catalogue: Catalogue;
        revision: number;
      };
      if (!response.ok) throw new Error(result.error ?? 'Save failed');
      onSaved(result.catalogue, result.revision);
      setMessage('Decision saved to the shared catalogue.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="curation-form">
      <h2>{displayValue(entity.name ?? entity.title ?? id)}</h2>
      <p>
        {type} ·{' '}
        {displayValue(entity.verificationStatus ?? 'Reviewable metadata')}
      </p>
      {type === 'claim' && (
        <p>
          <strong>Claim:</strong> {displayValue(entity.field)} ={' '}
          {JSON.stringify(entity.value)} · {displayValue(entity.status)}.
          Confirming applies this claim only, not record-wide verification.
        </p>
      )}
      {type === 'similarity' && (
        <>
          <p>
            Research similarity: {Math.round(Number(entity.score) * 100)}%.
            Feedback does not verify a scientific claim.
          </p>
          <ul>
            {(entity.reasons as string[]).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
      <details open>
        <summary>Current evidence and provenance</summary>
        <pre>
          {JSON.stringify(
            {
              evidence: entity.evidence ?? entity.scientificBasis ?? [],
              provenance: entity.provenance ?? [],
              notes: entity.notes ?? null,
            },
            null,
            2,
          )}
        </pre>
      </details>
      {type !== 'similarity' && (
        <>
          <FieldSelect
            label="Review scope / field to edit"
            value={field}
            options={[
              'record',
              ...editableFields[type],
              ...(type === 'publication' ? ['newRelationship'] : []),
            ]}
            onChange={(f) => {
              setField(f);
              setValue(
                f === 'newRelationship'
                  ? {
                      targetPublicationId:
                        data.publications.find((p) => p.id !== id)?.id ?? '',
                      type: 'cites',
                    }
                  : ((entity[f] ?? null) as JsonValue),
              );
            }}
          />
          {field === 'newRelationship' &&
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) ? (
            <>
              <FieldSelect
                label="Target paper"
                value={displayValue(value.targetPublicationId)}
                options={data.publications
                  .filter((p) => p.id !== id)
                  .map((p) => p.id)}
                onChange={(v) => setValue({ ...value, targetPublicationId: v })}
              />
              <FieldSelect
                label="Proposed relationship (requires subsequent review)"
                value={displayValue(value.type)}
                options={[...publicationRelationshipTypes]}
                onChange={(v) => setValue({ ...value, type: v })}
              />
            </>
          ) : (
            field !== 'record' && (
              <ValueEditor
                label={field}
                value={value}
                shape={
                  type === 'claim' && field === 'value'
                    ? infer(entity.value as JsonValue)
                    : shape
                }
                onChange={setValue}
              />
            )
          )}
          <FieldSelect
            label="Supporting publication (original paper for introduction claims)"
            value={paper}
            options={['none', ...data.publications.map((p) => p.id)]}
            onChange={setPaper}
          />
          {paper !== 'none' && (
            <p>
              {data.publications.find((p) => p.id === paper)?.title} ·{' '}
              <a
                target="_blank"
                rel="noreferrer"
                href={
                  data.publications.find((p) => p.id === paper)?.url ??
                  undefined
                }
              >
                Inspect source ↗
              </a>
            </p>
          )}
          <label htmlFor="review-section">
            Section
            <Input
              id="review-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          </label>
          <label htmlFor="review-page">
            Page
            <Input
              id="review-page"
              value={page}
              onChange={(e) => setPage(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={inspected}
              onChange={(e) => setInspected(e.target.checked)}
            />{' '}
            I inspected the evidence and intend to verify this scope
            scientifically.
          </label>
        </>
      )}
      <label htmlFor="review-notes">
        Decision notes (required)
        <Textarea
          id="review-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Explain the evidence, correction, uncertainty, or usefulness."
        />
      </label>
      <div className="curation-actions">
        {(type === 'similarity'
          ? ['useful', 'misleading']
          : ['confirm', 'reject', 'modify', 'need-more-evidence']
        ).map((action) => (
          <Button
            key={action}
            disabled={
              busy ||
              revision === null ||
              (action === 'modify' && field === 'record') ||
              (action === 'confirm' &&
                (field === 'newRelationship' ||
                  !inspected ||
                  paper === 'none' ||
                  !notes.trim()))
            }
            variant={action === 'confirm' ? 'default' : 'outline'}
            onClick={() => {
              void decide(action as CurationDecision['decision']);
            }}
          >
            {action === 'confirm'
              ? type === 'claim' || field !== 'record'
                ? 'Verify Claim'
                : 'Verify Record'
              : action.replaceAll('-', ' ')}
          </Button>
        ))}
      </div>
      <output aria-live="polite">{message}</output>
      <h3>Decision history</h3>
      {data.curationDecisions
        .filter((c) => c.entityType === type && c.entityId === id)
        .map((c) => (
          <p key={c.id}>
            {c.date} · {c.reviewer} · {c.decision} · {c.field ?? 'record'} ·{' '}
            {c.notes}
          </p>
        ))}
    </section>
  );
}
export function CurationPanel({
  data,
  revision,
  onSaved,
}: {
  data: Catalogue;
  revision: number | null;
  onSaved: (d: Catalogue, r: number) => void;
}) {
  const [type, setType] = useState<EntityType>('claim'),
    [id, setId] = useState(data.claims[0]?.id ?? '');
  const ids =
    type === 'technique'
      ? data.techniques.map((t) => t.id)
      : type === 'publication'
        ? data.publications.map((p) => p.id)
        : type === 'claim'
          ? data.claims.map((c) => c.id)
          : type === 'publication-relationship'
            ? data.publicationRelationships.map((r) => r.id)
            : type === 'technique-relationship'
              ? data.techniques.flatMap((t) => t.relationships.map((r) => r.id))
              : type === 'implementation'
                ? data.techniques.flatMap((t) =>
                    t.implementations.map((i) => i.id),
                  )
                : type === 'candidate'
                  ? data.candidateLiterature.map((c) => c.id)
                  : data.publicationSimilarities.map((s) => s.id);
  return (
    <main id="main-content" tabIndex={-1} className="research-workbench">
      <div className="eyebrow">HUMAN CURATION</div>
      <h1>Review the evidence.</h1>
      <p>
        Decisions are attributed to your signed-in account and saved
        persistently. Verify only what you have inspected. Reject never deletes
        historical records.
      </p>
      {revision === null && (
        <p role="alert">
          Persistent curation is unavailable. Browsing remains available; sign
          in or retry after the database is connected.
        </p>
      )}
      <div className="curation-layout">
        <aside>
          <h2>
            {data.reviewQueue.filter((r) => r.status === 'open').length} open
            reviews
          </h2>
          <div className="review-queue">
            {data.reviewQueue
              .filter((r) => r.status === 'open')
              .map((r) => (
                <Button
                  key={r.id}
                  variant="ghost"
                  onClick={() => {
                    setType(r.entityType);
                    setId(r.entityId);
                  }}
                >
                  {r.entityId}: {r.reasons[0]}
                </Button>
              ))}
          </div>
          <FieldSelect
            label="Entity type"
            value={type}
            options={[...entityTypes]}
            onChange={(s) => {
              setType(s as EntityType);
              setId('');
            }}
          />
          <FieldSelect
            label="Entity"
            value={ids.includes(id) ? id : 'all'}
            options={['all', ...ids]}
            onChange={setId}
          />
        </aside>
        {ids.includes(id) ? (
          <ReviewForm
            key={type + id}
            data={data}
            type={type}
            id={id}
            revision={revision}
            onSaved={onSaved}
          />
        ) : (
          <p>
            Select a record or review item. No implementation or semantic claim
            is invented to populate this list.
          </p>
        )}
      </div>
    </main>
  );
}
