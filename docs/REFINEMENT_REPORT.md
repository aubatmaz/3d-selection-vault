# Refinement delivery report

30 August 2026. Existing React/Vinext/D1/R2 architecture retained. No mass literature ingestion, inferred lineage, fabricated venue metadata or human verification was added. Previous release reports are historical; this report describes the current refinement.

1. **Architecture and files:** additive changes to verification, authentication, venue metadata, analytics, help and existing UI surfaces. New D1 migration creates empty visit tables. The complete affected-file inventory appears below.
2. **Verification semantics:** current non-human records have null verifier/date. Old attribution is copied to provenance, not discarded. Normalization is idempotent and leaves genuine human-verification records and immutable audit snapshots intact. All import factories remain machine-curated. Approve Import and Verify Claim/Record are separate, confirmed actions.
3. **Administrator authentication:** nonempty ADMIN_USER_IDS is authoritative and supports ID-only identity; email fallback applies only without configured IDs. Server guards remain on curation, imports, metadata retrieval, publisher refresh and private analytics. Server assigns audit identity/date. Live configuration still uses the previously established owner email fallback; a real Sites-scoped ID must be obtained before switching it.
4. **Venue form:** controlled publicationVenueType is distinct from document role. Original BibTeX entry types survive round-trip; article, proceedings, book, chapter, both thesis types and technical reports are tested. Unsupported/insufficient form stays unknown; generic thesis does not invent a degree. Filter, details, curation and exports expose the field.
5. **Visitor counter:** client entry reporting plus transactional D1 deduplication, lifetime aggregate and daily aggregates. UI tolerates unavailable analytics. No seeded traffic or historical backfill.
6. **Visit definition:** one recorded anonymous browser-tab session per UTC day. Reload/navigation/rerender in that session/day deduplicate. This is not unique people, and no background midnight timer creates visits.
7. **Privacy:** random sessionStorage UUID, server-stored day-specific hash, no analytics IP/email/user-agent/referrer/query/record-view collection. Hashes older than yesterday are deleted on the next visit; daily/lifetime aggregates remain. Blocked storage skips recording. Hosting operational logs are separate.
8. **Administrator analytics:** lifetime, today and last 30 UTC days, plus daily table. Only total visits is public. No top-search/page/device tracking was added.
9. **How to Use:** public application route /how-to-use with searchable anchored sections and a prominent header link. Hosting access remains unchanged and owner-only.
10. **Contextual help:** focusable verification badge tooltips use the same definition map as help; native disclosures explain Research Kinship, Scholarly Lineage and graph layouts; optional first-use banner stores dismissal locally.
11. **Nielsen H1–H10:** status, terminology, reset/control, shared definitions, validation/confirmation, context/legends, novice/expert entry points, summaries/disclosures, error recovery and searchable help. See usability-review.md for each actual issue, change and remaining limitation.
12. **Accessibility:** skip link, main targets, focus styles, named controls, output announcements, native help disclosures, text graph legend and equivalent node/edge lists; nested main removed from SVG fallback. No claim of WCAG certification.
13. **Responsive behavior:** wrapping header/help controls, single-column help at narrow widths, bounded graph viewport, retained scrollable compare/data tables. Actual phone, screen-reader and measured contrast checks remain outstanding.
14. **Tests added:** 14 focused tests for verifier rules/migration/history, human preservation, ID/email precedence, eight BibTeX forms and venue validation, concurrent visit deduplication/day rollover/retention, rerender reporting/failure, session persistence, forbidden analytics payloads, shared help definitions and graph terminology/future-family gating. Existing auth/migration expectations updated.
15. **Test results:** all 97 tests pass. Isolated built-worker HTTP checks pass: public home/help return 200 with semantic help markup; viewer writes denied across four APIs; ID-only administrator can preview/enqueue/approve; approval cannot promote human verification; repeated approval and missing-origin writes denied; explicit scientific review creates server-authored audit; repeated local visit records total one; counter injection/cross-origin rejected; private daily stats deny viewer and accept ID-only admin. Test publications and visits exist only in the isolated local database.
16. **Validation:** TypeScript passes; schema generation and 30-technique data validation pass; changed-file lint passes. Full-project lint still reports 19 pre-existing scaffold/config diagnostics outside this change; no new modified-file diagnostics remain.
17. **Build:** production build succeeds, including /how-to-use and /api/visits. Existing large-client-chunk warning remains (Three.js/PDF support). Migration 0003 applied successfully to isolated local D1 before API checks. No local database or synthetic traffic is included in the source archive or deployment bundle.
18. **Known limitations:** traffic counts are not bot-proof/unique-human measures; sessionStorage may be copied by duplicated tabs; idle hash cleanup waits for a visit; runtime uses email fallback until a real Sites ID is available. Technique Families is a prepared, unavailable extension point requiring curated membership, not an automatic clustering feature. Existing JSON-checkpoint capacity, bounded graph, PDF without OCR, public publisher access limits and evidence quality constraints remain. No visual/device/screen-reader certification was performed.
19. **Recommended next steps:** obtain the trusted Sites-scoped owner ID and configure ADMIN_USER_IDS; run a short researcher usability session plus keyboard/screen-reader/phone acceptance checks; clean up unused scaffold lint debt; curate evidence before enabling Technique Families; assess abuse controls if the site is later made public. Keep analytics minimal unless there is a concrete research need for additional aggregates.

## Affected files

- `README.md`
- `app/api/curation/route.ts`
- `app/api/imports/route.ts`
- `app/api/metadata/route.ts`
- `app/api/references/route.ts`
- `app/api/visits/route.ts`
- `app/globals.css`
- `app/how-to-use/page.tsx`
- `app/layout.tsx`
- `app/page.tsx`
- `components/curation-panel.tsx`
- `components/export-panel.tsx`
- `components/graph-explorer.tsx`
- `components/import-dashboard.tsx`
- `components/reference-discovery.tsx`
- `components/research-workbench.tsx`
- `components/survey-browser.tsx`
- `components/user-guidance.tsx`
- `components/vault-details.tsx`
- `components/visit-counter.tsx`
- `components/webgl-graph.tsx`
- `data/techniques.json`
- `db/schema.ts`
- `docs/usability-review.md`
- `drizzle/0003_fast_alex_power.sql`
- `drizzle/meta/0003_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/analytics.ts`
- `lib/auth.ts`
- `lib/bibliography.ts`
- `lib/catalogue.ts`
- `lib/citation-proposals.ts`
- `lib/curation-repository.ts`
- `lib/curation.ts`
- `lib/graph-validation.ts`
- `lib/graph3d.ts`
- `lib/help.ts`
- `lib/import-review.ts`
- `lib/ingestion.ts`
- `lib/migrate-v2.ts`
- `lib/model.ts`
- `lib/publication-upgrade.ts`
- `lib/publication-venue.ts`
- `lib/schema.ts`
- `lib/technique-import.ts`
- `lib/verification.ts`
- `public/import-example.json`
- `public/technique.schema.json`
- `tests/extension.test.ts`
- `tests/knowledge-graph.test.ts`
- `tests/refinements.test.ts`
