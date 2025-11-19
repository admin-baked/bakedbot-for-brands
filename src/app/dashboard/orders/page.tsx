// src/app/dashboard/orders/page.tsx
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import OrdersDashboardClient from './components/orders-dashboard-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardOrdersPage() {
    const { auth } = await createServerClient();
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
        redirect('/brand-login');
    }

    let decodedToken;
    try {
        decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        redirect('/brand-login');
    }

    const { role, locationId } = decodedToken;

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
