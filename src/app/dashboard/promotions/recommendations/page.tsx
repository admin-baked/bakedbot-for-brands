// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { requireUser } from '@/server/auth/auth';
import { getPromotionRecommendations } from './actions';
import PromoRecommendations from './page-client';

export default async function PromoPage() {
    const user = await requireUser(['brand', 'super_user']);
    const brandId = user.brandId || 'demo-brand';

    // Fetch
    const recommendations = await getPromotionRecommendations(brandId);

    return <PromoRecommendations recommendations={recommendations} />;
}
