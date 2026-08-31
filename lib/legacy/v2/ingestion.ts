import {
  normalize,
  publicationKey,
  validateCatalogue,
  buildSearchIndex,
} from './catalogue.ts';
import type {
  Catalogue,
  Technique,
  Publication,
  Evidence,
  Provenance,
  TechniquePublication,
  PublicationCitation,
  ReviewItem,
} from './model.ts';
export interface Enrichment {
  match: string;
  aliases?: string[];
  tasks?: Technique['tasks'];
  evidence: Evidence[];
  provenance: Provenance[];
  relationships?: Technique['relationships'];
}
export interface Curation {
  reviewQueue: ReviewItem[];
  techniques: Technique[];
  enrichments: Enrichment[];
  techniquePublications: TechniquePublication[];
  publicationCitations: PublicationCitation[];
  forwardProvenance: { publicationId: string; provenance: Provenance }[];
}
export function matchTechnique(d: Catalogue, name: string) {
  const key = normalize(name);
  return d.techniques.find(
    (t) =>
      t.id === name || [t.name, ...t.aliases].some((n) => normalize(n) === key),
  );
}
export function techniqueCandidates(d: Catalogue, query: string) {
  const terms = normalize(query).split(/\s+/);
  return [...buildSearchIndex(d)]
    .filter(([, text]) => terms.every((t) => text.includes(t)))
    .map(([id]) => id);
}
const appendUnique = <T>(a: T[], b: T[]) => [
  ...a,
  ...b.filter((x) => !a.some((y) => JSON.stringify(y) === JSON.stringify(x))),
];
export function ingestLiterature(
  base: Catalogue,
  publications: Publication[],
  curation: Curation,
) {
  const d = structuredClone(validateCatalogue(base));
  const pubIds = new Map<string, string>();
  let publicationsAdded = 0,
    publicationsEnriched = 0,
    duplicatesAvoided = 0;
  for (const p of publications) {
    if (p.verificationStatus === 'human-verified')
      throw new Error('Automated ingestion cannot assert human verification.');
    const key = publicationKey(p);
    const found = d.publications.find(
      (x) => x.id === p.id || (key !== null && publicationKey(x) === key),
    );
    if (found) {
      pubIds.set(p.id, found.id);
      duplicatesAvoided++;
      publicationsEnriched++;
      if (found.verificationStatus === 'human-verified')
        throw new Error(
          `Human-verified publication ${found.id} requires explicit review before enrichment.`,
        );
      if (found.doi && p.doi && found.doi.toLowerCase() !== p.doi.toLowerCase())
        throw new Error(`Conflicting DOI for ${found.id}`);
      Object.assign(found, p, {
        id: found.id,
        legacyCitations: appendUnique(found.legacyCitations, p.legacyCitations),
        legacyMetadata: {
          ...found.legacyMetadata,
          ...p.legacyMetadata,
          preEnrichment: structuredClone(found),
        },
        provenance: appendUnique(found.provenance, p.provenance),
      });
    } else {
      d.publications.push(structuredClone(p));
      pubIds.set(p.id, p.id);
      publicationsAdded++;
    }
  }
  const canonical = (id: string) => pubIds.get(id) ?? id;
  const evidence = (items: Evidence[]) =>
    items.map((e) => ({ ...e, publicationId: canonical(e.publicationId) }));
  const provenance = (items: Provenance[]) =>
    items.map((p) => ({
      ...p,
      discoveredFromPublicationId: p.discoveredFromPublicationId
        ? canonical(p.discoveredFromPublicationId)
        : null,
    }));
  for (const p of d.publications) p.provenance = provenance(p.provenance);
  const newIds: string[] = [];
  for (const t of curation.techniques) {
    if (t.verificationStatus !== 'machine-verified')
      throw new Error('Extracted candidates must be machine-verified.');
    if (
      matchTechnique(d, t.name) ||
      t.aliases.some((a) => matchTechnique(d, a))
    )
      throw new Error(
        `Candidate ${t.id} matches an existing name/alias; enrich or review instead.`,
      );
    d.techniques.push({
      ...structuredClone(t),
      evidence: evidence(t.evidence),
      provenance: provenance(t.provenance),
    });
    newIds.push(t.id);
  }
  const enriched = new Set<string>();
  let aliasesAdded = 0,
    relationshipsAdded = 0;
  for (const u of curation.enrichments) {
    const t = matchTechnique(d, u.match);
    if (!t) throw new Error(`Unresolved technique ${u.match}`);
    if (t.verificationStatus === 'human-verified')
      throw new Error('Human-verified technique requires explicit review.');
    enriched.add(t.id);
    for (const alias of u.aliases ?? []) {
      const found = matchTechnique(d, alias);
      if (found && found.id !== t.id)
        throw new Error(`Ambiguous alias ${alias}`);
      if (!found) {
        t.aliases.push(alias);
        aliasesAdded++;
      }
    }
    if (u.tasks) t.tasks = appendUnique(t.tasks, u.tasks);
    t.evidence = appendUnique(t.evidence, evidence(u.evidence));
    t.provenance = appendUnique(t.provenance, provenance(u.provenance));
    for (const r of u.relationships ?? []) {
      if (
        !t.relationships.some(
          (x) => x.type === r.type && x.techniqueId === r.techniqueId,
        )
      ) {
        t.relationships.push({ ...r, evidence: evidence(r.evidence) });
        relationshipsAdded++;
      }
    }
  }
  for (const l of curation.techniquePublications)
    d.techniquePublications.push({
      ...l,
      publicationId: canonical(l.publicationId),
      evidence: evidence(l.evidence),
    });
  for (const c of curation.publicationCitations)
    d.publicationCitations.push({
      ...c,
      citingPublicationId: canonical(c.citingPublicationId),
      citedPublicationId: canonical(c.citedPublicationId),
      evidence: evidence(c.evidence),
    });
  for (const x of curation.forwardProvenance) {
    const p = d.publications.find((p) => p.id === canonical(x.publicationId));
    if (!p) throw new Error('Unknown forward citation publication');
    p.provenance.push(...provenance([x.provenance]));
  }
  for (const id of newIds)
    d.reviewQueue.push({
      id: `review-${id}`,
      entityType: 'technique',
      entityId: id,
      reasons: [
        'Machine extraction requires scientific review. Introduction year is earliest identified, not an exhaustive priority claim.',
        'Unspecified taxonomy, device or evaluation details remain unknown.',
      ],
      status: 'open',
    });
  for (const p of publications)
    if (
      p.access !== 'full-text' ||
      /Online publication|Issue year/.test(p.verification.notes ?? '')
    )
      d.reviewQueue.push({
        id: `review-publication-${canonical(p.id)}`,
        entityType: 'publication',
        entityId: canonical(p.id),
        reasons: [
          p.access === 'full-text'
            ? 'Publication date events differ; review year convention.'
            : 'Full text was not inspected. Metadata verification does not support content extraction.',
          p.verification.notes ?? 'Review metadata',
        ],
        status: 'open',
      });
  d.reviewQueue.push(...curation.reviewQueue);
  return {
    catalogue: validateCatalogue(d),
    report: {
      publicationsAdded,
      publicationsEnriched,
      duplicatesAvoided,
      existingTechniquesMatched: enriched.size,
      existingTechniqueIds: [...enriched],
      newTechniques: newIds,
      aliasesAdded,
      relationshipsAdded,
      techniquePublicationLinksAdded: curation.techniquePublications.length,
      backwardCitationEdges: curation.publicationCitations.filter(
        (c) => c.discoveryMethod === 'backward-citation',
      ).length,
      forwardCitationEdges: curation.publicationCitations.filter(
        (c) => c.discoveryMethod === 'forward-citation',
      ).length,
    },
  };
}
