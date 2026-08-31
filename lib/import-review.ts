import { validateCatalogue } from './catalogue.ts';
import { matchPublication } from './bibliography.ts';
import type { Catalogue, Publication } from './model.ts';
export function approvePublication(
  data: Catalogue,
  input: Publication,
  notes: string,
  sourceUrl: string,
) {
  const p = structuredClone(input);
  if (!notes.trim()) throw new Error('Review notes required');
  const match = matchPublication(p, data.publications);
  if (match.status === 'exact-duplicate')
    throw new Error(
      'DOI already exists; edit the existing record instead of merging automatically.',
    );
  if (match.status === 'potential-duplicate' && !notes.includes('distinct'))
    throw new Error(
      'Potential duplicate: explain why this is a distinct publication (include “distinct” in notes).',
    );
  p.verificationStatus = 'machine-curated';
  p.verification = {
    verifiedBy: null,
    verifiedDate: null,
    sources: [sourceUrl],
    notes:
      'Admin accepted candidate. Scientific claims remain machine-curated until a separate explicit verification.',
  };
  const next = structuredClone(data);
  if (next.publications.some((x) => x.id === p.id))
    throw new Error('Publication ID already exists');
  next.publications.push(p);
  next.reviewQueue.push({
    id: `review-${p.id}`,
    entityType: 'publication',
    entityId: p.id,
    reasons: ['Imported metadata requires scientific verification'],
    status: 'open',
  });
  return validateCatalogue(next);
}
