import {
  normalizeDoi,
  normalizeTitle,
  newPublication,
  matchPublication,
} from './bibliography.ts';
import type { Publication, Technique } from './model.ts';
export interface ReferenceCandidate {
  raw: string;
  doi: string | null;
  title: string | null;
  year: number | null;
  matchedPublicationId: string | null;
  matchMethod: 'DOI' | 'title' | null;
}
export function referenceCandidate(
  raw: string,
  papers: Publication[],
): ReferenceCandidate {
  const doi = normalizeDoi(raw.match(/10\.\d{4,9}\/[^\s<>"{}]+/i)?.[0]) || null;
  const matched = doi
    ? papers.find((p) => normalizeDoi(p.doi) === doi)
    : papers.find(
        (p) =>
          p.title &&
          normalizeTitle(p.title).length > 20 &&
          normalizeTitle(raw).includes(normalizeTitle(p.title)),
      );
  return {
    raw,
    doi,
    title: matched?.title || null,
    year: Number(raw.match(/\b(?:19|20)\d{2}\b/)?.[0]) || null,
    matchedPublicationId: matched?.id || null,
    matchMethod: matched ? (doi ? 'DOI' : 'title') : null,
  };
}
export function extractPdfText(
  text: string,
  papers: Publication[],
  filename: string,
  techniques: Technique[] = [],
) {
  const timestamp = new Date().toISOString();
  const p = newPublication(`pdf-${crypto.randomUUID()}`, {
    source: 'pdf-upload',
    filename,
    originalKey: null,
    timestamp,
    url: null,
  });
  const lines = text
    .split(/\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const refStart = text.search(
    /(?:^|\n)\s*(?:\d+[. ]+)?(?:References|Bibliography)\s*(?:\n|$)/i,
  );
  const main = refStart < 0 ? text : text.slice(0, refStart);
  p.title =
    lines.find((x) => x.length > 15 && !/^https?:|^doi:|^arxiv:/i.test(x)) ||
    null;
  p.doi = normalizeDoi(main.match(/10\.\d{4,9}\/[^\s<>"{}]+/i)?.[0]) || null;
  p.year = Number(main.slice(0, 3000).match(/\b(?:19|20)\d{2}\b/)?.[0]) || null;
  p.abstract =
    main
      .match(
        /\bAbstract\b\s*[:—-]?\s*([\s\S]+?)(?=\n\s*(?:Keywords|Index Terms|1[. ]+Introduction|Introduction)\b|$)/i,
      )?.[1]
      .trim() || null;
  const references =
    refStart < 0
      ? []
      : text
          .slice(refStart)
          .replace(/^\s*(?:\d+[. ]+)?(?:References|Bibliography)\s*/i, '')
          .split(/\n\s*(?=\[\d+\]|\d+\.\s)|\n\s*\n/)
          .filter((x) => x.trim().length > 15)
          .map((x) => referenceCandidate(x.trim(), papers));
  const headings = lines.filter(
    (x) =>
      /^(?:\d+(?:\.\d+)*\s+)?(?:Introduction|Methods?|Evaluation|Results|Discussion|Conclusion|References|Bibliography)\b/i.test(
        x,
      ) && x.length < 120,
  );
  return {
    techniqueMentions: techniques.flatMap((t) => {
      const alias = [t.name, ...t.aliases].find(
        (n) => n.length > 3 && main.toLowerCase().includes(n.toLowerCase()),
      );
      if (!alias) return [];
      const i = main.toLowerCase().indexOf(alias.toLowerCase());
      return [
        {
          techniqueId: t.id,
          name: t.name,
          role: 'mentioned-only',
          excerpt: main.slice(Math.max(0, i - 50), i + 120),
        },
      ];
    }),
    publication: p,
    headings,
    references,
    matched: references.filter((r) => r.matchedPublicationId).length,
    newCandidates: references.filter((r) => !r.matchedPublicationId && r.doi)
      .length,
    unresolved: references.filter((r) => !r.matchedPublicationId && !r.doi)
      .length,
    requiresOcr: text.trim().length < 80,
    warnings: [
      'Heuristic extraction: confirm title, author list, DOI and year against the PDF. Authors are left unknown rather than guessed.',
      'Technique mentions do not establish introduced/evaluated roles.',
    ],
    duplicate: matchPublication(p, papers),
  };
}
export function metadataConflicts(pdf: Publication, lookup: Publication) {
  return (['title', 'year', 'doi', 'authors'] as const)
    .filter(
      (k) =>
        pdf[k] &&
        lookup[k] &&
        JSON.stringify(pdf[k]) !== JSON.stringify(lookup[k]),
    )
    .map((field) => ({ field, pdf: pdf[field], lookup: lookup[field] }));
}
