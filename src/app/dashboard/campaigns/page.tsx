import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { CampaignsDashboard } from './components/campaigns-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
    let user;
    try {
        user = await requireUser(['dispensary', 'brand', 'super_user']);
    } catch {
        redirect('/dispensary-login');
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
                <p className="text-muted-foreground">
                    Create and manage personalized email and SMS campaigns powered by your CRM data.
                </p>
            </div>

            <Suspense fallback={<CampaignsSkeleton />}>
                <CampaignsDashboard userId={user.uid} />
            </Suspense>
        </div>
    );
}

function CampaignsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
            </div>
            <Skeleton className="h-10 w-64 rounded-md" />
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-lg" />
                ))}
            </div>
        </div>
    );
}
