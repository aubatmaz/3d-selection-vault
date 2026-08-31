# Literature ingestion — 2026-08-30

This is a bounded first seed corpus, not a complete inventory. Automated metadata verification and evidence extraction do not constitute human scientific verification.

## Results and count definitions

| Measure | Result |
| --- | --- |
| Seed publications imported | 4/4 |
| Seed full texts inspected | 3/4; Weise 2019 metadata/reference list only |
| Cited publications whose metadata were inspected | 9 distinct papers: 8 direct references, 1 second-level reference |
| Original cited-paper full texts inspected | 1: Stoakley et al. 1995; other cited papers are metadata-only in this release |
| Relevant publications newly added | 8 = 4 seeds + 4 cited papers |
| Existing publications enriched without duplication | 5 |
| Final publication count | 34 = 26 migrated + 8 new |
| Existing techniques matched/enriched | 8 distinct techniques |
| New candidate techniques | 2: PRISM and Worlds in Miniature |
| Final technique count | 30 = all 28 migrated + 2 candidates |
| Duplicate publication records avoided | 5 DOI matches |
| Existing technique records reused | 8; no duplicate technique created for these matches |
| Aliases added | 5 total: 2 on existing records, 3 on new records |
| Typed technique edges added | 2 directed compared-with edges, representing one symmetric comparison |
| Technique-publication associations added | 15; total 43 including 28 preserved unclassified associations |
| Backward citation edges | 9: 8 from seeds, 1 from PRISM 2007 |
| Forward citation edges | 1, independently rediscovered among 5 API candidates |
| Techniques awaiting human verification | All 30 |
| Human-verified publications | 0; all 34 need review before such a designation |

Counts above distinguish metadata inspection from full-text reading. `research/ingestion-report.json` contains computed enrichment counts. `research/discovery-manifest.json` records API requests and proposals. Each retained citation DOI was checked against the source publication's Crossref reference list.

## Seed access and bibliographic decisions

