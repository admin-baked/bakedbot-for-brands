// src/app/shop/demo/page.tsx
/**
 * Demo shopping page route wrapper
 * Located outside (customer-menu) to avoid double header/footer
 */

import DemoShopClient from './demo-shop-client';

// Prevent prerendering to avoid Firebase initialization during build
export const dynamic = 'force-dynamic';

export default function DemoShopPage() {
    return <DemoShopClient />;
}
