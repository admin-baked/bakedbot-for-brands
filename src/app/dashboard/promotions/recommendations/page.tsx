import { requireUser } from '@/server/auth/auth';
import { getPromotionRecommendations } from './actions';
import PromoRecommendations from './page-client';

export default async function PromoPage() {
    const user = await requireUser(['brand', 'owner']);
    const brandId = user.brandId || 'demo-brand';

    // Fetch
    const recommendations = await getPromotionRecommendations(brandId);

    return <PromoRecommendations recommendations={recommendations} />;
}
