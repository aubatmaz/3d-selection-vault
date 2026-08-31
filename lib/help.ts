import { verificationDefinitions } from './verification.ts';
export const helpTopics = [
  {
    id: 'find-technique',
    title: '1. Find an interaction technique',
    text: 'A technique is a 3D interaction method, such as Go-Go, Raycasting, Bubble Cursor or HOMER. Start in Catalogue → Techniques. Search a name or concept, then narrow by task, device, modality or environment. Active filter chips show what is applied; remove a chip or choose Clear all filters.',
    example: 'Try raycasting, gaze, or Poupyrev.',
  },
  {
    id: 'find-publication',
    title: '2. Find a research publication',
    text: 'A publication is a paper, survey, thesis, book or chapter. Choose Publications in the catalogue. Search titles, authors, DOI or venue. Publication type describes the document’s intellectual role, such as survey. Venue type describes its form, such as journal or conference. Unknown means the available metadata does not establish it.',
  },
  {
    id: 'surveys',
    title: '3. Browse surveys and reviews',
    text: 'Open Surveys & Reviews for an overview of an area. Filter by interaction task, open a publication to inspect its scope, then click a covered technique directly, or choose Expand survey coverage / Explore in 3D. Follow Survey → Technique → associated research paper → later related work. Survey extraction identifies candidates; only administrator evidence review can confirm original-publication claims. Coverage and reference counts include only records and supported relationships already indexed in the Vault; they are not the paper’s full bibliography.',
  },
  {
    id: 'compare',
    title: '4. Compare techniques or publications',
    text: 'Select + Compare on two to six techniques. The comparison tray stays visible; use it to open the comparison, remove a technique or clear the selection. In the graph’s Advanced paper filters, comparison and 2D fallback, select two to six publications. Missing values remain unknown rather than inferred.',
  },
  {
    id: 'graph',
    title: '5. Explore the 3D graph',
    text: 'Drag to rotate/orbit. Right-drag to pan; on touch devices use two fingers to pan/zoom. Scroll or pinch to zoom. Select a node to open its details; close the dialog to return. Focus selected node centers the camera. Isolate branch shows neighbors; Expand one level adds a hop; Collapse keeps the selected node. Reset graph restores controls and camera. The accessible node and edge lists offer the same records and evidence without WebGL.',
  },
  {
    id: 'modes',
    title: '6. Understand graph views and layouts',
    text: 'Citation Network shows references. Research Lineage shows evidence-backed scholarly relationships, with each relationship labelled. Research Kinship shows undirected similarity. Technique Evolution includes techniques, their publications and supported relationships; it does not prove chronology alone. Combined Graph lets you toggle these layers. Interaction Tasks is a layout grouping selection, manipulation, navigation, system control and general 3D—not a historical research family. Timeline depth represents publication year. Technique Families is reserved for future curated, evidence-backed membership.',
  },
  {
    id: 'relationships',
    title: '7. Understand relationships',
    text: 'Technique–publication roles include introduced, evaluated, compared, modified, reused and surveyed. A citation means Publication A references B. Scholarly lineage means evidence explicitly supports A extending, adapting or building on B. Citation alone does not establish lineage. Open an edge to inspect its evidence, source and verification scope.',
  },
  {
    id: 'verification',
    title: '8. Read verification labels',
    text: `Migrated: ${verificationDefinitions.migrated} Machine-curated: ${verificationDefinitions['machine-curated']} Human-verified: ${verificationDefinitions['human-verified']} Parser activity belongs in provenance, not the verifier fields.`,
  },
  {
    id: 'exports',
    title: '9. Export references',
    text: 'Export offers JSON, BibTeX and CSV for current catalogue results, selected publications or whole collections. Each detail view exports that publication or a technique with its associated publications. The graph exports its visible records. Complete JSON backup also preserves relationships and history. A download message means the browser received the file; check your Downloads folder.',
  },
  {
    id: 'imports',
    title: '10. Import and curate (administrators)',
    text: 'Administrators can paste BibTeX or upload BibTeX, JSON or PDF, or look up a DOI/public ACM or IEEE URL. Parse & preview first. Inspect counts, errors and potential duplicates before adding candidates to the review queue. Approve Import accepts a machine-curated record; it never verifies scientific content. Later, Verify Claim or Verify Record requires inspected evidence and decision notes. Reject and Need more evidence retain history. Viewers cannot approve, edit, verify or refresh sources.',
    example:
      '@article{ExampleKey, title={Your actual publication title}, author={Actual Author}, year={2024}} — replace the example with real metadata; do not import it as a real paper.',
  },
  {
    id: 'similarity',
    title: '11. Interpret similarity conservatively',
    text: 'Similarity compares recorded techniques, tasks, modalities, devices, environments and other research characteristics. Scores are deterministic and their reasons are inspectable. Threshold and top-neighbor controls limit visible edges. Similarity clusters are research similarity groupings, not historical lineage or evidence that one author influenced another.',
  },
  {
    id: 'recovery',
    title: '12. Recover from problems',
    text: 'No search results? Remove a filter or clear all. No graph edges? Enable citations or lower the similarity threshold. PDF has no usable text? It may be scanned or protected; try DOI or BibTeX instead. OCR is not run. Publisher references unavailable? Public HTML may be blocked or unsupported; use PDF/manual evidence. Save conflict? Reload the latest catalogue and review your change again. Keep your original file until review succeeds.',
  },
  {
    id: 'privacy',
    title: 'Visits and privacy',
    text: 'The global footer counter records one anonymous browser-tab session per UTC day when a site entry is recorded. Reloads, filters, dialogs, graph interactions and internal navigation do not add duplicate visits for that session/day. It is not a count of unique people and starts at zero for this release. An anonymous random session identifier lives in sessionStorage; only a day-specific hash is stored for deduplication and removed on the next recorded visit after the following UTC day. Daily and total aggregates remain. The app does not store IPs, email, user agents, referrers, search queries or viewed records for analytics. If session storage is blocked, the entry is not counted. Hosting may maintain its own operational logs.',
  },
] as const;
