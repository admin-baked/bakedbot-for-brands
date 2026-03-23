// src/app/demo-shop/page.tsx
/**
 * Demo shopping page route wrapper
 * Located outside (customer-menu) to avoid double header/footer
 */

import type { Metadata } from 'next';
import DemoShopClient from './demo-shop-client';

export const metadata: Metadata = {
    title: 'BakedBot AI Live Demo | Interactive Cannabis Commerce',
    description: 'Experience the future of cannabis commerce. Interact with Smokey AI, browse our headless menu, and see the BakedBot OS in action.',
};

// Prevent prerendering to avoid Firebase initialization during build
export const dynamic = 'force-dynamic';

export default function DemoShopPage() {
    return <DemoShopClient />;
}
