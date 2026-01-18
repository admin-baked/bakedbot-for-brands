// src/app/dashboard/brand-page/page.tsx
/**
 * Brand Page Dashboard
 * 
 * Allows brands to configure their slug/URL and launch their headless menu.
 * This is the destination for the "Launch your Headless Menu" onboarding task.
 */

import { BrandPageClient } from './brand-page-client';

// Prevent prerendering to avoid Firebase initialization during build
export const dynamic = 'force-dynamic';

export default function BrandPageDashboard() {
    return <BrandPageClient />;
}
