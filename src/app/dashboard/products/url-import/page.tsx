// src/app/dashboard/products/url-import/page.tsx
/**
 * URL Import Page
 * 
 * Allows users to import their product menu from a URL.
 * This is the primary method for the "Add your Products" onboarding task.
 */

import { UrlImportClient } from './url-import-client';

// Prevent prerendering to avoid Firebase initialization during build
export const dynamic = 'force-dynamic';

export default function UrlImportPage() {
    return <UrlImportClient />;
}
