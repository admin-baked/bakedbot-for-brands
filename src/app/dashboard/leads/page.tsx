import { requireUser } from '@/server/auth/auth';
import { getLeads } from './actions';
import LeadsDashboard from './page-client';

export default async function LeadsPage() {
    const user = await requireUser(['brand', 'owner']);
    const brandId = user.brandId || 'demo-brand';

    // Fetch leads
    const leads = await getLeads(brandId);

    return <LeadsDashboard leads={leads} />;
}
