// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { getApps } from './actions';
import AppsPageClient from './page-client';
import { requireUser } from '@/server/auth/auth';

export default async function AppsPage() {
    await requireUser();
    const apps = await getApps();
    return <AppsPageClient apps={apps} />;
}
