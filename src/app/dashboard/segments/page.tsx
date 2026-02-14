// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import SegmentsPageClient from './page-client';

/**
 * Segments page - Server component that gets user context
 * and renders the real segments UI with live customer data.
 */
export default async function SegmentsPage() {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);
    const brandId = (user as any).orgId || user.brandId || (user as any).currentOrgId || user.uid;

    if (!brandId) {
        redirect('/dashboard');
    }

    return <SegmentsPageClient brandId={brandId} />;
}
