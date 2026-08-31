import { env } from 'cloudflare:workers';
export const bindings = () =>
  env as unknown as {
    DB: D1Database;
    FILES: R2Bucket;
    ADMIN_EMAILS?: string;
    ADMIN_USER_IDS?: string;
  };
export const jsonResponse = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export const apiError = (e: unknown) =>
  jsonResponse(
    { error: String(e) },
    String(e).includes('AUTH:')
      ? 403
      : String(e).includes('CONFLICT:')
        ? 409
        : 400,
  );
