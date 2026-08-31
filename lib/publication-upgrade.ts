import { venueFromBibtex } from './publication-venue.ts';
import type { Catalogue } from './model.ts';
/** Additive release migration: never replace an explicit classification or scientific history. */
export function upgradePublications(data: Catalogue) {
  const d = structuredClone(data);
  for (const p of d.publications) {
    if (p.publicationVenueType === undefined)
      p.publicationVenueType = venueFromBibtex(p.bibliographic?.entryType);
    if (p.publicationType !== undefined) continue;
    p.publicationType = 'unknown';
    let type: 'survey' | 'literature-review' | 'systematic-review' | null =
      null;
    let tasks: string[] = [];
    if (
      p.doi?.toLowerCase() === '10.1016/j.cag.2012.12.003' &&
      p.title?.startsWith('A survey of 3D object selection')
    ) {
      type = 'survey';
      tasks = ['selection'];
    }
    if (
      p.doi?.toLowerCase() === '10.3390/electronics13030600' &&
      p.abstract?.includes('literature survey')
    ) {
      type = 'literature-review';
      tasks = ['general-3d'];
    }
    if (
      p.doi?.toLowerCase() === '10.1145/3706417' &&
      p.abstract?.includes('systematically reviewed 106 papers')
    ) {
      type = 'systematic-review';
      tasks = ['selection', 'manipulation'];
    }
    if (type) {
      p.publicationType = type;
      p.survey = {
        scope: p.title,
        yearsCovered: null,
        taxonomyIntroduced: null,
        tasks,
      };
      p.provenance.push({
        source: p.doi ? `https://doi.org/${p.doi}` : p.url,
        discoveryMethod: 'metadata-verification',
        discoveredFromPublicationId: null,
        retrievedAt: '2026-08-30',
        notes:
          'Publication type and task scope classified from the previously captured title/abstract; machine classification, no new human verification. Covered-year range and taxonomy claims remain unknown.',
      });
    }
  }
  return d;
}
