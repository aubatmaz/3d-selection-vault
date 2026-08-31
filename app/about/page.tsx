import Link from 'next/link';
export const metadata = { title: 'About — 3D Interaction Vault' };
export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1} className="help-page legal-page">
      <Link href="/">← Back to Vault</Link>
      <h1>About 3D Interaction Vault</h1>
      <p>
        A research catalogue of selection, manipulation, navigation and
        system-control techniques for 3D interfaces.
      </p>
      <p>
        The Vault connects techniques with publications and inspectable
        evidence. Survey coverage is not proof of introduction; citation and
        similarity are not historical lineage. Machine-curated records require
        administrator scientific review.
      </p>
      <p>
        <Link href="/how-to-use">Learn how to explore the Vault</Link> ·{' '}
        <Link href="/license">Software and research-content licensing</Link>
      </p>
    </main>
  );
}
