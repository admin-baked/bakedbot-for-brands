import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Cannabis Strains | BakedBot',
    default: 'Cannabis Strain Encyclopedia | BakedBot',
  },
  description:
    'Browse 8,000+ cannabis strains with THC/CBD percentages, terpene profiles, effects, and ratings. The most comprehensive strain database for consumers and budtenders.',
  openGraph: {
    title: 'Cannabis Strain Encyclopedia | BakedBot',
    description:
      'Browse 8,000+ cannabis strains with THC/CBD percentages, terpene profiles, effects, and ratings.',
    type: 'website',
    siteName: 'BakedBot',
  },
};

export default function StrainsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
