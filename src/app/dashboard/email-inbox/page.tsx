import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { requireUser } from '@/server/auth/auth';
import { getEmailThreadHeaders } from '@/server/services/email-thread-service';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import { EmailInboxClient } from './email-inbox-client';
export const dynamic = 'force-dynamic';

export default async function EmailInboxPage() {
    const user = await requireUser();
    const role = typeof user.role === 'string' ? user.role : '';
    const isSuperUser = role === 'super_user' || role === 'super_admin';
    const orgId = isSuperUser ? undefined : (typeof user.orgId === 'string' ? user.orgId : undefined);

    const [outreachThreads, orgThreads, gmailToken] = await Promise.all([
        isSuperUser ? getEmailThreadHeaders({ scope: 'outreach', limit: 100 }) : Promise.resolve([]),
        isSuperUser
            ? getEmailThreadHeaders({ scope: 'org', limit: 100 })
            : orgId ? getEmailThreadHeaders({ scope: 'org', orgId, limit: 100 }) : Promise.resolve([]),
        getGmailToken(user.uid).catch(() => null),
    ]);

    const threads = [...outreachThreads, ...orgThreads];
    const gmailConnected = !!(gmailToken?.refresh_token);

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
                    gmailConnected={gmailConnected}
                />
            </Suspense>
        </div>
    );
}
