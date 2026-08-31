# Knowledge graph architecture

The initial catalogue is versioned JSON, with a shared TypeScript contract and declarative runtime/JSON Schema definitions. The application retains the original catalogue surface and adds composable graph and curation workbenches.

| Module | Responsibility |
| --- | --- |
| `lib/model.ts`, `lib/schema.ts` | v3 entities, controlled vocabularies and shape contract |
| `lib/catalogue.ts`, `lib/graph-validation.ts` | Existing semantic validation plus graph/claim/decision integrity |
| `lib/migrate-v2.ts`, `lib/migrate.ts` | Explicit v2→v3 and v1→v2→v3 transitions |
| `lib/legacy/v2/` | Frozen historical migration and ingestion implementation |
| `lib/research.ts` | Profiles, explainable weighted similarity, families, search, traversal, graph and comparison data, timeline preparation |
| `lib/curation.ts` | Pure validated curation actions; immutable base; scoped confirmation and retained history |
| `lib/curation-repository.ts` | SQL persistence with optimistic revisions, tested with SQLite |
| `lib/curation-store.ts`, `app/api/curation/route.ts` | D1 binding and admin-authorized API boundary |
| `db/schema.ts`, `drizzle/` | Durable catalogue checkpoint schema and generated SQL migration |
| `components/research-workbench.tsx` | Graph modes, accessible lists, edge explanations, paper research and comparison |
| `components/curation-panel.tsx` | Form-based record/claim/relationship/implementation/candidate review and similarity feedback |
| `scripts/build-knowledge-graph.ts` | Reproducible v3 reconstruction; no mass ingestion |

Citations and semantic relationships use one first-class publication-relationship entity with controlled types but retain different meaning. Ten old discovery records remain immutable data; nine cites relationships merge duplicated discovery provenance. Symmetric compares-with and contrasts-with store one lexicographically ordered pair. The graph uses no arrowheads for them. Active strong semantic relationships require evidence; rejected/reopened records remain stored. No chronology alone establishes ancestry.

Similarity is a separate symmetric entity with ordered publication IDs, score, per-dimension scores, shared/different explanations, algorithm/weights and coverage. It never becomes a semantic lineage edge. Stored similarities are recomputed when curation changes metadata. Previously rated pairs are retained when necessary to preserve feedback references; their recorded algorithm/provenance makes them identifiable as prior calculations. Unrated pairs are generated at a minimum score of 0.15, while graph threshold defaults to 0.5.

Curation decisions carry server-assigned reviewer identity/date, operation, target, optional field/value, evidence and mandatory notes. Confirming an introduction requires a supporting publication with the same publication year. Confirming a claim changes that claim and the relevant fact, not every field in the technique. Record-wide confirmation is a separate explicit scope. Reopening introduction claims withdraws the active introduced association; earlier decisions and claim evidence retain the audit history. Rejecting records does not delete them; rejecting relationships marks them inactive. Existing candidate acceptance is a relevance decision only.

The server uses prepared SQL statements. The current D1 checkpoint stores the validated catalogue including decision history in one row, with an atomic compare-and-swap revision update. This is appropriate for the bounded current corpus, not a claim of unbounded scalability. Future releases should normalize entity and decision tables, cache/index profiles and compute top-k similarity offline. Do not replace an existing curated D1 checkpoint automatically when a bundled seed changes: migrate/merge with a reviewed backup. The initial INSERT OR IGNORE intentionally preserves saved reviews across deployments.

Sites dispatch provides authenticated identity headers. `lib/auth.ts` enforces an explicit admin allowlist on every write API; viewers can only read. `ADMIN_USER_IDS` takes precedence, otherwise `ADMIN_EMAILS` is used. Missing configuration fails closed. The current owner is configured in hosted runtime settings. Cross-origin writes are rejected and reviewer/admin identity is server-assigned. Do not expose the worker directly or trust user-authored identity headers outside Sites.


## Extension architecture (0.4)

`graph3d` prepares bounded real XYZ nodes and typed edges for Three.js/OrbitControls; the prior SVG workbench remains an advanced comparison fallback. `surveys` uses explicit publication types and evidenced coverage, without duplicating entities. Optional additive model fields preserve schema-v3 compatibility; `publication-upgrade` fills only absent genre classifications from previously retained metadata.

`bibliography`, `pdf-extraction`, `technique-import` and `import-review` keep parsing separate from scientific approval. PDF.js extracts embedded text in a browser worker; R2 stores bytes and preview/source JSON. D1 candidate rows are separate from the existing curated checkpoint. Approval/rejection uses a transactional, revision-guarded update with import audit records. Imported verification claims are always demoted. No imported decision history is automatically replayed.

`reference-providers` defines public ACM/IEEE adapters, bounded requests and caching; `citation-proposals` generates needs-evidence cites records only. `metadata` handles cached Crossref DOI and explicit public publisher metadata. Shared per-provider rate reservations prevent aggressive retrieval. See EXTENSION_REPORT.md for capacities, tests and deliberate limits.
