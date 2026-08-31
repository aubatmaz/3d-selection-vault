import type { Metadata } from 'next';
import { HowToGuide } from '@/components/user-guidance';
export const metadata: Metadata = {
  title: 'How to Use 3D Interaction Vault',
  description:
    'Find techniques, compare publications, explore the graph and understand verification.',
  openGraph: {
    title: 'How to Use 3D Interaction Vault',
    description: 'A practical guide to browsing, evidence, graphs and exports.',
    images: [],
  },
  twitter: {
    title: 'How to Use 3D Interaction Vault',
    description: 'A practical guide to browsing, evidence, graphs and exports.',
    images: [],
  },
};
export default function Page() {
  return <HowToGuide />;
}
