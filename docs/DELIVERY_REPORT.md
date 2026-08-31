# Refactor delivery report

3D Selection Vault has been generalized to **3D Interaction Vault** without changing the existing repository location or deployed URL.

## Architecture and files

The model separates techniques, publications, many-to-many publication roles, citation discovery edges and review items. Shared vocabularies, nullable taxonomy, typed relationships, verification scope and provenance are implemented in `lib/model.ts`, `lib/schema.ts` and `lib/catalogue.ts`. Introduction dates are independent of publication dates. `lib/migrate.ts` preserves old data; `lib/ingestion.ts` applies evidence-based enrichment.

The React catalogue and detail components now provide a paper library, publication/evidence navigation, verification indicators, review reasons, supported-task and metadata filters, indexed publication search, import/export, and 2–6 technique comparison. The relationship list is ready for a future graph. Runtime imports validate references across the base and batch before any update.

Added/updated file groups: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/vault-details.tsx`, `lib/{model,schema,catalogue,migrate,ingestion}.ts`, migration/import/discovery/schema scripts, v2 database and immutable v1 snapshot, `research/` inputs/reports, public schema/example/social image, tests, package metadata, README and CONTRIBUTING. Original HTML/XML remain unchanged. Historical XML reconstruction now writes a separate legacy output so it cannot overwrite the live v2 data.

## Migration and research

- 28/28 techniques migrated with stable IDs, descriptions, tags, source notes, citations and generic relationship directions preserved; full original records retained as legacy metadata.
- Migration produces 26 distinct publication records; enrichment produces 34 total publications and 30 total techniques.
- All 4 seed publications imported; 3 accessible seed full texts inspected. 9 cited publication metadata records inspected, including a second-level reference; 4 cited publications newly added, 5 existing publication duplicates avoided.
- 2 machine-extracted candidates: PRISM and Worlds in Miniature. 8 existing techniques enriched, 5 aliases added across new/existing records, 15 new technique-publication associations, 2 symmetric directed comparison edges, 9 backward and 1 forward citation edges.
- All 30 techniques and all 34 publications still require human scientific review before human-verified status. No human verification or implementation availability was fabricated.

See `LITERATURE_INGESTION.md` for all sources, exact count definitions, per-technique changes, deferred forward candidates and inaccessible papers. `research/ingestion-report.json` contains computed statistics.

## Validation

16 regression tests pass, covering all 12 requested test areas plus evidence/implementation safety, aliases, DOI deduplication and deterministic literature reconstruction. Type checking passes. Data and the complete import example validate, with no dangling references or duplicate identities. Generated JSON Schema uses the same shape definitions as runtime validation. Production build passes. The built worker returns HTTP 200 for the homepage and 15 checked assets (including 12 client scripts); title, subtitle and OpenGraph metadata match the renamed product. No interactive browser automation was performed.

Scoped lint of changed application/model/scripts/tests passes. Full-project lint reports 19 pre-existing diagnostics in the unused UI scaffold (`components/ui` and `hooks/use-mobile.ts`); it is not a clean full-project lint run. No lint rules were weakened to hide them. These diagnostics include semantic-element/accessibility warnings, chart value typing and effect/state patterns. The audit recorded 30 baseline errors before the refactor.

## Manual review and remaining work

Six legacy year/citation conflicts remain preserved: Raycasting, Bubble Cursor, Gaze + Pinch, VoiceRay, Volumetric Hand Cursor and Gaze + Voice. PRISM's Crossref date is missing; two seeds have online/issue date distinctions. The Weise seed and several original technique papers need full-text review. Bubble Ray E/A aliases and historical origin claims are unresolved. Existing advantages, limitations and editorial relationships are migrated assertions, not newly validated research conclusions.

Next steps: human review workflow and authenticated reviewer identity; resolve the documented scaffold lint debt; inspect deferred originals/forward candidates; persist edits beyond the browser session; move the same entity contract and search index into a backend if scale demands it. The app remains usable with unknown values. The discovery pipeline creates proposals and requires evidence curation, rather than autonomously treating all citations as scientific facts.
