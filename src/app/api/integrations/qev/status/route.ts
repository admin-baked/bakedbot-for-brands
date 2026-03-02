/**
 * QuickEmailVerification Status Endpoint
 * Returns connection status and remaining credits.
 */

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        const user = await requireUser();
        const uid = (user as { uid?: string }).uid;
        if (!uid) {
            return NextResponse.json({ connected: false });
        }

        const db = getAdminFirestore();

        // Check org-level config first
        const userDoc = await db.collection('users').doc(uid).get();
        const orgId = userDoc.data()?.currentOrgId || userDoc.data()?.orgId;

        if (orgId) {
            const configDoc = await db.collection('tenants').doc(orgId).collection('config').doc('integrations').get();
            const qevKey = configDoc.data()?.quickEmailVerification?.apiKey;
            if (qevKey) {
                return NextResponse.json({
                    connected: true,
                    remainingCredits: configDoc.data()?.quickEmailVerification?.remainingCredits ?? null,
                });
            }
        }

        // Fall back to system-level key
        const systemKey = process.env.QUICKEMAILVERIFICATION_API_KEY;
        if (systemKey) {
            return NextResponse.json({ connected: true, remainingCredits: null });
        }

        return NextResponse.json({ connected: false });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[QEV Status] Error checking status', { error: err.message });
        return NextResponse.json({ connected: false });
    }
}
