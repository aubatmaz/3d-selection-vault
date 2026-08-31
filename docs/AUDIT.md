# Pre-refactor audit

Reviewed the tracked repository inventory, application and shared logic, 28 records, original XML/HTML, schema/templates, tests, build/configuration, documentation, and UI primitive exports. Dependencies and generated output are not application source.

- React 19 / TypeScript / Vinext / Vite; Cloudflare-compatible Sites deployment. Preserve the hosting project and URL.
- `app/page.tsx` combines cards, details, search, filters, import/export and dialogs. `app/globals.css` supplies the established visual design; `components/ui/` is the reusable shadcn/Base UI library.
- `data/techniques.json`: schemaVersion 1, 28 techniques. Publications are embedded as author/year/DOI/citation fields. Two pairs share a publication (the gaze bubble records and travel records).
- `lib/catalogue.ts`: hand-written shape validation, additive merge, relationship checks, full-text search. `scripts/import-techniques.ts`: atomic additive importer. `scripts/migrate-xml.py`: earlier 25-record migration (overwrites database if rerun).
- Five baseline regression tests pass. Baseline lint reports 30 errors, including application accessibility, test promise handling, and unused scaffold primitives. These are pre-existing, not refactor regressions.

## Risks and decisions

1. Six years conflict with citation years: raycasting, bubble-cursor, gaze-pinch, voiceray, volumetric-hand-cursor, gaze-voice. Preserve all legacy years. No introduction year is inferred from migration.
2. Citation text does not establish a publication role. Preserve an explicit `unclassified` association until evidence supports a stronger role; do not claim every reference introduced its technique.
3. Preserve all IDs, descriptions, tags, original metadata and notes. Generic links become directed `conceptually-related` edges, with no automatically invented reverse edges.
4. Normalizing modality strings can lose device detail. Keep original labels in detail fields and a complete v1 snapshot.
5. Duplicate publication matching uses DOI first, then exact normalized citation for legacy records. Fuzzy matches require review.
6. Publication year may remain null for incomplete future imports. Taxonomy arrays use null for unknown, not a fabricated default.
7. Split the monolithic UI into reusable research/detail/comparison components without replacing its theme or URL.
8. Browser import remains session-only and export preserves the entire knowledge base. Durable updates use the CLI and a redeploy.

## Modification map

`lib/`: controlled vocabulary, model, schema, validation, migration, indexed search, comparison, ingestion matching.
`data/`: lossless v1 snapshot plus v2 knowledge base.
`app/` and `components/`: research-aware catalogue, publication and technique details, taxonomy, verification and comparison.
`scripts/`, `research/`, `docs/`, `tests/`, `public/`: repeatable migration/ingestion, evidence trail, report, schemas, examples and regression coverage.
