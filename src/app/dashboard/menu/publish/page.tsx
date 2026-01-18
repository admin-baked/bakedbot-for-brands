// src/app/dashboard/menu/publish/page.tsx
/**
 * Dispensary Menu Publish Dashboard
 * 
 * Allows dispensaries to configure and publish their headless menu page.
 * This is the destination for the "Publish headless menu pages" onboarding task.
 */

import { MenuPublishClient } from './menu-publish-client';

// Prevent prerendering to avoid Firebase initialization during build
export const dynamic = 'force-dynamic';

export default function MenuPublishPage() {
    return <MenuPublishClient />;
}
