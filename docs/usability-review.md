# Usability review — 3D Interaction Vault

Date: 30 August 2026. Scope: refinement of the existing application; no architecture replacement or mass ingestion. This review is based on code, automated tests and production-worker HTTP checks, not an observed user study or visual/device certification.

## H1 — Visibility of system status

**Existing issue:** catalogue hydration failed silently; import preparation, graph startup, saving and download handoff lacked consistent feedback.

**Change made:** loading/saved-catalogue/fallback status, BibTeX/JSON/PDF/metadata preparation messages, preserved PDF page progress, graph-building status, reference fetching/queueing messages, saving status, export counts/formats and browser-download handoff. PDF title/DOI/reference summary precedes raw extraction details. Analytics loading and failure are nonblocking.

**Remaining limitation:** most operations expose stages, not accurate time estimates. A synchronous small export may complete before its initial message is painted. Initial visitor-count text says unavailable until the request resolves. No background midnight visit is generated.

## H2 — Match between system and the real world

**Existing issue:** Research Families labelled task groups; import acceptance and verification could be confused; imported parser actors appeared as verifiers.

**Change made:** Interaction Tasks, Approve Import versus Verify Claim/Record, shared scientific definitions, separate document role and venue form, contextual explanations of citations, lineage and similarity.

**Remaining limitation:** advanced import editing still exposes JSON; bibliographic evidence remains technical by nature. The older advanced conceptual-family filter is a metadata grouping, explicitly not lineage.

## H3 — User control and freedom

**Existing issue:** graph filters/camera required several separate reversals; active filters lacked a prominent combined reset.

**Change made:** Reset graph restores graph controls, selection and camera; Clear all filters alongside removable chips; preserved dialog close, back navigation, compare removal/clear and temporary import cancellation. Busy imports cannot be accidentally resubmitted. First-use guidance is dismissible.

**Remaining limitation:** in-flight PDF extraction cannot be aborted mid-page; wait for preview and cancel before acceptance. Persisted changes are reviewed via history and subsequent decisions, not a universal undo button.

## H4 — Consistency and standards

**Existing issue:** verification descriptions and research-group labels could drift between surfaces.

**Change made:** one shared verification-definition map drives badge tooltips and help. Import approval and scientific verification use separate consistent actions. Existing UI primitives, dialogs and select controls are retained.

**Remaining limitation:** publication and paper remain contextual synonyms in older advanced screens. Historical reports preserve the wording used at their release.

## H5 — Error prevention

**Existing issue:** scientific confirmation could be attempted before evidence inspection; permanent review actions lacked a final explicit confirmation.

**Change made:** disable Verify without inspected evidence, selected source and decision notes; separate confirmation for scientific verification and import acceptance; preserve duplicate detection, candidate preview, same-origin checks, server identity override, revision conflicts, strict venue and verification validation. No public self-registration or permanent-delete endpoint was introduced.

**Remaining limitation:** administrators must assess whether evidence truly supports the claim. Schema validation and a checkbox cannot determine scientific truth. Fresh anonymous sessions can simulate traffic; analytics is not fraud detection.

## H6 — Recognition rather than recall

**Existing issue:** users had to infer graph meanings and remember their current surface/filter context.

**Change made:** location breadcrumb, shared badge explanations, contextual help for lineage/kinship/layouts, visible legends and edge reasons, active chips, persistent comparison count and selected items. Help explains all graph operations and layers.

**Remaining limitation:** large graph reading still requires domain familiarity; bounded rendering and list filtering remain necessary.

## H7 — Flexibility and efficiency

**Existing issue:** expert capabilities lacked an accessible novice entry point.

**Change made:** prominent searchable How to Use, optional first-visit guide and short examples. Retained compound filters, 2–6 item comparison, BibTeX/CSV/JSON scope exports, graph filters and administrator import tools; added venue-form filtering.

**Remaining limitation:** no new global keyboard shortcut scheme. Existing keyboard controls and text alternatives remain the supported path.

## H8 — Aesthetic and minimalist design

**Existing issue:** raw PDF extraction occupied the preview before users could identify the result.

**Change made:** readable title/DOI/reference summary and collapsed raw extraction; help uses searchable sections, graph help uses disclosures; cards continue to defer full evidence/provenance to details. Existing graph edge limits, selection labels and progressive expansion remain.

