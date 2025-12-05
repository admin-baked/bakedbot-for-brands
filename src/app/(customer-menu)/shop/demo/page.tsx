// src/app/(customer-menu)/shop/demo/page.tsx
/**
 * Demo shopping page route wrapper
 * Imports the client component and sets dynamic rendering to avoid Firebase prerender issues
 */

import DemoShopClient from './demo-shop-client';

// Prevent prerendering to avoid Firebase initialization during build
export const dynamic = 'force-dynamic';

export default function DemoShopPage() {
    return <DemoShopClient />;
}
