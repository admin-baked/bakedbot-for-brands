import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Cannabis Terpene Guide | BakedBot',
    default: 'Cannabis Terpene Guide | BakedBot',
  },
  description:
    'Explore the 15 most common cannabis terpenes — their aromas, effects, medical uses, and which strains they dominate. Science-backed terpene profiles powered by BakedBot AI.',
  openGraph: {
    title: 'Cannabis Terpene Guide | BakedBot',
    description:
      'Explore the 15 most common cannabis terpenes — their aromas, effects, medical uses, and which strains they dominate.',
    type: 'website',
    siteName: 'BakedBot',
    url: 'https://bakedbot.ai/terpenes',
  },
  alternates: {
    canonical: 'https://bakedbot.ai/terpenes',
  },
};

export default function TerpenesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
