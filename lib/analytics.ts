/** No IP, identity, user-agent or referrer is read or stored by this module. */
export interface VisitStatement {
  bind(...args: (string | number)[]): VisitStatement;
  first<T>(): Promise<T | null>;
}
export interface VisitDatabase {
  prepare(sql: string): VisitStatement;
  batch(statements: VisitStatement[]): Promise<unknown>;
}
export function visitDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
export function validateVisitInput(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected an anonymous session identifier');
  const keys = Object.keys(value);
  const sessionId = (value as { sessionId?: unknown }).sessionId;
  if (
    keys.length !== 1 ||
    keys[0] !== 'sessionId' ||
    typeof sessionId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      sessionId,
    )
  )
    throw new Error(
      'Only a valid anonymous session identifier is accepted; totals cannot be supplied.',
    );
  return sessionId.toLowerCase();
}
export async function visitKey(sessionId: string, day: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${day}:${sessionId}`),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function recordVisit(
  db: VisitDatabase,
  sessionId: string,
  date = new Date(),
) {
  const day = visitDay(date);
  const key = await visitKey(sessionId, day);
  // D1 batch is transactional. changes() refers to the immediately preceding statement.
  await db.batch([
    db
      .prepare('INSERT OR IGNORE INTO visit_sessions(id,day) VALUES (?,?)')
      .bind(key, day),
    db
      .prepare(
        'INSERT INTO visit_totals(id,total) SELECT ?,1 WHERE changes()=1 ON CONFLICT(id) DO UPDATE SET total=total+1',
      )
      .bind('site'),
    db
      .prepare(
        'INSERT INTO visit_daily(day,total) SELECT ?,1 WHERE changes()=1 ON CONFLICT(day) DO UPDATE SET total=total+1',
      )
      .bind(day),
    db
      .prepare('DELETE FROM visit_sessions WHERE day < ?')
      .bind(visitDay(new Date(date.getTime() - 86400000))),
  ]);
  return publicVisits(db);
}
export async function publicVisits(db: VisitDatabase) {
  const row = await db
    .prepare('SELECT total FROM visit_totals WHERE id=?')
    .bind('site')
    .first<{ total: number }>();
  return {
    total: row?.total || 0,
    definition:
      'One anonymous browser-tab session per UTC day. Not a count of people.',
  };
}
export interface SessionStorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
export function sessionVisit(
  storage: SessionStorageLike,
  day = visitDay(),
  uuid = () => crypto.randomUUID(),
) {
  const key = 'vault-visit-session';
  let id = storage.getItem(key);
  if (!id) {
    id = uuid();
    storage.setItem(key, id);
  }
  return { sessionId: id, day };
}
export function createVisitReporter() {
  let pending: Promise<unknown> | null = null;
  return (request: () => Promise<unknown>) =>
    (pending ??= request().catch(() => null));
}
