import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: 'Check In',
    description: 'In-store check-in powered by BakedBot',
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
        <div className="fixed inset-0 bg-[#0f0f1a] text-white overflow-hidden">
            {children}
        </div>
    );
}
