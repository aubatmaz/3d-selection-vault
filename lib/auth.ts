/** Only trust these headers behind Sites dispatch, which supplies authenticated identity. */
export interface AdminConfig {
  ADMIN_USER_IDS?: string;
  ADMIN_EMAILS?: string;
}
export function accessRole(request: Request, config: AdminConfig) {
  const id = request.headers.get('oai-authenticated-user-id') || '';
  const email = request.headers.get('oai-authenticated-user-email') || '';
  const ids = (config.ADMIN_USER_IDS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const emails = (config.ADMIN_EMAILS || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const admin = ids.length
    ? !!id && ids.includes(id)
    : !!email && emails.includes(email.toLowerCase());
  return { id, email, role: admin ? ('admin' as const) : ('viewer' as const) };
}
export function requireAdmin(request: Request, config: AdminConfig) {
  const user = accessRole(request, config);
  if (user.role !== 'admin')
    throw new Error('AUTH: Administrator access required.');
  if (
    request.method !== 'GET' &&
    request.headers.get('origin') !== new URL(request.url).origin
  )
    throw new Error('AUTH: Cross-origin writes are not allowed.');
  return user;
}
