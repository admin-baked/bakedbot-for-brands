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
