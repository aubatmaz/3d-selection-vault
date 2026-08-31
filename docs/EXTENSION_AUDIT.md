# Extension audit — 30 August 2026

Audited the existing repository before modifications. Original GitHub repository remains untouched.

| Existing area | Finding and migration risk | Resolution |
|---|---|---|
| Authorization | Curation API accepted any authenticated visitor; hiding buttons would not fix this | Shared server guard, explicit owner allowlist, viewer fallback, same-origin writes |
| Graph | SVG publication-only graph, no actual Z coordinates | Three.js WebGL explorer; existing filters/compare retained as advanced fallback |
| Publication model | No controlled genre or structured BibTeX metadata | Optional additive schema-v3 fields, preserving all existing snapshots and IDs |
| Persistence | One revision-controlled D1 catalogue row | Retained for curated data; separate indexed candidate/job/audit/cache tables plus R2 source files |
| Imports | Browser-session JSON additions, not permanent review queue | Removed session import controls; server previews, durable review queue, explicit admin acceptance |
| Scientific state | Machine vs human distinction existed, with scope/evidence checks | Preserved; imports forcibly machine-curated even if source claims human verification |
| Publishers | No reusable public-reference connectors | Common provider interface, restricted HTTPS destinations, caching and shared rate limits |
| Baseline data | 30 techniques, 34 papers, 43 associations, 9 citation edges, 315 similarities | No new literature ingestion. Three existing papers receive conservative genre classifications from retained metadata |

Affected modules: `lib/model.ts`, `lib/schema.ts`, `lib/curation*`, `app/api/curation/route.ts`, main page/details; new bibliography/PDF/provider/import/3D modules and UI; additive Drizzle migrations. Existing migration fixtures and legacy v2 implementation remain intact.

The D1 checkpoint is a deliberate compatibility boundary, not an unlimited publication store. Pending imports can contain thousands of rows independently. Publishing thousands of rich records requires a future normalized catalogue migration; a size guard refuses oversized acceptance without deleting candidates. Existing explicit publication classifications always win over release defaults. No catalogue reset or destructive database migration is used.
