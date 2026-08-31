# Knowledge graph release report

The existing React/Vinext application was extended in place. The repository location, public URL, theme, existing records, scientific evidence and historical migration fixtures are preserved. No new techniques or publications were ingested during this refactor.

## Architecture delivered

Schema v3 introduces machine-curated terminology; independent claim verification; earliest-identified versus confirmed introduction; general and four task-specific taxonomies; independent implementation scientific basis/authorship; first-class paper relationships; explainable symmetric similarity; candidate literature and durable curation decisions. Runtime validation and JSON Schema were updated together.

The UI adds an interactive publication graph with independent citation/semantic/similarity visibility, graph filters and accessible connection lists, paper research details, ancestry/descendants, conceptual families, publication comparison and form-based curation. Technique comparison now includes both year concepts and task-specific taxonomy. Structured publication search includes evidence-aware relationship shortcuts. Timeline-ready data is provided, without inventing evolutionary edges.

Curation uses authenticated Sites identity, D1-backed state, prepared SQL and optimistic revision checks. Reviewer/date spoofing is ignored. Claim confirmation is separate from record-wide approval. Rejected/reopened relationships remain stored but inactive; introduction retraction preserves the review history. Discovery outputs review proposals only and cannot overwrite the knowledge base.

## Migration and counts

| Measure | Result |
| --- | --- |
| Techniques preserved | 30/30 |
| Publications preserved | 34/34 |
| Technique–publication associations | 43; two former introduced roles explicitly reclassified as earliest-identified, with v2 originals retained |
| Citation discovery records retained | 10/10 |
| Unique citation relationships | 9, all type `cites` |
| Evidence-backed semantic paper relationships | 0 |
| Historical dependency edges | 0; no extends/builds-on claims inferred |
| Technique relationships | 74: 72 legacy-editorial and 2 machine-curated comparison directions |
| Computed publication similarities | 315, symmetric; stored minimum score 0.15; UI threshold defaults to 0.5 |
| Claim-level review records | 2 unresolved introduction claims |
| Candidate literature | 4 previously deferred forward-citation candidates; no new retrieval |
| Open curation items | 48 = 42 preserved + 2 introduction claims + 4 candidate reviews |
| Human-verified records/claims | 0 |
| Human decisions seeded into production | 0 |

Citation edges contain reference evidence/provenance, but that does not make them semantic dependency claims. All other publication relationship types currently have count zero. PRISM 2005 and WIM 1995 remain earliest identified; their former introduction values are preserved in the v2 snapshot and claim records. Current introduction years are null pending explicit evidence review.

## Added files

- Graph/curation core: `lib/graph-validation.ts`, `lib/research.ts`, `lib/curation.ts`, `lib/curation-repository.ts`, `lib/curation-store.ts`, `lib/migrate-v2.ts`.
- UI/API: `components/research-workbench.tsx`, `components/curation-panel.tsx`, `app/api/curation/route.ts`.
- Storage: `db/schema.ts`, `drizzle.config.ts`, generated `drizzle/0000_hesitant_spot.sql` and migration metadata.
- Reproducibility: immutable `data/legacy/catalogue-v2.json`, frozen `lib/legacy/v2/`, `scripts/migrate-v2.ts`, `scripts/build-knowledge-graph.ts`.
- Tests/research/docs: `tests/knowledge-graph.test.ts`, `research/expansion-tracks.json`, `research/knowledge-graph-report.json`, this report, `ARCHITECTURE.md`, `CURATION.md`, `KNOWLEDGE_GRAPH_AUDIT.md`.

## Modified files

`lib/model.ts`, `lib/schema.ts`, `lib/catalogue.ts`, `lib/migrate.ts`, `lib/ingestion.ts`; `app/page.tsx`, `app/globals.css`, `components/vault-details.tsx`; `data/techniques.json`; `public/import-example.json`, `public/technique.schema.json`; `scripts/ingest-literature.ts`; `tests/catalogue.test.ts` (now explicitly runs preserved v2 behavior); README, CONTRIBUTING, package metadata/lockfile and `.openai/hosting.json` (logical D1 binding). The social image and original XML/HTML are unchanged.

## Verification results

- 47 tests pass: all 16 historical regression tests retained, plus 31 v3 tests covering the 20 requested areas, migration preservation, scoped introduction confirmation/retraction, inactive rejected technique links, relationship proposal review and authenticated-storage behavior at the repository boundary.
- Type checking passes.
- Changed product-code lint passes. Full-project lint retains 19 previously documented unused scaffold diagnostics; no lint rules were disabled.
- Current database and complete v3 example validate; schema generation succeeds. No dangling graph/claim/review references, invalid vocabulary or duplicate relationship identities.
- Production build succeeds. Root/assets return HTTP 200.
- Generated D1 SQL applies successfully locally. Curation survives SQLite database reopen; stale revisions reject without overwriting history.
- Local production API checks: anonymous reads return 401; cross-origin writes return 403; signed-in reads and an isolated local need-more-evidence write succeed. Reviewer/date spoofing is ignored. No human verification was created by tests.
- Local test database state is kept outside the deployable build. Production is seeded with zero decisions; scientific test fixtures are never imported.
- No interactive browser automation or screenshot QA was performed.

## Manual review and remaining work

Every technique and publication still needs human scientific review. Preserve the six legacy year/citation discrepancies described in the historical literature report. PRISM/WIM originality claims remain unresolved; Bubble Ray E/A identity remains ambiguous. Metadata-only originals and the inaccessible Weise seed require full-text review before stronger claims. All nine citations need content inspection before any semantic interpretation; no semantic relationship is inferred to fill the graph.

Similarity uses associated-technique metadata as a proxy, including legacy associations. Percentages are explainable overlap, not probability, quality scores or evidence that both papers used the same experimental method. Coverage is shown. Family grouping is conceptual only. Reviewer feedback is retained separately.

Recommended next steps: review the two introduction claims and four candidate papers; select seeds for underrepresented tracks; add paper-specific methodology/feature claims; normalize the current bounded D1 JSON checkpoint into indexed entity/decision tables before large-scale growth; move dense similarity computation to offline top-k jobs; add reviewer authorization roles before expanding Site sharing; resolve the 19 scaffold lint issues. Runtime curation checkpoints are intentionally not overwritten by future bundled seeds—plan reviewed storage migrations and backups for later releases.