**Remaining limitation:** dense advanced filters and comparison tables can still require scrolling. No new visual redesign or measured contrast audit was performed.

## H9 — Error recognition and recovery

**Existing issue:** catalogue failure was silent; empty graph/survey views lacked an immediate recovery action.

**Change made:** catalogue fallback explicitly explains reload recovery; empty graph describes enabling layers/lowering thresholds and offers reset; survey empty state clears filters; retained catalogue clear-filters recovery. Help explains scanned/protected PDFs, DOI/BibTeX alternatives, inaccessible publisher HTML and save conflicts. Analytics errors do not replace catalogue content.

**Remaining limitation:** uncommon server validation/provider errors may still include technical detail. No OCR or paywall bypass is offered. Interrupted writes must be reloaded and inspected before retry.

## H10 — Help and documentation

**Existing issue:** no single public onboarding/help route covered the existing research workflows.

**Change made:** `/how-to-use` provides searchable sections and anchors for techniques, publications, surveys, compare, graph controls/modes, scientific relationships, verification, exports, imports, similarity, error recovery and privacy. Header link, optional banner and contextual tooltips make it discoverable. README documents authorization, migration, analytics and venue mapping.

**Remaining limitation:** no narrated mandatory tour or tutorial video. Public route means no application admin requirement, not a change to owner-only hosting access.

## Accessibility and responsive review

The application adds a visible-on-focus skip link, per-surface main target, semantic output announcements, named search/reset/help controls, focusable verification tooltips and native disclosure controls. The SVG fallback is a section rather than a nested main. The graph retains node/edge lists and text legends; color is not its only meaning channel. At narrow widths header controls wrap, help navigation becomes one column, and graph height is bounded; existing comparison/table scrolling remains available.

Automated lint was applied to modified application files. Real keyboard/screen-reader navigation, touch behavior, visual contrast measurements and device screenshots were not performed; they remain recommended acceptance checks. Pure aesthetics are not unit tested.


## August 31 follow-up: disclosures, footer and survey coverage

- **H1 — Status:** controlled How it works shows expanded state and ± indicator; graph construction retains its status message. Remaining limit: the original reported third/fourth-click symptom was not reproduced on the old static heading.
- **H2 — Research language:** surveyed, referenced source and confirmed original remain distinct; software versus research-content licensing is explicit. Remaining limit: source names retain conservative bibliography spellings where publisher metadata was unavailable.
- **H3 — Control:** functional toggles, technique-keyed reset, dialog reopen tests, graph collapse/re-expansion. Remaining limit: no undo of persistent scientific decisions beyond the existing audited workflow.
- **H4 — Consistency:** proper button disclosure plus stable native details for existing expandable sections; static sections are not unnecessarily redesigned. Remaining limit: not every section is collapsible.
- **H5 — Prevention:** canonical/alias/publication matching avoids duplicates; insert-only release merge and revision checks preserve curation. Remaining limit: ambiguous aliases and bibliography discrepancies still require administrator assessment.
- **H6 — Recognition:** survey details visibly list covered techniques and referenced papers. Remaining limit: long reference lists require scrolling.
- **H7 — Efficiency:** direct survey → technique navigation and focused graph expansion; alternative labels join search through evidence/claims. Remaining limit: not every supporting design pattern in the survey has a technique record.
- **H8 — Minimalism:** visits and licensing move to a compact global footer; reference details are disclosed on demand. Remaining limit: scholarly record dialogs can still be long.
- **H9 — Recovery:** Node-only BibTeX parsing is separated from client exports, resolving the observed browser load error; analytics failure preserves the footer. Remaining limit: browser automation blocked some link-navigation attempts; independent route checks pass.
- **H10 — Help:** help explains survey exploration and provisional historical claims; license page includes the complete software license. Remaining limit: a human link-click and physical-device acceptance pass remains recommended.

Browser checks observed six click toggles, technique switching, dialog reopening, survey-to-technique navigation, graph collapse to one node and re-expansion to 62 nodes. At 390px width the license page and footer were visually inspected without horizontal overflow. Enter/Space passed actual DOM interaction tests; the in-app browser's injected key events did not activate the control, so manual browser-keyboard success is not claimed. Some browser navigation attempts were blocked (`ERR_BLOCKED_BY_CLIENT`); HTTP checks independently verified home, help, about and license routes and a single rendered global footer. These limitations do not justify claiming completed device/screen-reader certification.
