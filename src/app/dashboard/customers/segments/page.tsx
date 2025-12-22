import { requireUser } from '@/server/auth/auth';
import SegmentsPage from './page-client';

export const metadata = {
    title: 'Customer Segments | BakedBot',
    description: 'Create and manage customer segments for targeted marketing',
};

export default async function SegmentsServerPage() {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const brandId = user.brandId || user.uid;

    return <SegmentsPage brandId={brandId} />;
}
