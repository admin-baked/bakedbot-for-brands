import { requireUser } from '@/server/auth/auth';
import { isBrandRole, isDispensaryRole } from '@/types/roles';
import CustomerDetailClient from './page-client';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireUser([
        'brand', 'brand_admin', 'brand_member',
        'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender',
        'super_user',
    ]);

    const { id } = await params;

    // Resolve orgId (same pattern as parent page)
    const userRole = (user as any).role as string;
    let orgId: string | undefined;

    if (isBrandRole(userRole)) {
        orgId = (user as any).brandId;
    }
    if (isDispensaryRole(userRole)) {
        orgId = (user as any).orgId || (user as any).currentOrgId || (user as any).locationId;
    }
    orgId = orgId || user.uid;

    return <CustomerDetailClient customerId={decodeURIComponent(id)} orgId={orgId} />;
}
