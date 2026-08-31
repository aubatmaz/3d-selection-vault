import { SiteFooter } from '@/components/site-footer';
import type { Metadata } from 'next';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
export const metadata: Metadata = {
  metadataBase: new URL(
    'https://three-d-selection-vault.aubatmaz.chatgpt.site',
  ),
  icons: { icon: '/favicon.svg' },
  title: '3D Interaction Vault — Interaction catalogue',
  description:
    'An open catalogue of interaction techniques for 3D user interfaces',
  openGraph: {
    title: '3D Interaction Vault',
    description:
      'An open catalogue of interaction techniques for 3D user interfaces',
    images: [
      {
        url: 'https://three-d-selection-vault.aubatmaz.chatgpt.site/og.png',
        alt: '3D Interaction Vault — An open catalogue of interaction techniques for 3D user interfaces',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '3D Interaction Vault',
    description:
      'An open catalogue of interaction techniques for 3D user interfaces',
    images: [
      {
        url: 'https://three-d-selection-vault.aubatmaz.chatgpt.site/og.png',
        alt: '3D Interaction Vault — An open catalogue of interaction techniques for 3D user interfaces',
      },
    ],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <TooltipProvider>
          {children}
          <SiteFooter />
        </TooltipProvider>
        <output
          id="export-status"
          aria-live="polite"
          className="export-status"
        />
      </body>
    </html>
  );
}
