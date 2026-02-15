import { requireUser } from '@/server/auth/auth';
import { getLeads } from './actions';
import LeadsDashboard from './page-client';

export const metadata = {
    title: 'Business Leads | BakedBot',
    description: 'Manage B2B inquiries, brand requests, and partnership opportunities',
};

export default async function LeadsPage() {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);
    const orgId = user.brandId || user.uid;

    // Pre-fetch leads for SSR
    let initialData;
    try {
        initialData = await getLeads(orgId);
    } catch (error) {
        console.error('Failed to load initial leads:', error);
    }

    return <LeadsDashboard initialData={initialData} orgId={orgId} />;
}
