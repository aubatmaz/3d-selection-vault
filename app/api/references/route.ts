import { proposeCitations } from '@/lib/citation-proposals';
import { validateCatalogue } from '@/lib/catalogue';
import type { ReferenceRetrieval } from '@/lib/reference-providers';
import { bindings, jsonResponse, apiError } from '@/lib/import-store';
import { requireAdmin } from '@/lib/auth';
import { readState } from '@/lib/curation-store';
import {
  cachedReferences,
  referenceProviders,
} from '@/lib/reference-providers';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new Error('Publication required');
    const row = await bindings()
      .DB.prepare('SELECT payload FROM reference_cache WHERE id=?')
      .bind(id)
      .first<{ payload: string }>();
    return jsonResponse(row ? JSON.parse(row.payload) : null);
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = requireAdmin(request, bindings());
    const { id, refresh, action } = (await request.json()) as {
      id: string;
      refresh?: boolean;
      action?: string;
    };
    const db = bindings().DB;
    const cached = await db
      .prepare('SELECT payload FROM reference_cache WHERE id=?')
      .bind(id)
      .first<{ payload: string }>();
    if (action === 'queue') {
      if (!cached) throw new Error('Preview public references first');
      const result = JSON.parse(cached.payload) as ReferenceRetrieval;
      const current = await readState();
      const next = validateCatalogue(
        proposeCitations(
          current.catalogue,
          id,
          result.references,
          result.sourceUrl,
          result.provider,
          result.retrievedAt,
        ),
      );
      const token = `audit-${crypto.randomUUID()}`;
      const audit = {
        adminId: user.id || user.email,
        timestamp: new Date().toISOString(),
        action: 'queue-citations',
        entityType: 'publication',
        entityId: id,
        previousValue: current.catalogue.publicationRelationships.length,
        newValue: next.publicationRelationships.length,
        notes:
          'Admin queued cached public reference matches; machine-curated citations only.',
      };
      const changes = await db.batch([
        db
          .prepare(
            'UPDATE vault_state SET catalogue=?,revision=revision+1,updated_by=? WHERE id=? AND revision=?',
          )
          .bind(JSON.stringify(next), token, 'main', current.revision),
        db
          .prepare(
            'INSERT INTO import_audit(id,payload) SELECT ?,? WHERE EXISTS (SELECT 1 FROM vault_state WHERE updated_by=?)',
          )
          .bind(token, JSON.stringify(audit), token),
      ]);
      if (!changes[0].meta.changes)
        throw new Error('CONFLICT: Reload and retry');
      return jsonResponse({
        queued:
          next.publicationRelationships.length -
          current.catalogue.publicationRelationships.length,
      });
    }
    if (cached && !refresh) return jsonResponse(JSON.parse(cached.payload));
    const { catalogue } = await readState();
    const p = catalogue.publications.find((p) => p.id === id);
    if (!p) throw new Error('Unknown publication');
    const provider = referenceProviders.find((r) => r.canHandle(p));
    if (!provider)
      throw new Error('No ACM/IEEE public article URL for this record');
    const result = await cachedReferences(
      {
        get: async () => (cached ? JSON.parse(cached.payload) : null),
        put: async (id, value) => {
          await db
            .prepare(
              'INSERT INTO reference_cache(id,payload,retrieved_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,retrieved_at=excluded.retrieved_at',
            )
            .bind(id, JSON.stringify(value), value.retrievedAt)
            .run();
        },
        reserve: async (name) => {
          const now = Date.now();
          const r = await db
            .prepare(
              'INSERT INTO provider_limits(id,next_at) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET next_at=excluded.next_at WHERE provider_limits.next_at < ?',
            )
            .bind(name, now + 60000, now)
            .run();
          return r.meta.changes === 1;
        },
      },
      provider,
      p,
      catalogue.publications,
      !!refresh,
    );
    return jsonResponse(result);
  } catch (e) {
    return apiError(e);
  }
}
