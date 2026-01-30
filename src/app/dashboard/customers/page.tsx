import { requireUser } from '@/server/auth/auth';
import { getCustomers } from './actions';
import CRMDashboard from './page-client';

export const metadata = {
    title: 'Customer CRM | BakedBot',
    description: 'Build personalized customer profiles and drive targeted marketing',
};

export default async function CustomersPage() {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);
    // Ensure brandId is always a valid string
    const brandId = String((user as any).brandId || user.uid);

    // Pre-fetch customer data for SSR
    let initialData;
    try {
        initialData = await getCustomers(brandId);
    } catch (error) {
        console.error('Failed to load initial customers:', error);
    }

    return <CRMDashboard initialData={initialData} brandId={brandId} />;
}
