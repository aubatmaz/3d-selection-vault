# 3D Interaction Vault

**An open catalogue of interaction techniques for 3D user interfaces**

A React/TypeScript research knowledge base covering Selection, Manipulation, Navigation and System Control. Browse techniques and papers, explore citation and research-similarity graphs, compare 2–6 techniques or papers, and review evidence through persistent curation.

The current release contains **50 techniques, 51 publications and 92 technique–paper associations**, preserving all previous entities and historical data. It records 39 citation discovery events as 38 unique citation relationships, 892 deterministic metadata-similarity pairs (minimum stored score 0.15) and 77 open review items. No historical paper lineage or human verification has been invented.

## Five different connections

| Connection | Meaning | What it does not establish |
| --- | --- | --- |
| Citation | Paper A references Paper B | Intellectual dependency or originality |
| Scholarly lineage | Text/evidence supports A extending, adapting or building on B | Cannot be inferred from citation or similarity |
| Research similarity / kinship | Papers have overlapping structured metadata | Historical influence, experimental equivalence or probability of scientific agreement |
| Technique–publication | A paper introduces, evaluates, compares, modifies, reuses or surveys a technique | A survey is not automatically the original paper |
| Technique relationship | Techniques are related by an evidenced relationship or a legacy editorial suggestion | Editorial proximity does not establish derivation |

These distinctions appear in graph legends, badges, evidence details and comparison. Existing publication citation events remain intact for provenance. `publicationRelationships` deduplicates those events into `cites` edges; semantic types are separate. No `extends` or `builds-on` edges are populated in the shipped corpus because the prior metadata does not establish them.

## Use the application

- **Catalogue:** all four tasks, supported-task filtering, full-text search, technique comparison, paper details, exports and admin-reviewed imports.
- **3D graph & compare:** real WebGL graph plus an advanced SVG fallback with lineage and kinship modes; independently show citations, semantic relationships and similarity. Filter year, venue, technique, task, modality, device, environment, relationship, paper verification state, family and similarity threshold. Click papers to inspect them; use the connection list to inspect evidence and score explanations. Zoom and scroll the graph. An equivalent keyboard-accessible paper/connection list is provided.
- **Curation (admin only):** select an open review or any supported entity, inspect evidence, select a field and edit through forms. Verify Claim/Record, reject, modify or request more evidence. Paper relationship proposals are created by selecting a paper and `newRelationship`; proposals stay outside the active graph until confirmed. Similarity receives useful/misleading feedback separately from scientific verification.

Curation requires platform sign-in and persists in D1. Reviewer identity/date are assigned server-side, not trusted from the browser. Concurrent edits use optimistic revisions; a stale review is rejected and must be refreshed. A confirmed field or claim does not automatically verify the whole record. Reopening an introduction claim retracts the current introduction assertion while retaining decision history. Rejected relationships remain stored but inactive.

Browser JSON imports remain a temporary exploration feature: export to save them. Persistent curation is disabled after a temporary import so it cannot overwrite the shared database with an unreviewed browser snapshot. Reload to reconnect to saved curation. Curation API failures never silently replace saved reviews; the bundled catalogue remains readable.

## Verification and dates

States are `migrated`, `machine-curated`, and `human-verified`. The old `machine-verified` spelling is accepted only by historical v2 migration code, never by the current schema. Machine curation is not scientific verification. Only human-verified records may populate verification actor/date. Automated processing attribution belongs in provenance; claim-level evidence supports incremental review. The additive read migration clears misleading machine verifier fields while preserving their prior values in provenance and leaving historical audit snapshots unchanged.

`earliestIdentifiedYear` is the earliest linked publication year currently found in the catalogue, including unclassified legacy associations. It is provisional, not priority evidence. `introducedYear` requires an evidenced introduced association and `original-publication-confirmed` status. `introductionStatus` otherwise distinguishes not-established and earliest-identified. The PRISM 2005 and WIM 1995 v2 assertions have been preserved as review claims; both current introduction years are null. Their original records remain in the v2 snapshot.

## Data model and taxonomy

