# 3D Interaction Vault extension — delivery report

## 1. Architecture

React/Vinext remains the application shell. Three.js is loaded on demand for WebGL; PDF.js loads only for PDF extraction. Citation.js handles BibTeX grammar. D1 retains the optimistic-concurrency catalogue checkpoint and adds import jobs, individual candidates, import audit, reference cache and rate-limit reservations. R2 retains PDF bytes, original input text and immutable import previews. Source files and pending queue access are admin-only.

## 2. Files

New core modules: `auth`, `bibliography`, `pdf-extraction`, `reference-providers`, `citation-proposals`, `import-store`, `import-review`, `technique-import`, `publication-upgrade`, `surveys`, `graph3d`. New UI: graph explorer/WebGL renderer, survey browser, import dashboard, export panel, reference discovery. New APIs: imports, references, metadata. Updated existing model/schema, curation repository and API, main page, publication/technique details, database schema, migrations, schema export and documentation. Source ZIP includes these files and the lockfile.

## 3. Authentication and administration

Every scientific write route calls `requireAdmin` before parsing or accessing data. Missing configuration fails closed. The existing Sites owner is configured via a server-only explicit email allowlist. `ADMIN_USER_IDS`, when configured, takes precedence and uses Sites-scoped stable identity. No signup, client role claim or first-user bootstrap exists. Sites dispatch must own the external ingress and supply authenticated headers; do not expose a raw worker that accepts client-authored identity headers. Existing private owner-only hosting access is preserved. Application viewers can read and export without mutation rights if hosting access is later expanded.

Same-origin requests are required for writes. Curation overwrites reviewer identity/date/adminId/timestamp with server values. The repository records previous/new entity values. Import acceptance/rejection records admin ID, timestamp, action, target, before/after and notes in D1, atomically with the guarded catalogue/queue update. UI exposes recent import audit records.

## 4–5. Publication types and surveys

All 13 requested publication types are supported. Undefined legacy types display as unknown. Optional fields allow old schema-v3 files to remain valid; release defaults never replace an explicit classification. Three existing records are classified using previously retained title/abstract evidence: Argelaguet 2013 survey, Entering the Next Dimension literature review, Yu systematic review. No new human verification is created. Weise remains unknown rather than overclaiming from incomplete evidence.

Surveys & Reviews filters by task, including general 3D. Survey pages show known scope, covered-year/taxonomy fields or unknown, evidenced technique coverage, indexed references, explicit coverage edges and later supported surveys. They remain ordinary publication entities. `surveys/reviews/classifies/includes` and corresponding technique roles require evidence. Citation alone never contributes to explicit survey coverage.

## 6–7. BibTeX

Paste/file → parse → normalize → field validation → duplicate checks → preview → durable candidate queue → admin review. Supports up to 5,000 records / 10 MB input, with enqueue batches of 100 and review pages of 50. Metrics report total, parsed, exact duplicates, potential duplicates, errors and candidate count. Parser errors are inspectable; independent entries can be recovered from malformed multiline input. Original keys, original BibTeX, filename, timestamp and original source files are preserved. Colliding imported/export keys receive deterministic suffixes.

DOI is the strongest identity. Normalized title, authors/year and original key produce potential duplicates. Nothing merges destructively. DOI duplicates are excluded from new-publication acceptance; edit the existing record instead. Potential matches need explicit review. Exports support article, inproceedings, book, incollection, phdthesis/mastersthesis and misc using known metadata. Bibliographic venue is not guessed into a journal or conference when that distinction is unknown. JSON/BibTeX round trips cover the available bibliographic fields; arbitrary LaTeX macros/custom fields remain in the original source, not necessarily normalized export.

## 8. PDF parser

PDF.js extracts embedded text in the browser worker from real PDF bytes. Up to 8 MB / 300 pages / 2 MB extracted text. Original PDF is retained in R2. PDF document metadata supplies candidate title/authors where available; heuristic text parsing supplies title/year/DOI/abstract/headings and references. Authors otherwise remain unknown. Technique name mentions are surfaced as mentions only. No introduced/evaluated role or intellectual lineage is inferred from a mention.

References match known DOI or sufficiently long normalized titles. Unmatched DOI references become minimal publication candidates; unresolved strings remain in the extraction record. Approving the source paper proposes matched `cites` edges for separate review. For an existing DOI-matched source, queueing its PDF preview can propose citations without creating a duplicate paper. New reference candidates do not become verified citations merely by being parsed. PDF DOI lookup can show Crossref metadata and explicit conflicts; neither source is silently overwritten.

Scanned/no-text PDFs stop with an explicit message. OCR is not implemented or silently attempted. Reading order, author metadata, title boundaries and reference segmentation remain fallible. PDF source and extraction JSON are preserved for review. The normal test suite exercises actual embedded PDF bytes as well as text heuristics.

## 9–11. ACM, IEEE and citation matching

A common `ReferenceProvider` exposes `canHandle` and `fetchReferences`. ACM supports public reference list markup; IEEE supports reference list markup exposed in its public article HTML. These are conservative adapters, not guarantees that the live publishers expose references. JavaScript-only, changed, redirected, restricted and blocked pages return a descriptive unavailable/blocked state. No authenticated API, credentials, browser scraping or access bypass is used.

