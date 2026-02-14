// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import AppConfigPageClient from './page-client';
import { requireUser } from '@/server/auth/auth';

interface PageProps {
    params: Promise<{
        appId: string;
    }>
}

export default async function AppConfigPage({ params }: PageProps) {
    await requireUser(['brand', 'super_user', 'dispensary']);
    const { appId } = await params;  // Next.js 16: params is a Promise
    return <AppConfigPageClient appId={appId} />;
}
