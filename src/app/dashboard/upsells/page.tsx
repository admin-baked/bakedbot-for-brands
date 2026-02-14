// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { Metadata } from 'next';
import { UpsellsPageClient } from './page-client';

export const metadata: Metadata = {
    title: 'Smart Upsells | BakedBot',
    description: 'AI-powered product pairing and upsell analytics',
};

export default function UpsellsPage() {
    return <UpsellsPageClient />;
}
