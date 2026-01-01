import { requireUser } from '@/server/auth/auth';
import LinkDispensaryPageClient from './link-client';

export default async function LinkDispensaryPage() {
    await requireUser(['dispensary', 'owner', 'super_admin']);
    return <LinkDispensaryPageClient />;
}
