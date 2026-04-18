/**
 * GET /api/admin/social-status
 *
 * Returns session cookie status for all RTRVR social services
 * (LinkedIn, Twitter/X, Instagram, Facebook, Reddit, Moltbook).
 * Auth: requireSuperUser
 */

import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { SERVICE_REGISTRY } from '@/server/services/rtrvr/service-registry';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await requireSuperUser();
        const db = getAdminFirestore();

        const results = await Promise.all(
            Object.values(SERVICE_REGISTRY).map(async (svc) => {
                try {
                    const doc = await db
                        .collection('users').doc(user.uid)
                        .collection('integrations').doc(svc.id)
                        .get();

                    if (!doc.exists) {
                        return { id: svc.id, name: svc.displayName, status: 'not_configured' as const, detail: 'Not connected', agents: svc.agents, reconnectUrl: `/dashboard/settings/connections` };
                    }

                    const data = doc.data()!;
                    const capturedAt = data.capturedAt?.toDate?.()?.toISOString() ?? null;
                    const cookies = data.cookies as Record<string, string> | undefined;
                    const cookieCount = cookies ? Object.keys(cookies).length : 0;
                    const expectedCookies = svc.sessionCookies.length;
                    const hasAllCookies = cookieCount >= expectedCookies;

                    return {
                        id: svc.id,
                        name: svc.displayName,
                        status: hasAllCookies ? ('connected' as const) : ('broken' as const),
                        detail: hasAllCookies
                            ? `Session active${capturedAt ? ` · ${new Date(capturedAt).toLocaleDateString()}` : ''}`
                            : `Missing ${expectedCookies - cookieCount} session cookie(s)`,
                        agents: svc.agents,
                        reconnectUrl: `/dashboard/settings/connections`,
                        capturedAt,
                    };
                } catch {
                    return { id: svc.id, name: svc.displayName, status: 'broken' as const, detail: 'Check failed', agents: svc.agents, reconnectUrl: `/dashboard/settings/connections` };
                }
            })
        );

        return NextResponse.json({ checks: results, checkedAt: new Date().toISOString() });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
