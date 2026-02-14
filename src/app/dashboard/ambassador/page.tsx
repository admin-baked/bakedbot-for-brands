// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { requireUser } from '@/server/auth/auth';
import { getAmbassadorProducts } from './actions';
import AmbassadorDashboard from './page-client';

export default async function AmbassadorPage() {
    const user = await requireUser(['brand', 'super_user']);
    // Fallback brandId for owner without specific brand in context, though uncommon
    const brandId = user.brandId || 'demo-brand';
    const products = await getAmbassadorProducts(brandId);

    return <AmbassadorDashboard products={products} />;
}
