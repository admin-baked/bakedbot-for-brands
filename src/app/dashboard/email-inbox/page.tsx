import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { requireAuth } from '@/server/auth/require-auth';
import { getEmailThreads } from '@/server/services/email-thread-service';
import { EmailInboxClient } from './email-inbox-client';
import type { EmailThreadScope } from '@/types/email-thread';

export const dynamic = 'force-dynamic';

export default async function EmailInboxPage() {
    const { user } = await requireAuth();
    const role = user.role ?? '';
    const isSuperUser = role === 'super_user' || role === 'super_admin';

    // Super users see outreach threads; org users see their org's threads
    const scope: EmailThreadScope = isSuperUser ? 'outreach' : 'org';
    const orgId = isSuperUser ? undefined : user.orgId;

    const [outreachThreads, orgThreads] = await Promise.all([
        isSuperUser ? getEmailThreads({ scope: 'outreach', limit: 100 }) : Promise.resolve([]),
        orgId ? getEmailThreads({ scope: 'org', orgId, limit: 100 }) : Promise.resolve([]),
    ]);

    // Super users also see org threads for any org they manage
    const threads = isSuperUser
        ? [...outreachThreads, ...(await getEmailThreads({ scope: 'org', limit: 100 }))]
        : orgThreads;

    return (
        <div className="h-full flex flex-col">
            <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            }>
                <EmailInboxClient
                    initialThreads={JSON.parse(JSON.stringify(threads))}
                    isSuperUser={isSuperUser}
                />
            </Suspense>
        </div>
    );
}
