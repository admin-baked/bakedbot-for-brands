import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Social Equity Program | BakedBot AI — 25% Off Forever',
    description:
        'Licensed social equity dispensaries get 25% off any BakedBot plan — forever. Same tools, same support, built for equitable access.',
    alternates: { canonical: 'https://bakedbot.ai/social-equity' },
};

export default function SocialEquityLayout({ children }: { children: React.ReactNode }) {
    return children;
}
