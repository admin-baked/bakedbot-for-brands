import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import SegmentsPageClient from './page-client';

/**
 * Segments page - Server component that gets user context
 * and renders the real segments UI with live customer data.
 */
export default async function SegmentsPage() {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);
    const brandId = user.brandId || user.uid;

    if (!brandId) {
        redirect('/dashboard');
    }

    return <SegmentsPageClient brandId={brandId} />;
}
