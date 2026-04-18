import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: 'Check In',
    description: 'In-store loyalty check-in powered by BakedBot',
    manifest: '/tablet-manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Check-In',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#0f0f1a',
};

export default function LoyaltyTabletLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-[#0f0f1a] text-white overflow-y-auto overflow-x-hidden">
            {/* Explicit manifest link — guarantees Chrome sees tablet-manifest.json
                even if Next.js metadata merging falls back to root manifest.json */}
            <link rel="manifest" href="/tablet-manifest.json" />
            {children}
        </div>
    );
}
