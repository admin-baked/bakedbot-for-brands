
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
