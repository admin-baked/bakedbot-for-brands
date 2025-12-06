import { getApps } from './actions';
import AppsPageClient from './page-client';
import { requireUser } from '@/server/auth/auth';

export default async function AppsPage() {
    await requireUser(['brand', 'owner', 'dispensary']);
    const apps = await getApps();
    return <AppsPageClient apps={apps} />;
}
