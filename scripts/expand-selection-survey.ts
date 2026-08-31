import { computeSimilarities } from '../lib/research.ts';
import fs from 'node:fs';
import { newPublication, normalizeTitle } from '../lib/bibliography.ts';
import {
  emptyCatalogue,
  emptyTaxonomy,
  emptyVerification,
} from '../lib/model.ts';
import { validateCatalogue } from '../lib/catalogue.ts';
if (fs.existsSync('data/releases/selection-survey-2013.json')) {
  console.log(
    'Survey release already generated. Refusing to replace the immutable release patch.',
  );
  process.exit(0);
}
const input = JSON.parse(
  fs.readFileSync('data/survey-extraction-2013.json', 'utf8'),
);
const base = validateCatalogue(
  JSON.parse(fs.readFileSync('data/techniques.json', 'utf8')),
);
const d = structuredClone(base),
  patch = emptyCatalogue();
const survey = input.surveyId,
  source = input.sourceUrl;
const provenance = (notes: string) => ({
  source,
  discoveryMethod: 'backward-citation' as const,
  discoveredFromPublicationId: survey,
  retrievedAt: '2026-08-31',
  notes,
});
const evidence = (notes: string, page = '123', section = 'Table 1') => ({
  publicationId: survey,
  page,
  section,
  quote: null,
  notes,
});
const sourceIds = new Map<number, string>();
for (const s of input.sources) {
  const found = d.publications.find(
    (p) =>
      p.id === s.existingId ||
      (s.doi && p.doi?.toLowerCase() === s.doi.toLowerCase()) ||
      (p.year === s.year &&
        normalizeTitle(p.title || '') === normalizeTitle(s.title)),
  );
  const id = found?.id || `survey2013-ref-${s.number}`;
  if (!found) {
    const p = newPublication(id, {
      source: 'survey-bibliography',
      filename: null,
      originalKey: String(s.number),
      timestamp: '2026-08-31T00:00:00Z',
      url: source,
    });
    Object.assign(p, {
      title: s.title,
      authors: s.authors,
      year: s.year,
      venue: s.venue,
      doi: s.doi,
      url: s.doi ? `https://doi.org/${s.doi}` : null,
      provenance: [
        provenance(
          `Reference [${s.number}]. Metadata: ${s.metadataSource}; ${s.lookupStatus}. Source paper full text not reviewed.`,
        ),
      ],
      legacyMetadata: {
        surveyReference: s.number,
        bibliographicLookup: s.lookupStatus,
      },
      publicationVenueType:
        s.crossrefType === 'journal-article'
          ? 'journal'
          : s.crossrefType === 'proceedings-article'
            ? 'conference'
            : 'unknown',
    });
    d.publications.push(p);
    patch.publications.push(p);
  }
  sourceIds.set(s.number, id);
  if (
    !d.publicationRelationships.some(
      (r) =>
        r.sourcePublicationId === survey &&
        r.targetPublicationId === id &&
        r.type === 'cites',
    )
  ) {
    const e = evidence(
      `Bibliography reference [${s.number}]. A reference is not proof of historical influence.`,
      '134–136',
      'References',
    );
    const r = {
      id: `survey2013-cites-${s.number}`,
      sourcePublicationId: survey,
      targetPublicationId: id,
      type: 'cites' as const,
      status: 'active' as const,
      evidence: [e],
      provenance: [provenance(`Bibliography [${s.number}] matched to ${id}.`)],
      verificationStatus: 'machine-curated' as const,
      verification: emptyVerification(),
      notes: 'Survey bibliography citation; not lineage.',
    };
    d.publicationRelationships.push(r);
    patch.publicationRelationships.push(r);
    const c = {
      citingPublicationId: survey,
      citedPublicationId: id,
      discoveryMethod: 'backward-citation' as const,
      evidence: [e],
    };
    d.publicationCitations.push(c);
    patch.publicationCitations.push(c);
  }
}
const addReview = (
  id: string,
  type: 'technique' | 'publication',
  entityId: string,
  reasons: string[],
) => {
  if (d.reviewQueue.some((r) => r.id === id)) return;
  const r = {
    id,
    entityType: type,
    entityId,
    reasons,
    status: 'open' as const,
  };
  d.reviewQueue.push(r);
  patch.reviewQueue.push(r);
};
let existing = 0,
  newLinks = 0;
