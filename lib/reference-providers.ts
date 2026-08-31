import type { Publication } from './model.ts';
import {
  referenceCandidate,
  type ReferenceCandidate,
} from './pdf-extraction.ts';
export interface ReferenceRetrieval {
  provider: string;
  retrievedAt: string;
  sourceUrl: string;
  status: 'ok' | 'blocked' | 'unavailable' | 'error';
  referenceCount: number;
  references: ReferenceCandidate[];
  message: string | null;
}
export interface ReferenceProvider {
  name: string;
  canHandle(p: Publication): boolean;
  fetchReferences(
    p: Publication,
    papers: Publication[],
    fetcher?: typeof fetch,
  ): Promise<ReferenceRetrieval>;
}
const strip = (s: string) =>
  s
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
export function parsePublicReferences(
  html: string,
  provider: 'ACM-DL' | 'IEEE-Xplore',
  papers: Publication[],
) {
  const region =
    provider === 'ACM-DL'
      ? html.match(
          /<(?:ol|ul)[^>]*class=["'][^"']*references[^"']*["'][^>]*>([\s\S]*?)<\/(?:ol|ul)>/i,
        )?.[1]
      : html.match(
          /<(?:div|section)[^>]*id=["']references["'][^>]*>([\s\S]*?)<\/(?:section)>/i,
        )?.[1];
  if (!region) return [];
  const items = [...region.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => strip(m[1]))
    .filter(Boolean);
  return [...new Set(items)]
    .slice(0, 500)
    .map((s) => referenceCandidate(s, papers));
}
export function publisherUrl(p: Publication, provider: string) {
  const proposed =
    provider === 'ACM-DL' && p.doi?.startsWith('10.1145/')
      ? `https://dl.acm.org/doi/${encodeURIComponent(p.doi)}`
      : p.url;
  if (!proposed) throw new Error('No public publisher URL available');
  const u = new URL(proposed);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    u.port ||
    u.hostname !==
      (provider === 'ACM-DL' ? 'dl.acm.org' : 'ieeexplore.ieee.org')
  )
    throw new Error('Only public ACM/IEEE HTTPS article URLs are allowed');
  if (provider === 'IEEE-Xplore' && !/^\/document\/\d+\/?$/.test(u.pathname))
    throw new Error('Use an IEEE /document/number article URL');
  u.hash = '';
  u.search = '';
  return u.href;
}
export async function boundedText(response: Response, max = 2_000_000) {
  if (Number(response.headers.get('content-length')) > max)
    throw new Error('Response too large');
  const reader = response.body?.getReader();
  if (!reader) return '';
  let length = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      length += r.value.length;
      if (length > max) throw new Error('Response too large');
      parts.push(r.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const p of parts) {
    bytes.set(p, offset);
    offset += p.length;
  }
  return new TextDecoder().decode(bytes);
}
function provider(name: 'ACM-DL' | 'IEEE-Xplore'): ReferenceProvider {
  return {
    name,
    canHandle: (p) => {
      try {
        publisherUrl(p, name);
        return true;
      } catch {
        return false;
      }
    },
    async fetchReferences(p, papers, fetcher = fetch) {
      const result: ReferenceRetrieval = {
        provider: name,
        retrievedAt: new Date().toISOString(),
        sourceUrl: '',
        status: 'error',
        referenceCount: 0,
        references: [],
        message: null,
      };
      try {
        result.sourceUrl = publisherUrl(p, name);
        const response = await fetcher(result.sourceUrl, {
          redirect: 'manual',
          credentials: 'omit',
          signal: AbortSignal.timeout(12000),
          headers: {
            'User-Agent':
              '3D-Interaction-Vault/0.4 (public citation research; no authentication)',
            Accept: 'text/html',
          },
        });
        if (!response.ok) {
          result.status = [401, 403, 429].includes(response.status)
            ? 'blocked'
            : 'unavailable';
          result.message = `Publisher returned ${response.status}; use manual/PDF evidence. No retry or access bypass.`;
          return result;
        }
        result.references = parsePublicReferences(
          await boundedText(response),
          name,
          papers,
        );
        result.referenceCount = result.references.length;
        result.status = result.referenceCount ? 'ok' : 'unavailable';
        result.message = result.referenceCount
          ? null
          : 'No supported public reference list found. JavaScript-only, changed or restricted pages require manual/PDF processing.';
      } catch (e) {
        result.message = String(e);
      }
      return result;
    },
  };
}
export const referenceProviders = [provider('ACM-DL'), provider('IEEE-Xplore')];
export interface ReferenceCacheStore {
  get(id: string): Promise<ReferenceRetrieval | null>;
  put(id: string, value: ReferenceRetrieval): Promise<void>;
  reserve(provider: string): Promise<boolean>;
}
export async function cachedReferences(
  store: ReferenceCacheStore,
  provider: ReferenceProvider,
  p: Publication,
  papers: Publication[],
  refresh = false,
  fetcher: typeof fetch = fetch,
) {
  const cached = await store.get(p.id);
  if (cached && !refresh) return cached;
  if (!(await store.reserve(provider.name)))
    throw new Error(
      'Rate limit: wait one minute before another publisher request.',
    );
  const result = await provider.fetchReferences(p, papers, fetcher);
  await store.put(p.id, result);
  return result;
}
export function publicArticleMetadata(html: string) {
  const values = new Map<string, string[]>();
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const name = tag[0]
      .match(/(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]
      .toLowerCase();
    const content = tag[0].match(
      /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i,
    );
    if (name && content) {
      const v = strip(content[1] ?? content[2]);
      values.set(name, [...(values.get(name) || []), v]);
    }
  }
  return {
    title: values.get('citation_title')?.[0] || null,
    authors: values.get('citation_author') || [],
    doi: values.get('citation_doi')?.[0] || null,
    year:
      Number(
        values
          .get('citation_publication_date')?.[0]
          ?.match(/\b(?:19|20)\d{2}\b/)?.[0],
      ) || null,
    venue:
      values.get('citation_journal_title')?.[0] ||
      values.get('citation_conference_title')?.[0] ||
      null,
  };
}
