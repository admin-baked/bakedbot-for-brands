// src/app/smokey-pay/layout.tsx
// Public marketing layout — no dashboard nav

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'SmokeyPay — Cannabis Checkout Built for Your Brand',
    description:
        'SmokeyPay is the only checkout built for cannabis menus and claimed brand pages. ' +
        'State-compliant, age-verified, and powered by AI. Accept orders today.',
    openGraph: {
        title: 'SmokeyPay — Cannabis Checkout Built for Your Brand',
        description: 'The only checkout built for cannabis menus and claimed brand pages.',
        url: 'https://bakedbot.ai/smokey-pay',
        siteName: 'BakedBot AI',
        type: 'website',
    },
};

export default function SmokeyPayLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
