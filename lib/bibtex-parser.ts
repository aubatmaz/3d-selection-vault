import { plugins } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import { venueFromBibtex } from './publication-venue.ts';
import {
  newPublication,
  normalizeDoi,
  previewPublications,
  type ImportPreview,
} from './bibliography.ts';
import type { Publication } from './model.ts';
type RawEntry = {
  type: string;
  label: string;
  properties: Record<string, string>;
};
const rawParse = (s: string) =>
  plugins.input.chain(s, {
    target: '@bibtex/entries+list',
    forceType: '@bibtex/text',
  }) as RawEntry[];
function bibtexBlocks(source: string) {
  const result: string[] = [];
  const start = /@\w+\s*[{(]/g;
  let match: RegExpExecArray | null;
  while ((match = start.exec(source))) {
    const open = match[0].at(-1)!;
    const close = open === '{' ? '}' : ')';
    let level = 1,
      brace = 0,
      quote = false,
      i = start.lastIndex;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '"' && level === 1 && brace === 0) {
        quote = !quote;
        continue;
      }
      if (quote) continue;
      if (open === '(') {
        if (c === '{') brace++;
        if (c === '}') brace--;
        if (brace > 0) continue;
      }
      if (c === open) level++;
      if (c === close && --level === 0) {
        i++;
        break;
      }
    }
    result.push(source.slice(match.index, i));
    start.lastIndex = i;
  }
  return result;
}
export function parseBibtex(
  text: string,
  existing: Publication[] = [],
  filename: string | null = null,
): ImportPreview {
  if (text.length > 10_000_000) throw new Error('Maximum BibTeX size is 10 MB');
  const errors: ImportPreview['errors'] = [];
  let entries: RawEntry[] = [];
  const blocks = bibtexBlocks(text);
  try {
    entries = rawParse(text);
  } catch {
    for (const [i, block] of text
      .split(/(?=^\s*@\w+\s*[{(])/m)
      .filter((x) => /@\w+\s*[{(]/.test(x))
      .entries()) {
      try {
        entries.push(...rawParse(block));
      } catch (e) {
        errors.push({ entry: i + 1, message: String(e).slice(0, 1000) });
      }
    }
  }
  if (!entries.length && !errors.length)
    errors.push({ entry: 1, message: 'No bibliographic entries found' });
  const timestamp = new Date().toISOString();
  const used = new Set(existing.map((p) => p.bibtexKey).filter(Boolean));
  const papers = entries.map((e, i) => {
    const f = e.properties;
    const original =
      blocks.find(
        (b) => b.match(/@\w+\s*[{(]\s*([^,]+),/)?.[1].trim() === e.label,
      ) || null;
    const p = newPublication(`import-${crypto.randomUUID()}`, {
      source: 'bibtex-upload',
      filename,
      originalKey: e.label,
      timestamp,
      url: null,
    });
    p.title = f.title || null;
    p.authors = f.author
      ? f.author.split(/\s+and\s+(?![^{}]*\})/).map((x) => x.trim())
      : [];
    p.year = /^\d{4}$/.test(f.year || '') ? Number(f.year) : null;
    p.venue = f.journal || f.booktitle || null;
    p.doi = normalizeDoi(f.doi) || null;
    p.url = f.url || null;
    p.abstract = f.abstract || null;
    p.keywords = f.keywords
      ? [
          ...new Set(
            f.keywords
              .split(/[,;]/)
              .map((x) => x.trim())
              .filter(Boolean),
          ),
        ]
      : [];
    let key = e.label || `Imported${i + 1}`;
    let suffix = 2;
    while (used.has(key)) key = `${e.label}${suffix++}`;
    used.add(key);
    p.bibtexKey = key;
    p.originalBibtex = original;
    p.bibtex = original;
    p.publicationVenueType = venueFromBibtex(e.type);
    p.bibliographic = {
      entryType: e.type,
      journal: f.journal || null,
      booktitle: f.booktitle || null,
      volume: f.volume || null,
      issue: f.number || f.issue || null,
      pages: f.pages || null,
      publisher: f.publisher || null,
    };
    // Publication genre is not inferred from an article title or entry type.
    if (e.type === 'book') p.publicationType = 'book';
    if (e.type === 'incollection') p.publicationType = 'book-chapter';
    if (['phdthesis', 'mastersthesis'].includes(e.type))
      p.publicationType = 'thesis';
    return p;
  });
  return previewPublications(
    papers,
    existing,
    errors,
    entries.length + errors.length,
  );
}
