// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { requireUser } from '@/server/auth/auth';
import LinkDispensaryPageClient from './link-client';

export default async function LinkDispensaryPage() {
    await requireUser(['dispensary', 'super_user']);
    return <LinkDispensaryPageClient />;
}
