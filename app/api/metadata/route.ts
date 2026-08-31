import type { Publication } from '@/lib/model';
import { bindings, jsonResponse, apiError } from '@/lib/import-store';
import { requireAdmin } from '@/lib/auth';
import { newPublication, normalizeDoi } from '@/lib/bibliography';
import {
  boundedText,
  publicArticleMetadata,
  publisherUrl,
} from '@/lib/reference-providers';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    requireAdmin(request, bindings());
    const { doi: input, url } = (await request.json()) as {
      doi: string;
      url?: string;
    };
    if (url) {
      const timestamp = new Date().toISOString();
      const p = newPublication(`url-${crypto.randomUUID()}`, {
        source: 'manual',
        filename: null,
        originalKey: null,
        timestamp,
        url: null,
      });
      p.url = url;
      const provider =
        new URL(url).hostname === 'dl.acm.org' ? 'ACM-DL' : 'IEEE-Xplore';
      const source = publisherUrl(p, provider);
      const db = bindings().DB;
      const key = `url:${source}`;
      const cached = await db
        .prepare('SELECT payload FROM reference_cache WHERE id=?')
        .bind(key)
        .first<{ payload: string }>();
      if (cached) return jsonResponse(JSON.parse(cached.payload));
      const now = Date.now();
      const reserved = await db
        .prepare(
          'INSERT INTO provider_limits(id,next_at) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET next_at=excluded.next_at WHERE provider_limits.next_at < ?',
        )
        .bind(provider, now + 60000, now)
        .run();
      if (!reserved.meta.changes)
        throw new Error('Rate limit: wait one minute');
      const response = await fetch(source, {
        redirect: 'manual',
        credentials: 'omit',
        signal: AbortSignal.timeout(12000),
        headers: {
          'User-Agent':
            '3D-Interaction-Vault/0.4 (public bibliographic metadata)',
        },
      });
      if (!response.ok)
        throw new Error(
          `Public article unavailable (${response.status}); use DOI or PDF import. No access bypass attempted.`,
        );
      const metadata = publicArticleMetadata(await boundedText(response));
      if (!metadata.title && !metadata.doi)
        throw new Error(
          'No supported public bibliographic metadata; use DOI or PDF import.',
        );
      Object.assign(p, metadata);
      p.doi = normalizeDoi(p.doi) || null;
      p.importProvenance = [
        {
          source: provider,
          filename: null,
          originalKey: null,
          timestamp,
          url: source,
        },
      ];
      p.provenance[0].source = source;
      p.verification.sources = [source];
      await db
        .prepare(
          'INSERT OR REPLACE INTO reference_cache(id,payload,retrieved_at) VALUES (?,?,?)',
        )
        .bind(key, JSON.stringify(p), timestamp)
        .run();
      return jsonResponse(p);
    }
    const doi = normalizeDoi(input);
    if (!/^10\.\d{4,9}\/\S+$/.test(doi) || doi.length > 300)
      throw new Error('A valid DOI is required');
    const source = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    const db = bindings().DB;
    const key = `doi:${doi}`;
    const cached = await db
      .prepare('SELECT payload FROM reference_cache WHERE id=?')
      .bind(key)
      .first<{ payload: string }>();
    if (cached) return jsonResponse(JSON.parse(cached.payload));
    const now = Date.now();
    const limit = await db
      .prepare(
        'INSERT INTO provider_limits(id,next_at) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET next_at=excluded.next_at WHERE provider_limits.next_at < ?',
      )
      .bind('Crossref', now + 3000, now)
      .run();
    if (!limit.meta.changes)
      return jsonResponse(
        { error: 'Wait three seconds before another DOI lookup' },
        429,
      );
    const r = await fetch(source, {
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent':
          '3D-Interaction-Vault/0.4 (bibliographic metadata lookup)',
      },
    });
    if (!r.ok) throw new Error(`Crossref returned ${r.status}`);
    const { message: m } = JSON.parse(await boundedText(r)) as {
      message: Record<string, unknown>;
    };
    const p = newPublication(`doi-${crypto.randomUUID()}`, {
      source: 'DOI-lookup',
      filename: null,
      originalKey: null,
      timestamp: new Date().toISOString(),
      url: source,
    });
    p.doi = doi;
    p.title = (m.title as string[])?.[0] || null;
    p.authors = (
      (m.author || []) as { given?: string; family?: string; name?: string }[]
    )
      .map((a) => a.name || [a.given, a.family].filter(Boolean).join(' '))
      .filter(Boolean);
    p.year =
      (m.issued as { 'date-parts': number[][] })?.['date-parts']?.[0]?.[0] ||
      null;
    p.venue = (m['container-title'] as string[])?.[0] || null;
    p.url = `https://doi.org/${doi}`;
    p.abstract =
      typeof m.abstract === 'string'
        ? m.abstract.replace(/<[^>]+>/g, '')
        : null;
    p.publicationVenueType =
      (
        {
          'journal-article': 'journal',
          'proceedings-article': 'conference',
          book: 'book',
          'book-chapter': 'book-chapter',
          dissertation: 'thesis',
          report: 'technical-report',
          'posted-content': 'preprint',
        } as Record<string, Publication['publicationVenueType']>
      )[String(m.type)] || 'unknown';
    p.bibliographic = {
      entryType:
        m.type === 'journal-article'
          ? 'article'
          : m.type === 'proceedings-article'
            ? 'inproceedings'
            : null,
      journal: m.type === 'journal-article' ? p.venue : null,
      booktitle: m.type === 'proceedings-article' ? p.venue : null,
      volume: typeof m.volume === 'string' ? m.volume : null,
      issue: typeof m.issue === 'string' ? m.issue : null,
      pages: typeof m.page === 'string' ? m.page : null,
      publisher: typeof m.publisher === 'string' ? m.publisher : null,
    };
    await db
      .prepare(
        'INSERT OR REPLACE INTO reference_cache(id,payload,retrieved_at) VALUES (?,?,?)',
      )
      .bind(key, JSON.stringify(p), new Date().toISOString())
      .run();
    return jsonResponse(p);
  } catch (e) {
    return apiError(e);
  }
}
