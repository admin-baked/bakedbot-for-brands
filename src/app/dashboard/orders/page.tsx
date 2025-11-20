// src/app/dashboard/orders/page.tsx
import { redirect } from 'next/navigation';
import OrdersDashboardClient from './components/orders-dashboard-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { requireUser } from '@/server/auth/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardOrdersPage() {
    let user;
    try {
        user = await requireUser(['dispensary', 'owner']);
    } catch (error) {
        redirect('/brand-login');
    }

    const { role, locationId } = user;

    if (role !== 'dispensary' || !locationId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive" />
                        Access Denied
                    </CardTitle>
                    <CardDescription>
                        This page is for dispensary managers only.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Your account is not configured with the necessary permissions or location ID to view this page. Please contact your administrator.</p>
                </CardContent>
            </Card>
        );
    }

    return <OrdersDashboardClient locationId={locationId} />;
}