for (const row of input.rows) {
  const ev = evidence(
    `Survey label: ${row.surveyName}. Selection tool/control: ${row.mechanismLabel}. Reference [${row.reference}]; source attribution is not confirmed introduction.`,
    row.techniqueId === 'worlds-in-miniature' ? '131' : '123',
    row.techniqueId === 'worlds-in-miniature'
      ? '4.3 Occlusion management'
      : 'Table 1',
  );
  let t = d.techniques.find(
    (t) =>
      t.id === row.techniqueId ||
      [t.name, ...t.aliases].some(
        (n) => normalizeTitle(n) === normalizeTitle(row.surveyName),
      ),
  );
  if (t) existing++;
  else {
    const taxonomy = emptyTaxonomy();
    taxonomy.selection = {
      selectionMechanism: [row.mechanism],
      targetCardinality: null,
      targetProperties: null,
      confirmationMethod: null,
    };
    if (row.mechanism === 'gaze') {
      taxonomy.general.interactionModalities = ['gaze'];
      taxonomy.general.inputDevices = ['Eye tracker'];
    }
    t = {
      id: row.techniqueId,
      name:
        row.techniqueId === 'adaptive-pointing'
          ? 'Adaptive Pointing'
          : row.surveyName,
      aliases:
        row.techniqueId === 'adaptive-pointing' ? ['Adaptative pointing'] : [],
      description: row.mechanismLabel + '.',
      howItWorks:
        row.mechanismLabel +
        '. See the survey evidence and associated source for operational details.',
      introducedYear: null,
      earliestIdentifiedYear:
        input.sources.find(
          (s: { number: number }) => s.number === row.reference,
        )?.year || null,
      introductionStatus: 'earliest-identified',
      primaryTask: 'selection',
      tasks: ['selection'],
      interactionModalities: taxonomy.general.interactionModalities,
      inputDevices: taxonomy.general.inputDevices,
      interactionDistance: null,
      degreesOfFreedom: null,
      modalityDetails: null,
      deviceDetails: null,
      taxonomy,
      tags: ['Selection', '2013 selection survey', row.mechanismLabel],
      advantages: [],
      limitations: [],
      relationships: [],
      evidence: [ev],
      verificationStatus: 'machine-curated',
      verification: emptyVerification(),
      provenance: [
        provenance(
          `Named technique extracted from ${ev.section}; not human-verified.`,
        ),
      ],
      implementations: [],
      legacyMetadata: null,
    };
    d.techniques.push(t);
    patch.techniques.push(t);
    addReview(`survey2013-review-${t.id}`, 'technique', t.id, [
      'Review survey extraction and source paper; taxonomy and earliest identified year are provisional. Unknown hardware, distance and evaluation details remain missing.',
    ]);
  }
  if (
    !d.techniquePublications.some(
      (l) =>
        l.techniqueId === t!.id &&
        l.publicationId === survey &&
        l.relationship === 'surveyed',
    )
  ) {
    const l = {
      techniqueId: t.id,
      publicationId: survey,
      relationship: 'surveyed' as const,
      evidence: [ev],
      notes: `Survey label: ${row.surveyName}. ${row.mechanismLabel}; machine-curated coverage, not introduction.`,
    };
    d.techniquePublications.push(l);
    patch.techniquePublications.push(l);
    newLinks++;
  }
  const pid = sourceIds.get(row.reference)!;
  if (
    !d.techniquePublications.some(
      (l) => l.techniqueId === t!.id && l.publicationId === pid,
    )
  ) {
    const l = {
      techniqueId: t.id,
      publicationId: pid,
      relationship: 'unclassified' as const,
      evidence: [ev],
      notes:
        'Referenced source identified by the survey; role and originality require human review.',
    };
    d.techniquePublications.push(l);
    patch.techniquePublications.push(l);
  }
  if (
    normalizeTitle(row.surveyName) !== normalizeTitle(t.name) &&
    !t.aliases.includes(row.surveyName)
  ) {
    const claim = {
      id: `survey2013-alias-${t.id}`,
      entityType: 'technique' as const,
      entityId: t.id,
      field: 'alias' as const,
      value: row.surveyName,
      evidence: [ev],
      verificationStatus: 'machine-curated' as const,
      verification: emptyVerification(),
      notes:
        'Survey label matched by mechanism and referenced paper; review before changing canonical aliases.',
      status: 'open' as const,
    };
    if (!d.claims.some((c) => c.id === claim.id)) {
      d.claims.push(claim);
      patch.claims.push(claim);
    }
    addReview(`survey2013-alias-review-${t.id}`, 'technique', t.id, [
      `Review alias mapping: survey label ${row.surveyName} to ${t.name}; existing canonical record preserved.`,
    ]);
  }
}
for (const [n, note] of [
  [
    2,
    'Virtual Pads: Table 1 cites [1], while section 3.3 cites [2]. Both publications are retained; source link follows the explicit prose and remains unclassified.',
  ],
  [
    8,
    'Raycasting from the eye: Table 1 cites [8], while section 3.2 discusses [6]. Source role/originality remains unresolved.',
  ],
  [
    71,
    'iSith: bibliography lists Peter H, Roland W, Bues BM. Author names are ambiguous; retained in this review note, structured authors left empty pending publisher verification.',
  ],
  [
    63,
    'Mine technical report: bibliography combines TR94-018 with 1995; report number/year discrepancy requires review.',
  ],
  [
    38,
    'PRISM: Table 1 cites the 2007 paper [38], while prose references 2005 [37]. These are separate publications; neither survey attribution establishes originality.',
  ],
  [
    85,
    'Sticky ray source: survey bibliography says ICCVG 2004; Crossref title query did not establish an exact title/year match. Publication date/venue needs review.',
  ],
] as const)
  addReview(`survey2013-bibliography-${n}`, 'publication', sourceIds.get(n)!, [
    note,
  ]);
