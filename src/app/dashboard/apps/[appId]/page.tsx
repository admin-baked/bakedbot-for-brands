import AppConfigPageClient from './page-client';
import { requireUser } from '@/server/auth/auth';

interface PageProps {
    params: {
        appId: string;
    }
}

export default async function AppConfigPage({ params }: PageProps) {
    await requireUser(['brand', 'owner', 'dispensary']);
    return <AppConfigPageClient appId={params.appId} />;
}
