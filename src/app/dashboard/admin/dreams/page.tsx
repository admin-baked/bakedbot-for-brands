/**
 * Admin — Agent Dream Sessions
 * Protected by AdminLayout → requireSuperUser().
 */

import { fetchDreamSessions } from '@/lib/dream-sessions';
import { DreamSessionsTable } from './sessions-table';

export const dynamic = 'force-dynamic';

export default async function DreamSessionsPage() {
    const sessions = await fetchDreamSessions();

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold">Agent Dream Sessions</h1>
                <p className="text-muted-foreground mt-1">
                    Nightly self-improvement loop — each agent introspects, hypothesizes, and tests improvements.
                    Confirmed findings are routed to Linus + Martez for review.
                </p>
            </div>

            <DreamSessionsTable sessions={sessions} />
        </div>
    );
}
