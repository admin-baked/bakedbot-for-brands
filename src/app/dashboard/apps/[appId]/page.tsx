import AppConfigPageClient from './page-client';
import { requireUser } from '@/server/auth/auth';

interface PageProps {
    params: Promise<{
        appId: string;
    }>
}

export default async function AppConfigPage({ params }: PageProps) {
    await requireUser(['brand', 'owner', 'dispensary']);
    const { appId } = await params;  // Next.js 16: params is a Promise
    return <AppConfigPageClient appId={appId} />;
}
