import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { CampaignDetail } from '../components/campaign-detail';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: Props) {
    let user;
    try {
        user = await requireUser(['dispensary', 'brand', 'super_user']);
    } catch {
        redirect('/dispensary-login');
    }

    const { id } = await params;

    return (
        <div className="flex flex-col gap-6 p-6">
            <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
                <CampaignDetail campaignId={id} userId={user.uid} />
            </Suspense>
        </div>
    );
}
