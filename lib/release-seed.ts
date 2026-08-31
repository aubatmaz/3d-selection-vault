import { computeSimilarities } from './research.ts';
import type { Catalogue } from './model.ts';
import release from '../data/releases/selection-survey-2013.json' with { type: 'json' };
import { normalizeTitle, normalizeDoi } from './bibliography.ts';
/** Additive release import. Existing entities and audit snapshots are never replaced. */
export function mergeReleaseSeed(
  current: Catalogue,
  additions = release as Catalogue,
) {
  const next = structuredClone(current);
  if (!next.publications.some((p) => p.id === 'seed-argelaguet-2013'))
    return { catalogue: next, changed: false };
  const tmap = new Map<string, string>(),
    pmap = new Map<string, string>();
  let changed = false;
  for (const p of additions.publications) {
    const match = next.publications.find(
      (x) =>
        x.id === p.id ||
        (p.doi && normalizeDoi(x.doi) === normalizeDoi(p.doi)) ||
        (p.title &&
          x.year === p.year &&
          normalizeTitle(x.title || '') === normalizeTitle(p.title)),
    );
    pmap.set(p.id, match?.id || p.id);
    if (!match) {
      next.publications.push(structuredClone(p));
      changed = true;
    }
  }
  for (const t of additions.techniques) {
    const names = [t.name, ...t.aliases].map(normalizeTitle);
    const match = next.techniques.find(
      (x) =>
        x.id === t.id ||
        [x.name, ...x.aliases].some((n) => names.includes(normalizeTitle(n))),
    );
    tmap.set(t.id, match?.id || t.id);
    if (!match) {
      next.techniques.push(structuredClone(t));
      changed = true;
    }
  }
  const pid = (id: string) => pmap.get(id) || id,
    tid = (id: string) => tmap.get(id) || id;
  for (const l of additions.techniquePublications) {
    const x = {
      ...structuredClone(l),
      techniqueId: tid(l.techniqueId),
      publicationId: pid(l.publicationId),
    };
    if (
      !next.techniquePublications.some(
        (a) =>
          a.techniqueId === x.techniqueId &&
          a.publicationId === x.publicationId &&
          a.relationship === x.relationship,
      )
    ) {
      next.techniquePublications.push(x);
      changed = true;
    }
  }
  for (const r of additions.publicationRelationships) {
    const x = {
      ...structuredClone(r),
      sourcePublicationId: pid(r.sourcePublicationId),
      targetPublicationId: pid(r.targetPublicationId),
    };
    if (
      x.sourcePublicationId !== x.targetPublicationId &&
      !next.publicationRelationships.some(
        (a) =>
          a.id === x.id ||
          (a.sourcePublicationId === x.sourcePublicationId &&
            a.targetPublicationId === x.targetPublicationId &&
            a.type === x.type),
      )
    ) {
      next.publicationRelationships.push(x);
      changed = true;
    }
  }
  for (const c of additions.publicationCitations) {
    const x = {
      ...structuredClone(c),
      citingPublicationId: pid(c.citingPublicationId),
      citedPublicationId: pid(c.citedPublicationId),
    };
    if (
      x.citingPublicationId !== x.citedPublicationId &&
      !next.publicationCitations.some(
        (a) =>
          a.citingPublicationId === x.citingPublicationId &&
          a.citedPublicationId === x.citedPublicationId,
      )
    ) {
      next.publicationCitations.push(x);
      changed = true;
    }
  }
  for (const c of additions.claims) {
    if (next.claims.some((x) => x.id === c.id)) continue;
    next.claims.push({
      ...structuredClone(c),
      entityId:
        c.entityType === 'technique' ? tid(c.entityId) : pid(c.entityId),
    });
    changed = true;
  }
  for (const r of additions.reviewQueue) {
    if (next.reviewQueue.some((x) => x.id === r.id)) continue;
    next.reviewQueue.push({
      ...structuredClone(r),
      entityId:
        r.entityType === 'technique' ? tid(r.entityId) : pid(r.entityId),
    });
    changed = true;
  }
  if (changed) next.publicationSimilarities = computeSimilarities(next);
  return { catalogue: next, changed };
}
