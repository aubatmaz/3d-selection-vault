# Knowledge graph audit (before v3 changes)

Baseline source: release 44e55b1. Reviewed application/components, shared types/schema/validation/search, migrations/ingestion, scripts, research inputs and reports, tests, configuration/hosting, original snapshots and UI primitive inventory. Third-party dependencies and generated build output excluded.

30 techniques; 34 publications; 43 technique-publication links; 10 citation discovery records representing 9 unique citing/cited pairs; 74 technique relationships (72 legacy editorial, 2 supported comparison directions); 42 open review items. All 16 tests pass. Full lint has 19 previously documented scaffold diagnostics.

Risks: PRISM 2005 and WIM 1995 are stored as introduction years although release notes qualify them as earliest identified; retain the original v2 snapshot and expose review claims rather than silently asserting priority. Citation discovery duplicates represent distinct provenance, not different scientific links. Existing source notes and all v1/v2 history must survive. Flat taxonomy is selection-oriented. Implementation publication evidence conflates scientific basis with code authorship. Browser edits currently disappear on reload. Record-wide verification is too coarse. Similarity from associated techniques must be labeled as metadata resemblance rather than proof of a paper's experimental method.

Change map: v3 model/schema and migration, graph/similarity/search/traversal logic, claim and curation reducer, D1-backed authenticated decision history, graph/comparison/curation UI and paper navigation, safe proposal-only ingestion, tests/schema/examples/docs. Existing visual theme, IDs and URL remain. No mass literature ingestion. No inferred historical lineage.
