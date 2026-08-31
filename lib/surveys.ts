import type { Catalogue, Publication } from './model.ts';
export const isSurvey = (p: Publication) =>
  [
    'survey',
    'systematic-review',
    'literature-review',
    'taxonomy',
    'meta-analysis',
  ].includes(p.publicationType || 'unknown');
export function surveySummary(d: Catalogue, p: Publication) {
  const associations = d.techniquePublications.filter(
    (a) =>
      a.publicationId === p.id &&
      ['surveyed', 'reviewed', 'classified', 'included'].includes(
        a.relationship,
      ) &&
      a.evidence.length,
  );
  const techniques = d.techniques.filter((t) =>
    associations.some((a) => a.techniqueId === t.id),
  );
  const referenced = d.publicationRelationships
    .filter(
      (r) =>
        r.status === 'active' &&
        r.sourcePublicationId === p.id &&
        r.type === 'cites',
    )
    .map((r) => r.targetPublicationId);
  const covered = d.publicationRelationships
    .filter(
      (r) =>
        r.status === 'active' &&
        r.sourcePublicationId === p.id &&
        ['surveys', 'reviews', 'classifies', 'includes'].includes(r.type) &&
        r.evidence.length,
    )
    .map((r) => r.targetPublicationId);
  const later = d.publicationRelationships
    .filter(
      (r) =>
        r.status === 'active' &&
        r.targetPublicationId === p.id &&
        r.type !== 'cites' &&
        r.evidence.length,
    )
    .map((r) => d.publications.find((x) => x.id === r.sourcePublicationId))
    .filter(
      (x): x is Publication =>
        !!x && isSurvey(x) && !!x.year && !!p.year && x.year > p.year,
    );
  return {
    techniques,
    tasks: p.survey?.tasks.length
      ? [...p.survey.tasks]
      : [...new Set(techniques.flatMap((t) => t.tasks))],
    referenced: [...new Set(referenced)],
    covered: [...new Set(covered)],
    later,
  };
}
export function surveyFilter(d: Catalogue, task: string) {
  return d.publications.filter(
    (p) => isSurvey(p) && (!task || surveySummary(d, p).tasks.includes(task)),
  );
}