Schema v3 contains `techniques`, `publications`, `techniquePublications`, `publicationCitations`, `publicationRelationships`, `publicationSimilarities`, `claims`, `reviewQueue`, `curationDecisions` and `candidateLiterature`.

Taxonomy contains `general` and nullable task-specific `selection`, `manipulation`, `navigation` and `systemControl` sections. General metadata covers environment, distance, modalities, devices, body parts, mapping, directness and feedback. Task-specific sections are only allowed for supported tasks. Unknown values stay null; no taxonomy was invented during migration. Top-level modalities/devices/distance remain compatibility fields; validation requires them to match general taxonomy and the curation reducer synchronizes them.

Implementations have controlled platform/status, separate repository/demo/documentation URLs, language/license, scientific basis and independent software provenance. A later maintainer implementation need not have a paper describing that exact software. An empty implementation list means no implementation is recorded, not that none exists. No implementation was fabricated in this release.

Technique relationships have stable IDs, source (`legacy-editorial`, `machine-curated`, `human-verified`), provenance and active/rejected/needs-evidence status. All 72 legacy editorial links and 2 supported comparison directions survive. Claims contain a target, field, proposed value, evidence, verification and review status; not every legacy field is claimed to have evidence.

## Deterministic similarity and families

`lib/research.ts` computes weighted Jaccard overlap across techniques, tasks, modalities, devices, environments, targets, task-specific taxonomy, methodology and keywords. Default weights are 3, 2, 1, 1, 1, 1, 2, 2 and 1 respectively. Weights are explicit and configurable in code/API; no language model assigns the score. Shared and differing characteristics are explained. Missing dimensions are excluded and coverage is reported. Duplicated compatibility fields are excluded from the taxonomy signal.

Most paper features currently come from associated technique records, sometimes legacy/unclassified associations. They are **proxies**, not verified experimental characteristics of each paper. Methodology remains unknown unless recorded explicitly. A high score with low coverage is not a claim of broad scientific equivalence. The older advanced conceptual-family filter is a metadata grouping, never an ancestry assertion. The 3D task-group layout is now named Interaction Tasks. Future Technique Families membership must be explicitly curated with evidence.

Profiles are computed once per similarity run and an inverted feature index generates candidate pairs. Dense corpora can still produce quadratic pair counts. The graph renders at most 80 nodes and 150 edges; filters and accessible lists preserve access to the remaining results. Before scaling to thousands, use offline/top-k similarity computation and normalized/indexed storage instead of the current bounded JSON checkpoint.

Ancestry traverses active, evidenced dependency types (builds-on, extends, adapts, modifies, introduces-variant-of, replicates, uses-method-from, uses-technique-from), handles cycles and excludes citations by default. Survey/evaluation links are not ancestry. `timelineData` exposes dated papers and supported dependency links for future timelines; it does not manufacture an evolutionary diagram.

## Search and compare

Paper search includes title, authors, venue, year, DOI, abstract, associated techniques/tasks/modalities/devices/taxonomy and recorded methodology/keywords. Structured phrase shortcuts include `papers extending Go-Go`, `papers based on raycasting`, `papers evaluating Bubble Cursor`, `papers similar to VoiceRay`, `papers using the same techniques as Go-Go`, and `papers comparing gaze and controller interaction`. Empty results are expected when evidence or comparison roles are absent. Paper-detail ancestry/descendant controls provide the selected-paper context; this is not unrestricted natural-language interpretation.

Paper comparison shows years, venues, techniques, tasks, modalities, devices, environment, methodology, technique roles, outgoing citation/semantic links and similarity to the first paper. Unknown values render as —. Technique comparison separately shows the general/task-specific taxonomy and both year concepts.

## Run and validate