| Seed | Reliable metadata / accessible content | Handling |
| --- | --- | --- |
| Argelaguet & Andujar, A survey of 3D object selection techniques for virtual environments | [DOI](https://doi.org/10.1016/j.cag.2012.12.003), Crossref, [author manuscript](https://www.cs.ucf.edu/courses/cap6121/spr2020/readings/Sanz2013.pdf) | Issue year 2013; manuscript reports online availability 20 December 2012. Both events noted. Sections 3, 3.2.2 and technique table support survey roles. |
| Weise, Zender & Lucke, A Comprehensive Classification of 3D Selection and Manipulation Techniques | [DOI](https://doi.org/10.1145/3340764.3340777), Crossref metadata and 53 reference entries | Full text unavailable; no technique-level content extraction attributed to this paper. Backward citation edges use reference metadata only. |
| Yeo et al., Entering the Next Dimension: A Review of 3D User Interfaces for Virtual Reality | [DOI](https://doi.org/10.3390/electronics13030600), Crossref, [publisher PDF](https://mdpi-res.com/d_attachment/electronics/electronics-13-00600/article_deploy/electronics-13-00600-v2.pdf?version=1706851874) | 2024; sections 4.1.1 and 4.2.1 support TULIP, HOMER, raycasting and WIM survey roles. |
| Yu, Dingler, Velloso & Goncalves, Object Selection and Manipulation in VR Headsets: Research Challenges, Solutions, and Success Measurements | [DOI](https://doi.org/10.1145/3706417), Crossref, [institutional PDF](https://pure.tudelft.nl/ws/portalfiles/portal/235391176/3706417.pdf) | Online 23 December 2024, issue April 2025. `year` uses online date; both dates retained. Section 7.3 summarizes Lu 2020's comparison. |

Only reliably available CC-licensed seed abstracts are stored when supplied by metadata. Other abstracts remain null. BibTeX is generated from verified metadata and explicitly labeled as generated, not claimed to be publisher-exported. No full paper PDFs are redistributed with the source.

## Backward pass

Crossref supplied 108, 53, 99 and 190 reference entries for the four seeds. These lists were screened for named techniques and early papers. The selected set was deliberately limited:

| Cited publication | DOI | Action / discovery source |
| --- | --- | --- |
| Poupyrev et al., The go-go interaction technique | 10.1145/237091.237102 | Enrich existing publication; Weise reference list |
| Bowman & Hodges, An evaluation of techniques for grabbing and manipulating remote objects in immersive virtual environments | 10.1145/253284.253301 | Enrich HOMER publication; Yeo reference list |
| Frees & Kessler, Precise and rapid interaction through scaled manipulation in immersive virtual environments | 10.1109/VR.2005.1492759 | New publication; Yu reference list; PRISM candidate supported indirectly by Argelaguet survey |
| Frees, Kessler & Kay, PRISM interaction for enhancing control in immersive virtual environments | 10.1145/1229855.1229857 | New publication; Weise reference list; references inspected for earlier work, but no modification role inferred from title alone |
| Stoakley, Conway & Pausch, Virtual reality on a WIM: interactive worlds in miniature | 10.1145/223904.223938 | New publication; Weise reference list; original paper inspected |
| Forsberg et al., Aperture based selection for immersive virtual environments | 10.1145/237091.237105 | Enrich existing publication; Yu reference list |
| Liang & Green, JDCAD: A highly interactive 3D modeling system | 10.1016/0097-8493(94)90062-0 | Enrich existing Cone Casting publication; Weise reference list |
| Lu et al., Bubble Ray: A Ray-Casting Technique for Selection of Small Objects in Virtual Reality | 10.1109/VR46266.2020.00021 | Enrich existing publication; Yu reference list; variant identities remain unresolved |
| Mapes & Moshell, A Two-Handed Interface for Object Manipulation in Virtual Environments | 10.1162/pres.1995.4.4.403 | New publication at depth 2 through PRISM 2007; metadata-only, no technique/lineage claim created |

PRISM 2005/2007 and JDCAD reference metadata were inspected as available. WIM's original paper includes prior-work discussion, but its precursor mentions were not enough to justify extra technique records. The second-level Mapes publication is retained as a research candidate; citation does not assert that PRISM derives from it.

## Forward pass

An OpenAlex `cites:W3151601593` query retrieved five later papers citing PRISM 2005. Yu's seed paper was already inspected and retained as a forward discovery with provenance; no duplicate publication was created. Four proposals remain deferred: Gaze-Supported 3D Object Manipulation in Virtual Reality (2021), Beyond Being Real (2022), Experimental Analysis of Freehand Multi-object Selection Techniques (2024), and HeadShift (2024). Their titles establish possible relevance, not variant/lineage evidence. No content-level claim was extracted from them.

## New techniques

| Technique | Earliest identified supporting publication | Primary / supported tasks | Verification | Discovery and caveat |
| --- | --- | --- | --- | --- |
| PRISM | Frees & Kessler 2005 | Manipulation / manipulation, selection | machine-verified | Yu reference list and Argelaguet section 3.2.2, refs 37–38. Introduction association is based on the survey's description and early citation, not inspected original full text. Human review needed. |
| Worlds in Miniature | Stoakley, Conway & Pausch 1995 | Manipulation / manipulation, selection, navigation | machine-verified | Weise references → original paper abstract, system description and interaction sections. Earliest identified publication, not exhaustive historical priority audit. |

PRISM's expanded name is an alias. WIM and World-in-Miniature are aliases of Worlds in Miniature. Unknown distance, DoF and unestablished evaluation claims remain unspecified. No implementation source links were created.

## Existing techniques enriched

| Technique | New associations | Metadata / relationships |
| --- | --- | --- |
| Go-Go | surveyed by Argelaguet and Yu | Original publication DOI/metadata enriched; evidenced compared-with Raycasting |
| Raycasting | surveyed by Argelaguet, Yeo and Yu | Reciprocal compared-with Go-Go, reflecting Yu's summary of Lu 2020 |
| Aperture Selection | surveyed by Argelaguet | DOI-based publication metadata enrichment |
| Cone Casting | surveyed by Argelaguet | JDCAD publication metadata enrichment |
| SQUAD | surveyed by Argelaguet | Evidence/provenance added; no invented origin attribution |
| HOMER | surveyed by Yeo | Expanded-name alias and selection as a supported task; original publication metadata enriched |
| TULIP Menu | surveyed by Yeo | Expanded-name alias “Three-Up, Labels In Palm” |
| Bubble Raycasting | surveyed by Yu | Publication metadata enriched; E/A variants explicitly queued for identity review |

Existing technique status remains migrated. Attaching new scoped evidence does not verify every legacy claim. Generic legacy edges remain unchanged; no historical lineage was inferred.

## Human review and access limitations

- All original 28 records retain their original provenance and incomplete taxonomy. All 30 techniques require human review before human-verified status.
- Six preserved technique-year/citation-year conflicts: Raycasting 1992/1995, Bubble Cursor 2005/2007, Gaze + Pinch 2020/2017, VoiceRay 2025/2026, Volumetric Hand Cursor 2019/2017, Gaze + Voice 2024/2026. None became introduction dates.
- Crossref lacks an issued year for PRISM 2005. Year 2005 is supported by Argelaguet's reference 37 and the proceedings identification; the discrepancy is explicit in publication notes.
- Argelaguet and Yu have different online and issue dates. Preserve these events rather than silently forcing an apparently conflicting year.
- Weise full text was not accessible. PRISM 2005 full-text retrieval timed out; PRISM 2007, Go-Go, HOMER, Aperture, JDCAD, Bubble Ray and Mapes were not inspected in full text. Their metadata can be used, but scientific extraction must await content review.
- Bubble Ray E/A identity is unresolved. “Naive Ray” in a particular comparison is not established as a universal alias of Raycasting. Neither was merged automatically.
- WIM's appearance in Yeo points to a different citation than the 1995 paper. Original attribution uses the inspected Stoakley paper rather than treating a survey mention as proof of priority.
- No paywall, authentication, certificate or publisher restriction was bypassed. Publisher errors prompted use of accessible publisher/institutional/author copies; inaccessible originals remain explicitly limited.

## Repeatability

The discovery script is configurable and separate from the knowledge base. It caps selected backward publications at 12, forward candidates at 5 per queried work and depth at 2 for this run; it performs no unbounded recursive crawl. Checked-in `metadata.json` and `curation.json` are reviewed machine-extraction inputs. `scripts/ingest-literature.ts` deterministically applies them to the immutable migration snapshot, rejects invalid references and duplicate identities, and writes an atomic output. Tests reproduce the shipped database exactly.
