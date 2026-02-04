import { requireUser } from '@/server/auth/auth';
import { isBrandRole, isDispensaryRole } from '@/types/roles';
import { getCustomers } from './actions';
import CRMDashboard from './page-client';

export const metadata = {
    title: 'Customer CRM | BakedBot',
    description: 'Build personalized customer profiles and drive targeted marketing',
};

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

    // Pre-fetch customer data for SSR
    let initialData;
    try {
        initialData = await getCustomers({ orgId });
    } catch (error) {
        console.error('Failed to load initial customers:', error);
    }

    return <CRMDashboard initialData={initialData} brandId={orgId} />;
}
