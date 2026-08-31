'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { downloadRecords, exportScope } from '@/lib/bibliography';
import type { Catalogue, Publication, Technique } from '@/lib/model';
export function ExportPanel({
  data,
  results,
  techniques,
}: {
  data: Catalogue;
  results: Publication[];
  techniques: Technique[];
}) {
  const [scope, setScope] = useState('results');
  const [ids, setIds] = useState<string[]>([]);
  return (
    <main id="main-content" tabIndex={-1} className="extension-workspace">
      <h1>Export research records</h1>
      <p>
        Exports do not change verification states. For a single paper or
        technique, use its detail view. Visible graph exports are available in
        the 3D graph.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          const status = document.getElementById('export-status');
          if (status)
            status.textContent = `Exporting complete JSON backup: ${data.techniques.length} techniques, ${data.publications.length} publications, relationships and history…`;
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(data, null, 2)], {
              type: 'application/json',
            }),
          );
          const a = document.createElement('a');
          a.href = url;
          a.download = 'vault-complete-backup.json';
          a.click();
          if (status)
            status.textContent = `Complete JSON backup sent to browser downloads: ${data.techniques.length} techniques and ${data.publications.length} publications, with relationships and history.`;
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Download complete knowledge base JSON (relationships and history)
      </Button>
      <div className="extension-controls">
        <NativeSelect
          aria-label="Export scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          {[
            ['results', 'Current catalogue search results'],
            ['selected', 'Selected publications'],
            ['all-publications', 'All publications'],
            ['all-techniques', 'All techniques'],
          ].map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </NativeSelect>
        {(['json', 'bib', 'csv'] as const).map((f) => (
          <Button
            key={f}
            disabled={f === 'bib' && scope === 'all-techniques'}
            onClick={() =>
              downloadRecords(
                scope === 'results'
                  ? { publications: results, techniques }
                  : scope === 'selected'
                    ? exportScope(data, 'publications', ids)
                    : exportScope(
                        data,
                        scope as 'all-publications' | 'all-techniques',
                      ),
                f,
              )
            }
          >
            Download .{f}
          </Button>
        ))}
      </div>
      {scope === 'selected' &&
        data.publications.map((p) => (
          <p key={p.id}>
            <label>
              <Input
                style={{ width: 16, display: 'inline' }}
                type="checkbox"
                checked={ids.includes(p.id)}
                onChange={(e) =>
                  setIds(
                    e.target.checked
                      ? [...ids, p.id]
                      : ids.filter((id) => id !== p.id),
                  )
                }
              />{' '}
              {p.title}
            </label>
          </p>
        ))}
    </main>
  );
}
