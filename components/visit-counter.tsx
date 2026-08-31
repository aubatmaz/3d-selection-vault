'use client';
import { useEffect, useState } from 'react';
import { createVisitReporter, sessionVisit } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
const reportOnce = createVisitReporter();
export function VisitCounter() {
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    void reportOnce(async () => {
      let payload;
      try {
        payload = sessionVisit(sessionStorage);
      } catch {
        return null;
      }
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: payload.sessionId }),
      });
      if (!response.ok) return null;
      return response.json();
    }).then((value) => {
      if (
        active &&
        value &&
        typeof (value as { total?: unknown }).total === 'number'
      )
        setTotal((value as { total: number }).total);
      else if (active)
        void fetch('/api/visits')
          .then((r) => (r.ok ? r.json() : null))
          .then((v) => {
            if (
              active &&
              v &&
              typeof (v as { total: unknown }).total === 'number'
            )
              setTotal((v as { total: number }).total);
          })
          .catch(() => {});
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <span
      className="visit-counter"
      title="One anonymous browser-tab session per UTC day; not unique people. No IP addresses are stored."
    >
      {total === null
        ? 'Visit count unavailable'
        : `${total.toLocaleString()} site visits`}
    </span>
  );
}
export function AdminAnalytics() {
  const [data, setData] = useState<{
    total: number;
    daily: { day: string; total: number }[];
  } | null>(null);
  const [message, setMessage] = useState('');
  const load = async () => {
    setMessage('Loading visit statistics…');
    try {
      const r = await fetch('/api/visits?admin=1');
      if (!r.ok) throw new Error('Statistics unavailable. Try again later.');
      setData((await r.json()) as typeof data);
      setMessage('Statistics loaded.');
    } catch (e) {
      setMessage(String(e));
    }
  };
  return (
    <section className="extension-card">
      <h2>Visit analytics</h2>
      <p>
        Anonymous sessions, not people. Counts begin with this release. No IPs,
        identities, search terms or document views are stored.
      </p>
      <Button onClick={() => void load()}>Load visit statistics</Button>
      <output aria-live="polite">{message}</output>
      {data && (
        <>
          <p>
            Total: {data.total} · Today (UTC):{' '}
            {data.daily.find(
              (x) => x.day === new Date().toISOString().slice(0, 10),
            )?.total || 0}{' '}
            · Last 30 UTC days: {data.daily.reduce((n, x) => n + x.total, 0)}
          </p>
          <details>
            <summary>Daily totals</summary>
            <table>
              <thead>
                <tr>
                  <th>UTC day</th>
                  <th>Visits</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((x) => (
                  <tr key={x.day}>
                    <td>{x.day}</td>
                    <td>{x.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