Node.js 22.13+ and pnpm are required (tests use Node's SQLite API). Retain the lockfile.

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm validate:data
pnpm lint
pnpm build
```

Full lint has 19 pre-existing diagnostics in unused UI scaffold components/hooks; scoped lint for changed product code passes. No lint rules were weakened. Tests preserve the 16 historical v2 regression tests and add 31 v3 tests, including SQLite persistence across reopen and stale-revision rejection. Scientific lineage fixtures are synthetic test data only and are not in the shipped catalogue.

D1 schema is in `db/schema.ts`; generated migration SQL is in `drizzle/`. Use `pnpm db:generate` after changing the schema. Sites owns the `DB` binding and applies packaged migrations. For a local production worker, build and apply the migration with `wrangler d1 execute DB --local --config dist/server/wrangler.json --file drizzle/0000_hesitant_spot.sql`, then `pnpm start`. Local test identities must never be used to seed production human verification. The existing deployed URL and repository path remain unchanged; GitHub Pages is not a worker deployment target.

## Migration, import and discovery

`data/legacy/catalogue-v1.json` and `catalogue-v2.json` are immutable snapshots. `lib/legacy/v2/` preserves the old schema/migration/research implementation for reproducibility. `pnpm migrate:v2` writes a new proposed v3 dataset; `pnpm graph:rebuild` reconstructs the v3 release, including prior deferred literature candidates and deterministic similarities, to `data/migrated-v3.json` by default. Neither silently replaces the live file.

The [complete v3 example](public/import-example.json) contains WIM and its publication/provenance dependencies. It already exists in this catalogue, so importing it again correctly rejects duplicates. Use it as a structural reference. `pnpm schema:generate` regenerates the external JSON Schema from the runtime shape definitions. Semantic validation additionally checks references, task consistency, duplicate/canonical symmetric pairs, introduction evidence, claim targets, implementation vocabulary and decision integrity.

```sh
pnpm import:techniques path/to/v3-batch.json
python3 scripts/discover-literature.py research/seeds.json work/discovery
pnpm ingest:literature
```

The additive CLI importer remains explicit authoring, not automatic literature discovery. Discovery writes proposals only. The ingestion command refuses targets under `data/` or `public/` and never writes D1. With no arguments it replays the historical seed pass through v2 and migration, writing `work/literature-proposal.json`. Additional v3 runs take an input catalogue and evidence-curation inputs and produce a separate review proposal. Strong suggested relationships remain needs-evidence; ingestion cannot create human-verified records/claims. Human acceptance of a candidate marks relevance, not automatic publication import.

Seven tracks are prepared in `research/expansion-tracks.json`: selection, manipulation, navigation/locomotion, system control, multimodal, hand and gaze interaction. Unchosen seeds remain empty rather than invented. No new papers or techniques were ingested in this refactor.

See [architecture](docs/ARCHITECTURE.md), [curation guidance](docs/CURATION.md), [audit](docs/KNOWLEDGE_GRAPH_AUDIT.md), [release report](docs/KNOWLEDGE_GRAPH_REPORT.md), and [contributor guidance](CONTRIBUTING.md). Earlier delivery/literature reports remain historical v2 records.

## 0.4 extension: 3D, bibliographies and restricted administration

The **3D graph** uses Three.js with orbit/pan/zoom, timeline depth, family/similarity layouts, five perspectives, survey hubs, neighbor expansion and evidence inspection. The previous graph's advanced filters and paper comparison remain in its fallback panel.

**Surveys & Reviews** uses 13 controlled publication types and normal Publication IDs. Unknown types stay unknown. Coverage counts use indexed evidence, not assumed bibliography size.

**Import** is admin-only: BibTeX paste/files, publication/technique JSON, PDF embedded text, DOI lookup and public ACM/IEEE URL metadata all preview before queueing. D1 stores individual review candidates and audit; R2 preserves source files. Approval into the catalogue keeps imported scientific data machine-curated; an explicit evidence-backed Curation confirmation is required for human verification. PDF OCR is not implemented. Public-reference adapters cache results and fail gracefully when public HTML is unavailable. They propose citations only.

**Export** supports JSON/BibTeX/CSV for papers, technique-associated papers, selection, search results, graph contents and whole collections. Complete JSON backup preserves relationships and history. Original BibTeX and import provenance remain available.

**Admin security:** every write API enforces an explicit server-side allowlist (`ADMIN_USER_IDS`, otherwise `ADMIN_EMAILS`) against identity supplied by Sites dispatch. Empty config means viewer-only. Do not expose this worker without trusted dispatch or substitute client-authored identity headers. No public admin registration exists. Hosting access remains private; application viewer support does not make the Site public.

Automatic ingestion **is not scientific verification**. Citation **does not mean builds on**. Similarity **does not mean ancestry**.

Read [extension audit](docs/EXTENSION_AUDIT.md), [complete delivery report and limitations](docs/EXTENSION_REPORT.md), and [curation guide](docs/CURATION.md). Existing schema-v3 snapshots and IDs remain compatible through optional additive fields. Apply all Drizzle migrations and configure both D1 `DB` and R2 `FILES` before running import APIs. The curated checkpoint has a 1.8 MB acceptance limit; normalize it before publishing thousands of accepted records. Pending import batches are stored separately.


## Trust and usability refinements (August 2026)

**How to Use:** `/how-to-use` is a public application route, linked prominently in the header. It provides searchable, anchored help for searching, comparing, surveys, graph controls and relationship meanings, exports, administrator imports, verification, recovery and privacy. The hosting access policy still applies: this deployment remains owner-only. Dismissible first-use guidance stores only its dismissal in localStorage. Contextual graph help and keyboard-focusable verification tooltips reuse shared definitions in `lib/verification.ts`.

**Approval versus verification:** Approve Import accepts a candidate as machine-curated. Verify Claim/Record is a later explicit administrator decision requiring evidence and notes. Both actions have distinct wording and confirmation. Only the server assigns human reviewer identity/date; import payloads cannot promote themselves. Machine records have null `verifiedBy` and `verifiedDate`. Live D1 snapshots are normalized on read and persisted with the next successful write; the migration does not discard older audit snapshots.

**Administrator authorization:** configure `ADMIN_USER_IDS` with authenticated **Sites-scoped** IDs, comma-separated. When nonempty it is authoritative: a listed ID works without email, and a listed email cannot override an unlisted ID. Only when no IDs are configured does `ADMIN_EMAILS` apply (case-insensitive). Empty configuration denies administrator access. All writes, publisher refresh and private analytics enforce authorization on the server. These headers are trusted only behind Sites dispatch; never expose a directly reachable production worker trusting caller-provided identity headers. This deployment retains the previously configured owner email fallback because the owner's actual Sites-scoped ID has not been established. Do not substitute a workspace account ID.

**Publication venue form:** `publicationVenueType` is separate from intellectual `publicationType`. Allowed values: journal, conference, workshop, book, book-chapter, thesis, preprint, technical-report, other, unknown. Older v3 records may omit it; the additive upgrade assigns unknown unless an original BibTeX entry type establishes a form. BibTeX preserves original entry type and maps article/inproceedings/book/incollection/phdthesis/mastersthesis/techreport appropriately. Generic thesis without a known degree exports as misc rather than inventing a PhD/master's classification. Venue type is available in publication filtering, details, curation and CSV/JSON export. Crossref's declared type can establish venue form; titles alone cannot.

**Visitor analytics:** a visit is one recorded anonymous browser-tab session per UTC day, not a unique person. Counts start from real zero on this release; prior traffic is not reconstructed. The client generates a random UUID in sessionStorage. The server hashes the UUID with its own UTC day and transactionally deduplicates before incrementing daily and lifetime totals in D1. Reloads, route navigation, React remounts, filters, dialogs and graph interactions cannot increment the same session/day twice. A long-open page does not emit background midnight visits; a later page entry can record the new UTC day. Browsers may copy sessionStorage when duplicating tabs, so those copies may share a visit. New independent sessions may count separately.

No analytics IPs, emails, identities, raw user agents, referrers, viewed records or searches are collected. Day hashes older than the previous UTC day are deleted on the next visit; lifetime and daily aggregates persist. There is no scheduled cleanup while traffic is idle. Hosting operational logs are outside this application's analytics store. Blocking sessionStorage skips recording and still allows the read-only count; analytics failure never blocks browsing. Public API callers cannot supply/change totals, but anonymous fresh sessions are **not bot-proof** or a reliable count of unique humans. Same-origin and payload validation prevent accidental/direct counter edits, not determined traffic simulation.

The global footer shows lifetime visits. Administrators can load lifetime, today and the last 30 UTC days, with a daily table. Page rankings, searches, device breakdowns and unique-person tracking are intentionally omitted. Migration `drizzle/0003_fast_alex_power.sql` creates the three empty analytics tables; do not copy local test databases into deployment artifacts.

**Accessibility and usability:** skip-to-content, semantic landmarks, visible focus, named controls, live action feedback, text edge legends/lists, reset controls and optional guidance support keyboard/non-WebGL use. The header and help grid wrap below 700px; graph height is viewport-bounded; comparison and data tables retain scrollable layouts. These are implementation improvements, not a WCAG certification or a completed device/screen-reader audit. See `docs/usability-review.md` for the actual H1–H10 review and limitations, and `docs/REFINEMENT_REPORT.md` for delivery/validation results. No mass literature ingestion was performed.


## Selection survey expansion and stable detail controls

The August 31 release maps all **31 named entries in Table 1** of Argelaguet & Andujar (2013), plus **World-in-Miniature** from section 4.3. This is a documented 32-entry extraction scope, not a claim to cover every supporting design pattern in the paper. Twelve canonical techniques already existed; 20 machine-curated techniques and 17 publications were added. There are 32 evidenced `surveyed` associations for this survey (26 new) and 29 new citation relationships. No introduction year or historical lineage was inferred.

Sources: [publisher record](https://www.sciencedirect.com/science/article/pii/S0097849312001793), [DOI](https://doi.org/10.1016/j.cag.2012.12.003), and [public university-hosted paper](https://www.cs.ucf.edu/courses/cap6121/spr15/readings/3Dselection.pdf). `data/survey-extraction-2013.json` records row-to-canonical mappings, source bibliographic metadata and lookup outcomes. Most Crossref requests were unavailable; those records use survey-bibliography metadata with null DOI rather than invented identifiers. Only exact title/year matches were adopted. Bibliographic ambiguity is preserved in six specific review items, with additional per-technique and alias reviews. The paper PDF and figures are not redistributed.

Existing technique records are not overwritten for alias enrichment. Supported alternate survey labels are represented in evidence or open alias claims and included in search; the administrator can approve canonical alias changes later. Flashlight maps to the existing Cone Casting/JDCAD record, Flexible pointing to Flexible Pointer, and the table's Adaptative pointing spelling is retained as an alias of the new Adaptive Pointing record. Source-paper associations are `unclassified`, not confirmed introductions.

`lib/release-seed.ts` merges the immutable `data/releases/selection-survey-2013.json` patch on persistent catalogue reads. It inserts absent entities, deduplicates canonical names/aliases and publication DOI/title-year, preserves existing entity values, relationship decisions and audit snapshots, and uses the existing revision compare-and-swap for persistence. Repeated reads are idempotent. Derived similarity scores are recomputed from the expanded metadata; they are not scientific verification. The database is neither dropped nor reseeded. A storage-capacity failure or concurrent revision change leaves existing curation unchanged and requires retry/review. The generation script refuses to replace an already-created release patch.

Survey details list covered techniques, referenced papers and scope, with direct technique navigation and Expand survey coverage. Task scope prefers the survey's explicit tasks over every task a covered technique might support. Technique-family membership remains unestablished; descriptive mechanisms do not imply ancestry.

How it works now uses a controlled React disclosure with functional state updates, unique aria-controls, native button keyboard behavior and technique-keyed reset. Other detail disclosures use native details/summary and inherit the keyed reset; static Advantages/Limitations/Implementation sections remain static. The actual browser failure found during testing was a Node-only BibTeX dependency imported by browser export code. Parsing now lives in `lib/bibtex-parser.ts`, imported by the server API and tests only; browser exports remain in `lib/bibliography.ts`.

The global footer owns the sole public visit counter and links to `/how-to-use`, `/about` and `/license`. Footer navigation uses the existing framework Link component. The license page includes the repository's exact MIT text, distinguishes software from third-party scholarly content, and explains implementation-specific licenses. Footer analytics retains the same anonymous session/day definition and database totals; no counts are reset.

Run `pnpm test` for the complete suite, including real DOM click/keyboard tests using Testing Library and jsdom. See `docs/SURVEY_RELEASE_REPORT.md` for scope, validation, browser observations and limitations.
