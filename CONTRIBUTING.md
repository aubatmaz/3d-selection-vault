# Contributing

Use the v3 example in `public/import-example.json` and the shared vocabulary/schema. Preserve stable IDs and immutable v1/v2 snapshots. Do not edit historical fixtures to make tests pass.

Distinguish citations, semantic scholarly relationships, similarity, technique relationships and technique–paper roles. Evidence must support the exact claim, not merely mention the paper. Unknown values remain null. A schema-valid claim is not automatically scientifically true.

Prefer the Curation interface for normal review and corrections; see `docs/CURATION.md`. Confirm only evidence you have personally inspected. Submitted reviewer/date fields are ignored by the persistent API in favor of authenticated identity/time. Candidate acceptance is not automatic ingestion. Record-wide review and field-level review are distinct.

Additional literature uses `research/expansion-tracks.json` and bounded seed/discovery configurations. Discovery and ingestion write review proposals, never the authoritative database or D1. The explicit additive CLI importer is for reviewed authoring batches. V3 input must include every top-level collection, even when empty. Normalize DOI identity first, then cautiously compare normalized title + authors + year; uncertain identities go to review.

Implementation authorship belongs to implementation provenance. Scientific basis references technique literature independently. Do not require a paper about the exact code; do not assert validated status without evidence recorded in notes/provenance.

Run tests, type checking, data validation, lint and production build. Regenerate JSON Schema and Drizzle migrations after contract/storage changes. The full lint command retains 19 documented pre-existing scaffold issues; changed product code must remain clean. Synthetic lineage/curation fixtures stay in tests and must never populate the published research data.
