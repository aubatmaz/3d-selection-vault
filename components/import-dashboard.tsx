'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Catalogue, Publication } from '@/lib/model';
import type { ImportPreview } from '@/lib/bibliography';
import { metadataConflicts } from '@/lib/pdf-extraction';
// Vite asset-query imports generate a URL export at build time.
// oxlint-disable-next-line import/default
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
type Preview = ImportPreview & {
  jobId: string;
  extraction?: {
    publication: Publication;
    references: unknown[];
    warnings: string[];
  };
};
type ApiResult = Preview &
  Publication & {
    next: number;
    total: number;
    catalogue: Catalogue;
    revision: number;
    error?: string;
  };
async function api(body: unknown, path = '/api/imports') {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const value = (await r.json()) as ApiResult;
  if (!r.ok) throw new Error(value.error || 'Request failed');
  return value;
}
export function ImportDashboard({
  onSaved,
}: {
  onSaved: (d: Catalogue, r: number) => void;
}) {
  const [tab, setTab] = useState('bib');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState<
    { id: string; payload: string; status: string }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [edit, setEdit] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [conflicts, setConflicts] = useState<unknown>(null);
  const [audit, setAudit] = useState<unknown>(null);
  const load = async () => {
    const r = await fetch(`/api/imports?offset=${offset}`);
    const v = (await r.json()) as {
      error?: string;
      rows: typeof rows;
      total: number;
    };
    if (!r.ok) throw new Error(v.error);
    setRows(v.rows);
    setTotal(v.total);
  };
  useEffect(() => {
    let active = true;
    void fetch(`/api/imports?offset=${offset}`)
      .then(async (r) => {
        const v = (await r.json()) as {
          error?: string;
          rows: typeof rows;
          total: number;
        };
        if (!r.ok) throw new Error(v.error);
        return v;
      })
      .then((v) => {
        if (active) {
          setRows(v.rows);
          setTotal(v.total);
        }
      })
      .catch((e) => {
        if (active) setMessage(String(e));
      });
    return () => {
      active = false;
    };
  }, [offset]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage('Preparing import…');
    try {
      await fn();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };
  const prepare = () =>
    run(async () => {
      setPreview(null);
      setConflicts(null);
      setMessage(
        tab === 'bib'
          ? 'Parsing BibTeX…'
          : tab === 'pdf'
            ? 'Parsing PDF…'
            : tab === 'json'
              ? 'Validating JSON…'
              : 'Fetching publication metadata…',
      );
      let body: Record<string, unknown> = {
        action: 'preview',
        format: tab,
        text,
        filename: file?.name || null,
      };
      if (tab === 'pdf') {
        if (!file) throw new Error('Choose a PDF');
        if (file.size > 8_000_000) throw new Error('Maximum PDF size is 8 MB');
        const buffer = await file.arrayBuffer();
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const task = pdfjs.getDocument({ data: buffer.slice(0) });
        const doc = await task.promise;
        let extracted = '';
        let pdfInfo: unknown = null;
        try {
          pdfInfo = (await doc.getMetadata()).info;
          if (doc.numPages > 300) throw new Error('Maximum 300 PDF pages');
          for (let i = 1; i <= doc.numPages; i++) {
            setMessage(
              `Extracting embedded text: page ${i} of ${doc.numPages}`,
            );
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            let y: number | null = null;
            for (const item of content.items) {
              if ('str' in item) {
                if (y !== null && Math.abs(item.transform[5] - y) > 3)
                  extracted += '\n';
                extracted += item.str + (item.hasEOL ? '\n' : ' ');
                y = item.transform[5];
              }
            }
            extracted += '\n\n';
            if (extracted.length > 2_000_000)
              throw new Error('Extracted text exceeds 2 MB');
          }
        } finally {
          await task.destroy();
        }
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i += 32768)
          binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        body = { ...body, text: extracted, pdf: btoa(binary), pdfInfo };
      } else if (tab === 'doi' || tab === 'url') {
        const doi = text.trim();
        const p = await api(
          tab === 'url' && !/^https?:\/\/(?:dx\.)?doi\.org\//i.test(doi)
            ? { url: doi }
            : { doi },
          '/api/metadata',
        );
        body = { ...body, format: 'doi', text: { publications: [p] } };
      }
      const result = await api(body);
      setPreview(result);
      setMessage('Preview ready. Nothing added to the catalogue.');
    });
  return (
    <main id="main-content" tabIndex={-1} className="extension-workspace">
      <div className="section-label">ADMIN ONLY · CANDIDATE WORKFLOW</div>
      <h1>Import & review</h1>
      <p>
        Parsing creates candidates. Accepting a publication keeps it
        machine-curated; human verification is a separate evidence-based action
        in Curation.
      </p>
      <div className="extension-controls">
        {[
          ['bib', 'BibTeX'],
          ['json', 'JSON'],
          ['pdf', 'PDF'],
          ['doi', 'DOI'],
          ['url', 'Publication URL'],
        ].map(([id, label]) => (
          <Button
            key={id}
            disabled={busy}
            variant={tab === id ? 'default' : 'outline'}
            onClick={() => {
              setTab(id);
              setFile(null);
              setText('');
              setPreview(null);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {['bib', 'json', 'pdf'].includes(tab) && (
        <Input
          aria-label="Upload import file"
          type="file"
          accept={tab === 'bib' ? '.bib' : tab === 'json' ? '.json' : '.pdf'}
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            setPreview(null);
            if (!f) return;
            if (f.size > 10_000_000) {
              setMessage('Maximum upload is 10 MB');
              return;
            }
            setFile(f);
            if (tab !== 'pdf') setText(await f.text());
          }}
        />
      )}
      {tab === 'json' && (
        <p>
          JSON stages publications and techniques. Imported relationship graphs
          and decision history remain in the retained source file for separate
          review; they are not automatically replayed.
        </p>
      )}
      {tab !== 'pdf' && (
        <textarea
          aria-label="Import source"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
          placeholder={
            tab === 'bib'
              ? 'Paste BibTeX entries'
              : tab === 'json'
                ? 'Paste Vault JSON'
                : tab === 'doi'
                  ? '10.…'
                  : 'https://doi.org/…'
          }
        />
      )}
      <div className="extension-controls">
        <Button disabled={busy} onClick={prepare}>
          Parse & preview
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setPreview(null);
            setText('');
            setFile(null);
          }}
        >
          Cancel
        </Button>
      </div>
      <output>
        {busy ? 'Working… ' : ''}
        {message}
      </output>
      {preview && (
        <section className="extension-card">
          <h2>Import preview</h2>
          {preview.extraction && (
            <p>
              PDF extraction:{' '}
              {preview.extraction.publication.title
                ? 'title detected'
                : 'title not found'}{' '}
              ·{' '}
              {preview.extraction.publication.doi
                ? 'DOI detected'
                : 'DOI not found'}{' '}
              · {preview.extraction.references.length} references found. Review
              the source before approving.
            </p>
          )}
          <p>
            {Object.entries(preview.metrics)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')}
          </p>
          <details>
            <summary>Inspect records and parse errors</summary>
            <pre>
              {JSON.stringify(
                {
                  errors: preview.errors,
                  candidates: preview.candidates,
                  techniqueCandidates: preview.techniqueCandidates,
                },
                null,
                2,
              )}
            </pre>
          </details>
          {preview.extraction && (
            <details>
              <summary>PDF extraction — candidate evidence only</summary>
              <pre>{JSON.stringify(preview.extraction, null, 2)}</pre>
            </details>
          )}
          <div className="extension-controls">
            <Button
              disabled={
                busy ||
                (!preview.metrics.candidates &&
                  !preview.extraction?.references.length)
              }
              onClick={() =>
                run(async () => {
                  let next = 0;
                  let total = 1;
                  while (next < total) {
                    const r = await api({
                      action: 'enqueue',
                      jobId: preview.jobId,
                      offset: next,
                    });
                    next = r.next;
                    total = r.total;
                    setMessage(`Queued ${next} of ${total}`);
                  }
                  setPreview(null);
                  await load();
                  const stateResponse = await fetch('/api/curation');
                  if (stateResponse.ok) {
                    const state = (await stateResponse.json()) as {
                      catalogue: Catalogue;
                      revision: number;
                    };
                    onSaved(state.catalogue, state.revision);
                  }
                  setMessage(
                    'Candidates saved. No human verification was created.',
                  );
                })
              }
            >
              Add to review queue
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      JSON.stringify(
                        {
                          techniques:
                            preview.techniqueCandidates?.map(
                              (c) => c.technique,
                            ) || [],
                          publications: preview.candidates.map(
                            (c) => c.publication,
                          ),
                        },
                        null,
                        2,
                      ),
                    ],
                    { type: 'application/json' },
                  ),
                );
                const a = document.createElement('a');
                a.href = url;
                a.download = 'vault-candidates.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Convert to Vault JSON
            </Button>
            {preview.extraction?.publication.doi && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const lookup = await api(
                      { doi: preview.extraction!.publication.doi },
                      '/api/metadata',
                    );
                    setConflicts({
                      lookup,
                      conflicts: metadataConflicts(
                        preview.extraction!.publication,
                        lookup,
                      ),
                    });
                  })
                }
              >
                Compare PDF DOI metadata
              </Button>
            )}
          </div>
          {conflicts !== null && (
            <pre>{JSON.stringify(conflicts, null, 2)}</pre>
          )}
        </section>
      )}
      <Button
        variant="outline"
        onClick={() =>
          run(async () => {
            const r = await fetch('/api/imports?audit=1');
            if (!r.ok) throw new Error('Audit unavailable');
            setAudit(await r.json());
          })
        }
      >
        View recent import audit trail
      </Button>
      {audit !== null && (
        <details open>
          <summary>Administrator import decisions (latest 100)</summary>
          <pre>{JSON.stringify(audit, null, 2)}</pre>
        </details>
      )}
      <h2>Pending publications, techniques & duplicates ({total})</h2>
      <p>
        Bibliographic imports, PDF candidates and DOI lookups share this queue.
        Citation/lineage proposals and existing scientific review items are in
        Curation.
      </p>
      {rows.map((row) => {
        const c = JSON.parse(row.payload);
        return (
          <article key={row.id} className="extension-card">
            <h3>
              {c.technique?.name || c.publication?.title || 'Title unknown'}
            </h3>
            <p>
              {row.status} · {c.status} · {c.reason || 'No duplicate detected'}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSelected(row.id);
                setEdit(JSON.stringify(c.technique || c.publication, null, 2));
                setNotes('');
              }}
            >
              Inspect / edit candidate
            </Button>
            {selected === row.id && (
              <>
                <textarea
                  aria-label="Edit candidate JSON"
                  value={edit}
                  onChange={(e) => setEdit(e.target.value)}
                />
                <Input
                  aria-label="Review notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Evidence and review notes; explain distinct records for potential duplicates"
                />
                <div className="extension-controls">
                  {['approve', 'reject', 'need-more-evidence'].map(
                    (decision) => (
                      <Button
                        key={decision}
                        disabled={busy || !notes.trim()}
                        variant={decision === 'approve' ? 'default' : 'outline'}
                        onClick={() =>
                          run(async () => {
                            if (
                              !window.confirm(
                                decision === 'approve'
                                  ? 'Approve this import into the shared Vault as machine-curated? This does not verify its scientific content.'
                                  : 'Save this import review decision? Its audit history will be retained.',
                              )
                            )
                              return;
                            const result = await api({
                              action: 'review',
                              id: row.id,
                              decision,
                              ...(c.technique
                                ? { technique: JSON.parse(edit) }
                                : { publication: JSON.parse(edit) }),
                              notes,
                            });
                            onSaved(result.catalogue, result.revision);
                            setSelected(null);
                            await load();
                            setMessage(
                              'Review saved with administrator audit trail.',
                            );
                          })
                        }
                      >
                        {decision === 'approve' ? 'Approve Import' : decision}
                      </Button>
                    ),
                  )}
                </div>
              </>
            )}
          </article>
        );
      })}
      <div className="extension-controls">
        <Button
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          Previous 50
        </Button>
        <Button
          disabled={offset + 50 >= total}
          onClick={() => setOffset(offset + 50)}
        >
          Next 50
        </Button>
        <Button variant="outline" onClick={() => run(load)}>
          Refresh queue
        </Button>
      </div>
    </main>
  );
}
