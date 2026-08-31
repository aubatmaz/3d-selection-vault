import Link from 'next/link';
import { softwareLicense } from '@/lib/software-license';
export const metadata = { title: 'License — 3D Interaction Vault' };
export default function LicensePage() {
  return (
    <main id="main-content" tabIndex={-1} className="help-page legal-page">
      <Link href="/">← Back to Vault</Link>
      <h1>License</h1>
      <h2>Vault software</h2>
      <p>The Vault software is licensed under the MIT License below.</p>
      <h2>Research metadata</h2>
      <p>
        Bibliographic metadata is stored for research discovery. The software
        license does not automatically relicense publication metadata, figures
        or linked research materials; their respective terms still apply.
      </p>
      <h2>External PDFs and articles</h2>
      <p>
        The Vault does not claim ownership of external papers. Consult the
        publisher or rights holder for permission to reuse their content.
      </p>
      <h2>Implementations</h2>
      <p>
        Individual implementations may have their own license, shown in their
        record when available. An unknown license is not permission to reuse.
      </p>
      <h2>Full software license</h2>
      <pre className="license-text">{softwareLicense}</pre>
    </main>
  );
}
