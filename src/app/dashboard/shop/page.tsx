// src/app/dashboard/shop/page.tsx
/**
 * Customer shop page accessible from the dashboard sidebar.
 * Redirects to the demo-shop experience which provides
 * the full shopping functionality.
 */
import { redirect } from 'next/navigation';

// Prevent prerendering to avoid Firebase initialization during build
export const dynamic = 'force-dynamic';

export default function DashboardShopPage() {
    // Redirect customers to the demo-shop experience
    redirect('/demo-shop');
}
