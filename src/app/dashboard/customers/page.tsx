import { requireUser } from '@/server/auth/auth';
import { isBrandRole, isDispensaryRole } from '@/types/roles';
import CRMDashboard from './page-client';

export const metadata = {
    title: 'Customer CRM | BakedBot',
    description: 'Build personalized customer profiles and drive targeted marketing',
};

// Skip SSR for customers - load client-side to avoid server timeout with large datasets
export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
    const user = await requireUser(['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user']);

    // Extract org ID from token based on role
    let orgId: string | undefined;
    const userRole = (user as any).role as string;

    // Brand users use brandId
    if (isBrandRole(userRole)) {
        orgId = (user as any).brandId;
    }

    // Dispensary users use orgId, currentOrgId, or locationId
    if (isDispensaryRole(userRole)) {
        orgId = (user as any).orgId || (user as any).currentOrgId || (user as any).locationId;
    }

    // Fallback to uid if no org ID found
    orgId = orgId || user.uid;

    // Don't pre-fetch customer data - let client component load it
    // This prevents server timeout with large datasets (2500+ customers from Alleaves)
    return <CRMDashboard initialData={undefined} brandId={orgId} />;
}
