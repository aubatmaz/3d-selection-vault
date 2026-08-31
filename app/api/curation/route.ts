import { env } from 'cloudflare:workers';
import { accessRole, requireAdmin, type AdminConfig } from '@/lib/auth';
import { readState, saveDecision } from '@/lib/curation-store';
import { decisionShape, validateShape } from '@/lib/schema';
import type { CurationDecision } from '@/lib/model';
export const dynamic = 'force-dynamic';
const response = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: Request) {
  try {
    const user = accessRole(request, env as AdminConfig);
    return response({
      ...(await readState()),
      role: user.role,
      reviewer: user.role === 'admin' ? user.email || user.id : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Curation unavailable';
    return response(
      { error: message },
      message.startsWith('AUTH:') ? 401 : 503,
    );
  }
}
export async function POST(request: Request) {
  try {
    const user = requireAdmin(request, env as AdminConfig);
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new Error('AUTH: Cross-origin writes are not allowed.');
    if (!request.headers.get('content-type')?.includes('application/json'))
      return response({ error: 'JSON required' }, 415);
    const text = await request.text();
    if (text.length > 200000)
      return response({ error: 'Review payload too large' }, 413);
    const body = JSON.parse(text) as {
      revision: number;
      decision: CurationDecision;
    };
    if (!Number.isInteger(body.revision) || body.revision < 0)
      throw new Error('Invalid revision');
    const decision = {
      ...body.decision,
      reviewer: user.email || user.id,
      reviewerId: user.id || user.email,
      date: new Date().toISOString().slice(0, 10),
      adminId: user.id || user.email,
      timestamp: new Date().toISOString(),
    };
    validateShape(decision, decisionShape);
    return response(await saveDecision(body.revision, decision));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Save failed';
    return response(
      { error: message },
      message.startsWith('AUTH:')
        ? 403
        : message.startsWith('CONFLICT:')
          ? 409
          : 400,
    );
  }
}
