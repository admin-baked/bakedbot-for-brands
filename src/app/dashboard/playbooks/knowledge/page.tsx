
// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { requireUser } from '@/server/auth/auth';
import { BrandKnowledgeBase } from '../components/brand-knowledge-base';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Knowledge Base | BakedBot',
    description: 'Train your AI agents with your documents.',
};

export default async function KnowledgePage() {
    const user = await requireUser();

    // Ensure only brands access this (or fallback for demo)
    const brandId = user.brandId || user.id;

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            <BrandKnowledgeBase brandId={brandId} />
        </div>
    );
}