Server retrieval allows only exact ACM/IEEE HTTPS hosts and supported IEEE document paths. Redirects are not followed. Responses are bounded and timed out; a descriptive user agent is supplied. D1 atomically reserves one request per provider per minute; metadata and reference retrieval share that limit. Results, including failures, are cached. Only an admin can explicitly refresh. Crossref DOI metadata uses a separate three-second reservation and cache. Public publication-URL import reads explicit citation metadata tags only.

Matched references propose `cites`, with reference text, provider, source URL, retrieval date and match method. They enter `needs-evidence`; they are not active scholarly lineage. The current production corpus was not expanded through publisher crawling.

## 12–14. 3D graph

Three.js + OrbitControls render real XYZ meshes, not transformed SVG. Perspectives: Research Lineage, Citation Network, Research Kinship, Technique Evolution, Combined Graph. Layouts: timeline (Z = year), task/research families, threshold-based similarity clusters. Similarity clustering is connected-component grouping, not a validated dimensional embedding or historical model.

Orbit, pan, zoom, node selection, selected-node focus, reset, branch isolation, 0–5-hop expansion, text search, entity/edge toggles, type hiding, threshold and top-5/top-10 similarity controls are supported. Surveys can open directly into a neighboring graph. Nodes differ by geometry and label; edges distinguish direction and type. Clickable evidence and keyboard-accessible node/edge lists are provided. Existing advanced filters and comparison remain available in the 2D fallback.

Initial rendering is capped at 200 nodes, expandable to 1,000; visible edges are capped at 1,500. Similarity is thresholded and degree-limited. Labels simplify above 100 nodes. Rendering resources and event handlers are disposed on changes/unmount. This bounds rendering, but the current catalogue is still downloaded as a whole; server-paginated graph neighborhoods are a future scale improvement.

## 15–17. Validation

See the final validation summary below. Tests are offline, with mocked publisher responses. They cover parsers, large/malformed BibTeX, round trips, duplicate detection, actual PDF text extraction, reference matching, provider failures/cache, publication types/surveys, 3D coordinates/edges/filtering/expansion, admin/viewer guards, import verification demotion, provenance and export scopes. Existing scientific validation and SQLite concurrency tests remain.

Local worker integration additionally checks viewer rejection on every write endpoint, public read access, persistent preview/queue/acceptance, attempted human-verification smuggling, duplicate approval rejection and missing-origin rejection. These run only against an isolated local database. No test records are deployed.

## 18. Security considerations

Admin-only mutation, private source files, explicit role allowlist, server-authored audit identity, schema validation, same-origin writes, parameterized SQL, concurrency guards, byte/count limits, exact publisher host restrictions, redirect refusal, request timeouts/rate limits and failure caching are enforced. Imports cannot directly insert a human-verified state. Administrators still need to inspect untrusted document contents and scientific evidence. Publication export files should be treated as untrusted data by downstream tools.

## 19. Known limitations

- The curated catalogue remains a single D1 checkpoint for compatibility. Acceptance stops before 1.8 MB; the pending queue remains intact. Normalize published records before a large accepted-corpus expansion.
- No OCR, LLM paper interpretation, automatic semantic lineage inference, or public contribution UI.
- PDF reference parsing is heuristic; incomplete DOI-less references remain unresolved. New DOI-only reference candidates need metadata review and subsequent relationship curation.
- JSON imports accept publication/technique candidates, not an automatic replay of imported decisions or approval of an entire relationship graph. Import linked publications before techniques whose evidence references them. Original JSON is retained for manual relationship review.
- HTML provider adapters are deliberately narrow. Live ACM/IEEE availability is not asserted from fixture tests. Use DOI/PDF/manual evidence when unavailable.
- WebGL interaction is implemented and build-validated; no browser visual/interaction QA was performed under the Sites workflow restriction. Accessible lists and the retained SVG view provide fallbacks.
- Full repository lint contains pre-existing unused UI scaffold diagnostics; changed-file lint is checked separately.

## 20. Recommended next steps

Normalize accepted publications/techniques/edges and add server-paginated neighborhoods before accepting thousands of records. Pin administration to the owner's Sites-scoped user ID once available. Validate publisher adapters against a few permissible real public pages without widening scraping. Add curator-reviewed PDF fixtures for varied layouts and a separately consented OCR path. Conduct browser interaction/accessibility testing when requested. Perform a small reviewed import before any larger literature expansion.


## Final validation summary

- **83/83 tests passed** (47 retained regression tests + 36 extension tests), including actual PDF.js extraction and mocked reference-cache behavior.
- **TypeScript:** passed. **Changed-file lint:** passed. **Full repository lint:** 19 pre-existing diagnostics in unused UI scaffold; no new diagnostics.
- **Data and generated schema:** validated, preserving 30 techniques and 34 publications.
- **Production build:** passed. Non-fatal large-chunk and Vinext route-classification warnings remain.
- **Local persistent API tests:** viewer rejection on all mutation routes; viewer read; preview/queue/acceptance; forced demotion of imported human-verification claims; replay rejection; origin rejection; administrator audit identity and explicit confirmation checked with synthetic local data.
- No uncontrolled ingestion, no GitHub push, and no production test records. The existing private site is the deployment target.
