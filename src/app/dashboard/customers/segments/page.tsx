// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { requireUser } from '@/server/auth/auth';
import SegmentsPage from './page-client';

export const metadata = {
    title: 'Customer Segments | BakedBot',
    description: 'Create and manage customer segments for targeted marketing',
};

export default async function SegmentsServerPage() {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);
    const brandId = user.brandId || user.uid;

    return <SegmentsPage brandId={brandId} />;
}
