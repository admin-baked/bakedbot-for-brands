// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import IntegrationsPageClient from './page-client';
import { requireUser } from '@/server/auth/auth';

export default async function IntegrationsPage() {
    await requireUser(['dispensary', 'super_user', 'brand']);
    return <IntegrationsPageClient />;
}
