import IntegrationsPageClient from './page-client';
import { requireUser } from '@/server/auth/auth';

export default async function IntegrationsPage() {
    await requireUser(['dispensary', 'super_user', 'brand']);
    return <IntegrationsPageClient />;
}
