import type { Publication } from './model.ts';
export const publicationVenueTypes = [
  'journal',
  'conference',
  'workshop',
  'book',
  'book-chapter',
  'thesis',
  'preprint',
  'technical-report',
  'other',
  'unknown',
] as const;
export type PublicationVenueType = (typeof publicationVenueTypes)[number];
export const venueFromBibtex = (
  type: string | null | undefined,
): PublicationVenueType =>
  (
    ({
      article: 'journal',
      inproceedings: 'conference',
      conference: 'conference',
      book: 'book',
      incollection: 'book-chapter',
      phdthesis: 'thesis',
      mastersthesis: 'thesis',
      techreport: 'technical-report',
    }) as Record<string, PublicationVenueType>
  )[type || ''] || 'unknown';
export function bibtexType(p: Publication) {
  const original = p.bibliographic?.entryType;
  if (
    original &&
    [
      'article',
      'inproceedings',
      'book',
      'incollection',
      'phdthesis',
      'mastersthesis',
      'techreport',
      'misc',
    ].includes(original)
  )
    return original;
  return (
    (
      {
        journal: 'article',
        conference: 'inproceedings',
        workshop: 'inproceedings',
        book: 'book',
        'book-chapter': 'incollection',
        'technical-report': 'techreport',
      } as Record<string, string>
    )[p.publicationVenueType || 'unknown'] || 'misc'
  );
}
