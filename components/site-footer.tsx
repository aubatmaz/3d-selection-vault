import Link from 'next/link';
import { VisitCounter } from './visit-counter';
export function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div>
        <strong>3D Interaction Vault</strong>
        <p>
          An open catalogue of interaction techniques for 3D user interfaces
        </p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/how-to-use">How to Use</Link>
        <Link href="/about">About</Link>
        <Link href="/license">License</Link>
      </nav>
      <VisitCounter />
      <p>
        © 2026 3D Interaction Vault · Software licensed under the{' '}
        <Link href="/license">MIT License</Link>.
      </p>
      <small>
        External scholarly content retains its respective copyright and
        licensing terms.
      </small>
    </footer>
  );
}
