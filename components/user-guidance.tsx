'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { helpTopics } from '@/lib/help';
export function ContextHelp({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="context-help">
      <summary aria-label={`Help: ${title}`}>? {title}</summary>
      <div>{children}</div>
    </details>
  );
}
export function FirstVisitGuide() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = () => {
      try {
        setVisible(localStorage.getItem('vault-help-dismissed') !== 'yes');
      } catch {
        setVisible(false);
      }
    };
    queueMicrotask(show);
  }, []);
  return visible ? (
    <aside className="first-visit" aria-label="Optional orientation">
      <div>
        <strong>New to the Vault?</strong>
        <p>
          Find a technique, browse surveys, compare methods or explore the
          graph. Verification labels explain what has been reviewed.
        </p>
      </div>
      <Link href="/how-to-use">How to use</Link>
      <Button
        variant="ghost"
        onClick={() => {
          setVisible(false);
          try {
            localStorage.setItem('vault-help-dismissed', 'yes');
          } catch {
            /* Dismissal is optional, device-local state. */
          }
        }}
      >
        Dismiss
      </Button>
    </aside>
  ) : null;
}
export function HowToGuide() {
  const [query, setQuery] = useState('');
  const topics = helpTopics.filter((t) =>
    `${t.title} ${t.text}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <header className="site-header help-header">
        <Link href="/" className="brand">
          3D Interaction Vault
        </Link>
        <Link href="/">Back to catalogue</Link>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="extension-workspace help-page"
      >
        <nav aria-label="Breadcrumb">
          <Link href="/">Home</Link> › How to use
        </nav>
        <h1>How to Use 3D Interaction Vault</h1>
        <p>
          Find and compare 3D interaction techniques, understand their research
          evidence, and explore connected publications. You do not need an admin
          account to browse or export records.
        </p>
        <label htmlFor="help-search">Find help</label>
        <Input
          id="help-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help: graph, verification, BibTeX…"
        />
        <nav aria-label="Help topics" className="help-topics">
          {topics.map((t) => (
            <a key={t.id} href={`#${t.id}`}>
              {t.title}
            </a>
          ))}
        </nav>
        {!topics.length && (
          <section>
            <h2>No help topics match</h2>
            <Button onClick={() => setQuery('')}>Clear help search</Button>
          </section>
        )}
        {topics.map((t) => (
          <section key={t.id} id={t.id}>
            <h2>{t.title}</h2>
            <p>{t.text}</p>
            {'example' in t && <p className="help-example">{t.example}</p>}
            <a href="#main-content">Back to help overview ↑</a>
          </section>
        ))}
      </main>
    </>
  );
}
