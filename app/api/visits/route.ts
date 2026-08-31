import { bindings, jsonResponse, apiError } from '@/lib/import-store';
import { requireAdmin } from '@/lib/auth';
import {
  recordVisit,
  publicVisits,
  validateVisitInput,
  visitDay,
} from '@/lib/analytics';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const db = bindings().DB;
    if (new URL(request.url).searchParams.get('admin') === '1') {
      requireAdmin(request, bindings());
      const now = new Date();
      const since = visitDay(new Date(now.getTime() - 29 * 86400000));
      const rows = await db
        .prepare('SELECT day,total FROM visit_daily WHERE day>=? ORDER BY day')
        .bind(since)
        .all();
      return jsonResponse({ ...(await publicVisits(db)), daily: rows.results });
    }
    return jsonResponse(await publicVisits(db));
  } catch (e) {
    return String(e).includes('AUTH:')
      ? apiError(e)
      : jsonResponse(
          {
            total: null,
            error: 'Visit statistics are temporarily unavailable.',
          },
          503,
        );
  }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new Error('AUTH: Same-origin visit recording required');
    if (!request.headers.get('content-type')?.includes('application/json'))
      return jsonResponse({ error: 'JSON required' }, 415);
    const text = await request.text();
    if (text.length > 200)
      return jsonResponse({ error: 'Visit payload too large' }, 413);
    const id = validateVisitInput(JSON.parse(text));
    return jsonResponse(await recordVisit(bindings().DB, id));
  } catch (e) {
    return apiError(e);
  }
}
