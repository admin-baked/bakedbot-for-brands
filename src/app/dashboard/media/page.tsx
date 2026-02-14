// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { Suspense } from 'react';
import { requireUser } from '@/server/auth/auth';
import { MediaDashboard } from './components/media-dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
    title: 'Media Generation | BakedBot',
    description: 'Track your AI-generated media usage and costs',
};

export default async function MediaPage() {
    const user = await requireUser();
    const tenantId = user.brandId || user.uid;

    return (
        <div className="container max-w-7xl mx-auto py-8 px-4">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Media Generation</h1>
                    <p className="text-muted-foreground mt-2">
                        Track AI-generated images and videos, manage budgets, and monitor spending
                    </p>
                </div>

                {/* Dashboard */}
                <Suspense fallback={<DashboardSkeleton />}>
                    <MediaDashboard tenantId={tenantId} />
                </Suspense>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-[300px]" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-[300px]" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
