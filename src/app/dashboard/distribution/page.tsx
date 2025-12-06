import { requireUser } from '@/server/auth/auth';
import { getDistributionData } from './actions';
import DistributionPageClient from './page-client';

export default async function DistributionPage() {
    const user = await requireUser(['brand', 'owner']);
    const brandId = user.brandId || 'demo-brand';

    // Fetch data
    const data = await getDistributionData(brandId); // This takes ~500ms and is cached by Next.js if configured, nice.

    return <DistributionPageClient data={data} brandId={brandId} />;
}
