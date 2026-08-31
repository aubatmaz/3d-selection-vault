import { parseBibtex } from '@/lib/bibtex-parser';
import {
  techniqueCandidate,
  approveTechnique,
  type TechniqueCandidate,
} from '@/lib/technique-import';
import { boundedText } from '@/lib/reference-providers';
import { proposeCitations } from '@/lib/citation-proposals';
import type { ReferenceCandidate } from '@/lib/pdf-extraction';
import { validateCatalogue } from '@/lib/catalogue';
import { bindings, jsonResponse, apiError } from '@/lib/import-store';
import { requireAdmin } from '@/lib/auth';
import { readState } from '@/lib/curation-store';
import {
  previewPublications,
  newPublication,
  type ImportPreview,
} from '@/lib/bibliography';
import { extractPdfText } from '@/lib/pdf-extraction';
import { approvePublication } from '@/lib/import-review';
import type { Publication, Technique } from '@/lib/model';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    requireAdmin(request, bindings());
    const url = new URL(request.url);
    const file = url.searchParams.get('file');
    if (file) {
      if (!/^job-[a-f0-9-]+$/.test(file)) throw new Error('Invalid file ID');
      const object = await bindings().FILES.get(`${file}/source.pdf`);
      if (!object) throw new Error('PDF not found');
      return new Response(object.body, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=source.pdf',
          'Cache-Control': 'no-store',
        },
      });
    }
    if (url.searchParams.get('audit') === '1') {
      const rows = await bindings()
        .DB.prepare(
          'SELECT payload FROM import_audit ORDER BY rowid DESC LIMIT 100',
        )
        .all();
      return jsonResponse(
        rows.results.map((row) => JSON.parse(String(row.payload))),
      );
    }
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const db = bindings().DB;
    const rows = await db
      .prepare(
        "SELECT id,job_id,payload,status,created_at FROM import_candidates WHERE status IN ('pending','need-more-evidence') ORDER BY created_at,id LIMIT 50 OFFSET ?",
      )
      .bind(offset)
      .all();
    const count = await db
      .prepare(
        "SELECT count(*) AS total FROM import_candidates WHERE status IN ('pending','need-more-evidence')",
      )
      .first();
    return jsonResponse({ rows: rows.results, total: count?.total || 0 });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = requireAdmin(request, bindings());
    const { DB: db, FILES: files } = bindings();
    if (!files) throw new Error('Import file storage unavailable');
    const raw = await boundedText(new Response(request.body), 15_000_000);
    if (raw.length > 15_000_000)
      return jsonResponse({ error: 'Maximum request size is 15 MB' }, 413);
    const body = JSON.parse(raw);
    if (body.action === 'preview') {
      const { catalogue } = await readState();
      const jobId = `job-${crypto.randomUUID()}`;
      let preview: ImportPreview;
      let extraction: unknown = null;
      if (body.format === 'bib')
        preview = parseBibtex(
          String(body.text),
          catalogue.publications,
          body.filename || null,
        );
      else if (body.format === 'pdf') {
        const bytes = Uint8Array.from(atob(body.pdf || ''), (c) =>
          c.charCodeAt(0),
        );
        if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-')
          throw new Error('Not a PDF file');
        if (bytes.length > 8_000_000)
          throw new Error('Maximum PDF size is 8 MB');
        await files.put(`${jobId}/source.pdf`, bytes, {
          httpMetadata: { contentType: 'application/pdf' },
        });
        const extracted = extractPdfText(
          String(body.text || ''),
          catalogue.publications,
          body.filename || 'paper.pdf',
          catalogue.techniques,
        );
        if (
          typeof body.pdfInfo?.Title === 'string' &&
          body.pdfInfo.Title.trim()
        )
          extracted.publication.title = body.pdfInfo.Title.trim();
        if (
          typeof body.pdfInfo?.Author === 'string' &&
          body.pdfInfo.Author.trim()
        )
          extracted.publication.authors = body.pdfInfo.Author.split(
            /;|\s+and\s+/,
          )
            .map((x: string) => x.trim())
            .filter(Boolean);
        extraction = {
          ...extracted,
          pdfDocumentMetadata: body.pdfInfo || null,
        };
        if (extracted.requiresOcr)
          throw new Error(
            'No usable embedded text. OCR was not run; supply text or an accessible PDF.',
          );
        preview = previewPublications(
          [
            extracted.publication,
            ...extracted.references
              .filter((r) => !r.matchedPublicationId && r.doi)
              .map((r) => {
                const p = newPublication(`reference-${crypto.randomUUID()}`, {
                  source: 'pdf-upload',
                  filename: body.filename || 'paper.pdf',
                  originalKey: null,
                  timestamp: new Date().toISOString(),
                  url: null,
                });
                p.doi = r.doi;
                p.year = r.year;
                p.legacyCitations = [r.raw];
                return p;
              }),
          ],
          catalogue.publications,
        );
      } else if (body.format === 'json' || body.format === 'doi') {
        const value =
          typeof body.text === 'string' ? JSON.parse(body.text) : body.text;
        const items = Array.isArray(value)
          ? value
          : value.publications || (value.techniques ? [] : [value]);
        if (items.length > 5000)
          throw new Error('Maximum 5,000 records per import');
        const timestamp = new Date().toISOString();
        const papers = items.map((input: Publication) => {
          const p = {
            ...newPublication(`import-${crypto.randomUUID()}`, {
              source: body.format === 'doi' ? 'DOI-lookup' : 'manual',
              filename: body.filename || null,
              originalKey: input.bibtexKey || null,
              timestamp,
              url: null,
            }),
            ...input,
          };
          p.id =
            input.id && !catalogue.publications.some((x) => x.id === input.id)
              ? input.id
              : `import-${crypto.randomUUID()}`;
          p.verificationStatus = 'machine-curated';
          p.verification = newPublication(p.id, {
            source: 'manual',
            filename: null,
            originalKey: null,
            timestamp,
            url: null,
          }).verification;
          p.importProvenance = [
            ...(input.importProvenance || []),
            {
              source: 'manual',
              filename: body.filename || null,
              originalKey: input.bibtexKey || null,
              timestamp,
              url: null,
            },
          ];
          return p;
        });
        preview = previewPublications(papers, catalogue.publications);
        const tc: TechniqueCandidate[] = [];
        for (const input of (value.techniques || []) as Technique[]) {
          try {
            tc.push(
              techniqueCandidate(
                input,
                catalogue,
                `${new URL(request.url).origin}/api/imports`,
              ),
            );
          } catch (e) {
            preview.errors.push({
              entry: preview.metrics.total + tc.length + 1,
              message: String(e),
            });
          }
        }
        preview.techniqueCandidates = tc;
        preview.metrics.total += (value.techniques || []).length;
        preview.metrics.parsed += tc.length;
        preview.metrics.candidates += tc.length;
        preview.metrics.errors = preview.errors.length;
        preview.metrics.potentialDuplicates += tc.filter(
          (c) => c.status === 'potential-duplicate',
        ).length;
      } else throw new Error('Unsupported preview format');
      if (preview.metrics.total > 5000)
        throw new Error('Maximum 5,000 entries per import');
      if (body.format !== 'pdf')
        await files.put(
          `${jobId}/source.txt`,
          typeof body.text === 'string' ? body.text : JSON.stringify(body.text),
          { httpMetadata: { contentType: 'text/plain' } },
        );
      await files.put(
        `${jobId}/preview.json`,
        JSON.stringify({
          preview,
          extraction,
          owner: user.id || user.email,
          filename: body.filename || null,
        }),
        { httpMetadata: { contentType: 'application/json' } },
      );
      return jsonResponse({ jobId, ...preview, extraction });
    }
    if (body.action === 'enqueue') {
      if (!/^job-[a-f0-9-]+$/.test(body.jobId))
        throw new Error('Invalid preview ID');
      const object = await files.get(`${body.jobId}/preview.json`);
      if (!object) throw new Error('Preview expired or missing');
      const stored = await object.json<{
        preview: ImportPreview;
        extraction?: {
          publication: Publication;
          references: ReferenceCandidate[];
        };
        owner: string;
        filename: string | null;
      }>();
      if (stored.owner !== (user.id || user.email))
        throw new Error('AUTH: Preview belongs to a different administrator');
      const start = Math.max(0, Number(body.offset) || 0);
      const candidates = [
        ...stored.preview.candidates.filter(
          (c) => c.status !== 'exact-duplicate',
        ),
        ...(stored.preview.techniqueCandidates || []),
      ];
      const slice = candidates.slice(start, start + 100);
      const now = new Date().toISOString();
      if (start === 0 && stored.extraction) {
        const sourceMatch = stored.preview.candidates.find(
          (c) => c.id === stored.extraction!.publication.id,
        );
        if (
          sourceMatch?.status === 'exact-duplicate' &&
          sourceMatch.matches.length === 1
        ) {
          const current = await readState();
          const next = validateCatalogue(
            proposeCitations(
              current.catalogue,
              sourceMatch.matches[0],
              stored.extraction.references,
              `${new URL(request.url).origin}/api/imports?file=${body.jobId}`,
              'PDF reference parsing',
              now,
            ),
          );
          if (
            next.publicationRelationships.length !==
            current.catalogue.publicationRelationships.length
          ) {
            const token = `audit-${crypto.randomUUID()}`;
            const changes = await db.batch([
              db
                .prepare(
                  'UPDATE vault_state SET catalogue=?,revision=revision+1,updated_by=? WHERE id=? AND revision=?',
                )
                .bind(JSON.stringify(next), token, 'main', current.revision),
              db
                .prepare(
                  'INSERT INTO import_audit(id,payload) SELECT ?,? WHERE EXISTS (SELECT 1 FROM vault_state WHERE updated_by=?)',
                )
                .bind(
                  token,
                  JSON.stringify({
                    adminId: user.id || user.email,
                    timestamp: now,
                    action: 'queue-pdf-citations',
                    entityId: sourceMatch.matches[0],
                    previousValue:
                      current.catalogue.publicationRelationships.length,
                    newValue: next.publicationRelationships.length,
                    notes: 'Machine-curated PDF reference proposals only',
                  }),
                  token,
                ),
            ]);
            if (!changes[0].meta.changes)
              throw new Error('CONFLICT: Reload and retry');
          }
        }
      }
      await db.batch([
        db
          .prepare(
            'INSERT OR IGNORE INTO import_jobs(id,metadata,created_at) VALUES (?,?,?)',
          )
          .bind(
            body.jobId,
            JSON.stringify({
              metrics: stored.preview.metrics,
              filename: stored.filename,
              adminId: user.id || user.email,
            }),
            now,
          ),
        ...slice.map((c) =>
          db
            .prepare(
              'INSERT OR IGNORE INTO import_candidates(id,job_id,payload,status,created_at) VALUES (?,?,?,?,?)',
            )
            .bind(c.id, body.jobId, JSON.stringify(c), 'pending', now),
        ),
      ]);
      return jsonResponse({
        next: start + slice.length,
        total: candidates.length,
      });
    }
    if (body.action === 'review') {
      if (!['approve', 'reject', 'need-more-evidence'].includes(body.decision))
        throw new Error('Invalid review decision');
      if (typeof body.notes !== 'string' || !body.notes.trim())
        throw new Error('Review notes required');
      const row = await db
        .prepare(
          'SELECT payload,status,job_id FROM import_candidates WHERE id=?',
        )
        .bind(body.id)
        .first<{ payload: string; status: string; job_id: string }>();
      if (!row || !['pending', 'need-more-evidence'].includes(row.status))
        throw new Error('Candidate already reviewed or missing');
      const candidate = JSON.parse(row.payload);
      const current = await readState();
      const token = `audit-${crypto.randomUUID()}`;
      const timestamp = new Date().toISOString();
      let next =
        body.decision === 'approve'
          ? candidate.technique
            ? approveTechnique(
                current.catalogue,
                body.technique || candidate.technique,
                body.notes,
                `${new URL(request.url).origin}/api/imports`,
              )
            : approvePublication(
                current.catalogue,
                body.publication || candidate.publication,
                body.notes,
                `${new URL(request.url).origin}/api/imports`,
              )
          : current.catalogue;
      if (body.decision === 'approve' && !candidate.technique) {
        const stored = await files.get(`${row.job_id}/preview.json`);
        const metadata = stored
          ? await stored.json<{
              extraction?: {
                references: ReferenceCandidate[];
                publication: Publication;
              };
            }>()
          : null;
        if (
          metadata?.extraction?.references &&
          metadata.extraction.publication.id === candidate.publication.id
        )
          next = validateCatalogue(
            proposeCitations(
              next,
              next.publications.at(-1)!.id,
              metadata.extraction.references,
              `${new URL(request.url).origin}/api/imports?file=${row.job_id}`,
              'PDF reference parsing',
              timestamp,
            ),
          );
      }
      if (JSON.stringify(next).length > 1_800_000)
        throw new Error(
          'Catalogue checkpoint capacity reached; normalize published records before adding more. Queue and source files remain safe.',
        );
      const audit = {
        id: token,
        adminId: user.id || user.email,
        timestamp,
        action: body.decision,
        entityType: 'candidate',
        entityId: body.id,
        previousValue: candidate,
        newValue:
          body.decision === 'approve'
            ? candidate.technique
              ? next.techniques.at(-1)
              : next.publications.at(-1)
            : null,
        notes: body.notes,
        evidence: [],
      };
      const status =
        body.decision === 'approve'
          ? 'approved'
          : body.decision === 'reject'
            ? 'rejected'
            : 'need-more-evidence';
      const result = await db.batch([
        db
          .prepare(
            'UPDATE vault_state SET catalogue=?,revision=revision+1,updated_by=? WHERE id=? AND revision=? AND EXISTS (SELECT 1 FROM import_candidates WHERE id=? AND status=?)',
          )
          .bind(
            JSON.stringify(next),
            token,
            'main',
            current.revision,
            body.id,
            row.status,
          ),
        db
          .prepare(
            'UPDATE import_candidates SET status=? WHERE id=? AND EXISTS (SELECT 1 FROM vault_state WHERE updated_by=?)',
          )
          .bind(status, body.id, token),
        db
          .prepare(
            'INSERT INTO import_audit(id,payload) SELECT ?,? WHERE EXISTS (SELECT 1 FROM vault_state WHERE updated_by=?)',
          )
          .bind(token, JSON.stringify(audit), token),
      ]);
      if (result[0].meta.changes !== 1)
        throw new Error(
          'CONFLICT: another admin changed the catalogue; reload and retry',
        );
      return jsonResponse({ catalogue: next, revision: current.revision + 1 });
    }
    throw new Error('Unknown import action');
  } catch (e) {
    return apiError(e);
  }
}
