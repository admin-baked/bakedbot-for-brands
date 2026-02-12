import { Metadata } from 'next';
import { UpsellsPageClient } from './page-client';

export const metadata: Metadata = {
    title: 'Smart Upsells | BakedBot',
    description: 'AI-powered product pairing and upsell analytics',
};

export default function UpsellsPage() {
    return <UpsellsPageClient />;
}