for (const [techniqueId, reference] of [
  ['eye-gaze-selection', 27],
  ['depth-ray', 93],
] as const) {
  const publicationId = sourceIds.get(reference)!;
  if (
    !d.techniquePublications.some(
      (l) => l.techniqueId === techniqueId && l.publicationId === publicationId,
    )
  ) {
    const link = {
      techniqueId,
      publicationId,
      relationship: 'unclassified' as const,
      notes:
        'Additional source referenced in Table 1; not confirmed original publication.',
      evidence: [
        evidence(
          `Table 1 cites reference [${reference}] for this technique as well as another reference.`,
        ),
      ],
    };
    d.techniquePublications.push(link);
    patch.techniquePublications.push(link);
  }
}
d.publicationSimilarities = computeSimilarities(d);
validateCatalogue(d);
fs.mkdirSync('data/releases', { recursive: true });
fs.writeFileSync(
  'data/releases/selection-survey-2013.json',
  JSON.stringify(patch, null, 2) + '\n',
);
fs.writeFileSync('data/techniques.json', JSON.stringify(d, null, 2) + '\n');
fs.writeFileSync(
  'data/survey-expansion-report.json',
  JSON.stringify(
    {
      identified: input.rows.length,
      tableEntries: 31,
      additionalTextEntries: 1,
      existingTechniques: existing,
      newTechniques: patch.techniques.length,
      publicationsAdded: patch.publications.length,
      duplicateTechniquesAvoided: existing,
      existingPublicationsReused:
        input.sources.length - patch.publications.length,
      surveyLinksAdded: newLinks,
      totalSurveyLinks: d.techniquePublications.filter(
        (l) => l.publicationId === survey && l.relationship === 'surveyed',
      ).length,
      citationEdgesAdded: patch.publicationRelationships.length,
      reviewItems: patch.reviewQueue.length,
      scope: input.scope,
    },
    null,
    2,
  ) + '\n',
);
console.log(fs.readFileSync('data/survey-expansion-report.json', 'utf8'));
