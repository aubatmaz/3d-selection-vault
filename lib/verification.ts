import {
  emptyVerification,
  type Catalogue,
  type Verification,
  type Provenance,
} from './model.ts';
export const verificationDefinitions = {
  migrated:
    'Imported from the previous catalogue and not yet systematically reviewed.',
  'machine-curated':
    'Processed by automated tools or imported for review. Import approval is not scientific verification.',
  'human-verified':
    'An administrator explicitly reviewed evidence and confirmed the stated claim or record. Check the verification scope.',
} as const;
/** Migrate live records only. Immutable curation decisions and their snapshots are untouched. */
export function normalizeVerification(data: Catalogue): Catalogue {
  const d = structuredClone(data);
  for (const r of [
    ...d.techniques,
    ...d.publications,
    ...d.publicationRelationships,
    ...d.claims,
  ] as {
    verificationStatus: string;
    verification: Verification;
    provenance?: Provenance[];
  }[]) {
    if (r.verificationStatus === 'human-verified') continue;
    const old = r.verification;
    if (old.verifiedBy || old.verifiedDate) {
      r.provenance ??= [];
      r.provenance.push({
        source: old.sources[0] || null,
        discoveryMethod: 'migration',
        discoveredFromPublicationId: null,
        retrievedAt: old.verifiedDate,
        notes: `Prior attribution on an unverified record; not human verification. ${JSON.stringify(old)}`,
      });
    }
    r.verification = { ...old, verifiedBy: null, verifiedDate: null };
  }
  return d;
}
export function validateVerification(r: {
  verificationStatus: string;
  verification: Verification;
}) {
  if (
    r.verificationStatus !== 'human-verified' &&
    (r.verification.verifiedBy !== null || r.verification.verifiedDate !== null)
  )
    throw new Error(
      'Only human-verified records may name a verifier or verification date; use provenance for processing history.',
    );
  if (
    r.verificationStatus === 'human-verified' &&
    (!r.verification.verifiedBy ||
      !r.verification.verifiedDate ||
      !r.verification.sources.length ||
      !r.verification.notes ||
      /^(codex|machine|automated|ai|import parser|bibtex parser|pdf parser|acm-dl|ieee-xplore)(\b|:)/i.test(
        r.verification.verifiedBy,
      ))
  )
    throw new Error(
      'Human verification requires a human administrator, date, sources and scope.',
    );
}
export const machineVerification = () => emptyVerification();
