'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ReferenceRetrieval } from '@/lib/reference-providers';
export function ReferenceDiscovery({ id }: { id: string }) {
  const [result, setResult] = useState<ReferenceRetrieval | null>(null);
  const [admin, setAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch(`/api/references?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => {
        if (active) setResult(x as ReferenceRetrieval | null);
      })
      .catch(() => {});
    void fetch('/api/curation')
      .then((r) => r.json())
      .then((x) => {
        if (active) setAdmin((x as { role: string }).role === 'admin');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);
  const request = async (action: string) => {
    setBusy(true);
    setMessage(
      action === 'queue'
        ? 'Adding citation proposals to review…'
        : 'Fetching public publisher references…',
    );
    try {
      const r = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, refresh: action === 'refresh', action }),
      });
      const v = (await r.json()) as ReferenceRetrieval & {
        error?: string;
        queued: number;
      };
      if (!r.ok) throw new Error(v.error);
      if (action === 'queue')
        setMessage(
          `${v.queued} citation proposals queued. Reload Curation to review.`,
        );
      else {
        setResult(v);
        setMessage('Reference preview cached. No scientific records changed.');
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="extension-card">
      <h3>Public reference discovery</h3>
      <p>
        {result
          ? `${result.provider} · ${result.status} · ${result.referenceCount} references · ${result.retrievedAt}`
          : 'No cached publisher references.'}
      </p>
      {result?.message && <p>{result.message}</p>}
      {admin && (
        <div className="extension-controls">
          <Button disabled={busy} onClick={() => request('preview')}>
            Preview ACM / IEEE references
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => request('refresh')}
          >
            Refresh references
          </Button>
          <Button
            disabled={busy || !result?.referenceCount}
            onClick={() => request('queue')}
          >
            Queue citation matches for review
          </Button>
        </div>
      )}
      <output>{message}</output>
      {result && (
        <details>
          <summary>Inspect reference provenance</summary>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
