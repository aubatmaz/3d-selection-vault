# Human curation guide

Only the authenticated owner/admin can open scientific curation. Server allowlists enforce this independently of the interface. Open Curation and select a review item or entity. Read its current evidence, provenance and scope. Unknown or inaccessible evidence is a reason to choose Need more evidence, not Confirm.

For a field correction, select the field, use the ordinary form controls, supply the relevant publication/page/section and write decision notes. Modify saves an unconfirmed correction. Confirm explicitly approves the selected field or claim; use Record scope only after reviewing the record broadly. For an introduction claim, select the actual supporting original publication, not a later survey. Its year must match the proposed introduction year. The two migrated claims remain unconfirmed until a researcher performs this action.

To propose a new paper relationship, select its source Publication, choose `newRelationship`, choose the target and type, record evidence, and press Modify. It enters the review queue as needs-evidence and stays outside the active graph. Then select that publication relationship and explicitly confirm after review. A citation alone is insufficient to confirm extends, builds-on, adapts, modifies, introduces-variant-of or replicates. Symmetric compares-with/contrasts-with endpoints are canonicalized; source/target direction matters for other types.

Technique relationships retain their original IDs and evidence. Legacy editorial links are explicitly labeled; confirming conceptual similarity does not turn it into historical lineage. Rejected links remain in the database with rejected status and are excluded from active views.

Taxonomy forms expose general and task-specific dimensions. Only instantiate task-specific sections for supported tasks. Use unknown/null rather than checking an unsupported value. Top-level device/modality/distance edits synchronize with their general-taxonomy counterparts.

Add software through a technique's implementations field. Enter an implementation ID, platform/status and applicable URLs; record software authorship/date separately from scientific basis. A later implementation can be based on an original technique paper without that paper describing the exact code. Never invent a repository, license, validation result or implementation author.

Mark similarity useful/misleading to provide feedback. This does not human-verify a paper, claim or historical relationship. Read coverage and the proxy-metadata warning before interpreting a percentage.

Saved decisions are attributed to your signed-in account. A revision conflict means someone saved a newer state: reload, inspect the latest changes, and decide again. There is no silent overwrite. If persistent storage is unavailable, review submission is disabled and an error is shown. Imports now use the admin Import dashboard: preview, add to the durable review queue, then approve/edit/reject/request evidence. Candidate acceptance stays machine-curated; verification requires a separate explicit Confirm with evidence. Complete JSON backup includes catalogue history. Import decisions have a separate server-authored audit trail available in Import.

Rejected records are retained. Reopening a confirmed introduction withdraws the current introduction assertion while preserving earlier decisions. Human confirmation is always an explicit researcher action; the migration, automated discovery, similarity calculation and release scripts never perform it.

PDF and publisher reference matches create needs-evidence cites proposals, never lineage. Cached publisher failures are retried only by an explicit admin refresh. PDF/Crossref conflicts are shown side by side. For JSON technique imports, accept supporting publications first. Existing technique identities are never destructively merged.
