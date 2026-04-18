import { requireUser } from '@/server/auth/auth';
import { getActorOrgId } from '@/server/auth/org-context';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { CampaignsDashboard } from './components/campaigns-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentOwnerBadge } from '@/components/dashboard/agent-owner-badge';
import type { DecodedIdToken } from 'firebase-admin/auth';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
    let user: DecodedIdToken;
    try {
        user = await requireUser([
            'dispensary',
            'dispensary_admin',
            'dispensary_staff',
            'brand',
            'brand_admin',
            'brand_member',
            'super_user',
        ]);
    } catch (err) {
        // Re-throw Next.js redirect errors so /login redirects from requireUser still work
        if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err;
        // Role/approval failures → send to dashboard rather than crashing
        redirect('/dashboard');
    }

    const userRole = (user as { role?: string }).role ?? '';
    const orgId = getActorOrgId(user as {
        uid?: string;
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
    }) ?? undefined;

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
                    <AgentOwnerBadge agentId="craig" label="Powered by Craig" />
                </div>
                <p className="text-muted-foreground">
                    Create and manage personalized email and SMS campaigns powered by your CRM data.
                </p>
            </div>

            <Suspense fallback={<CampaignsSkeleton />}>
                <CampaignsDashboard
                    userId={user.uid}
                    orgId={orgId}
                    isSuperUser={userRole === 'super_user' || userRole === 'super_admin'}
                />
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
