import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'The High Road: Beyond Borders – Thailand | Media & Market Tour January 2026',
    description: 'Join the first-of-its-kind media and market tour connecting Thai cannabis operators with U.S. ancillary companies. January 2026.',
    keywords: ['cannabis', 'Thailand', 'media tour', 'cannabis industry', 'international cannabis', 'market tour'],
    openGraph: {
        title: 'The High Road: Beyond Borders – Thailand',
        description: 'Media & Market Tour connecting Thai cannabis operators with U.S. ancillary companies. January 2026.',
        type: 'website',
        url: 'https://bakedbot.ai/highroad-thailand',
    },
};

export default function HighRoadThailandLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
