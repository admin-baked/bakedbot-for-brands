export const dynamic = 'force-dynamic';
/**
 * QuickEmailVerification Save Endpoint
 * Validates and saves API key to org config.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const user = await requireUser();
        const uid = (user as { uid?: string }).uid;
        if (!uid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { apiKey } = body;

        const db = getAdminFirestore();
        const userDoc = await db.collection('users').doc(uid).get();
        const orgId = userDoc.data()?.currentOrgId || userDoc.data()?.orgId;

        if (!orgId) {
            return NextResponse.json({ error: 'No organization found' }, { status: 400 });
        }

        // Handle disconnect (empty key)
        if (!apiKey) {
            await db.collection('tenants').doc(orgId).collection('config').doc('integrations').set(
                { quickEmailVerification: { apiKey: null, connectedAt: null } },
                { merge: true }
            );
            return NextResponse.json({ success: true });
        }

        // Validate the API key by making a test verification
        const testUrl = `https://api.quickemailverification.com/v1/verify?email=test@example.com&apikey=${apiKey}`;
        const testRes = await fetch(testUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!testRes.ok) {
            return NextResponse.json(
                { error: 'Invalid API key. Please check and try again.' },
                { status: 400 }
            );
        }

        const testData = await testRes.json();

        // Save validated key to org config
        await db.collection('tenants').doc(orgId).collection('config').doc('integrations').set(
            {
                quickEmailVerification: {
                    apiKey,
                    connectedAt: Date.now(),
                    connectedBy: uid,
                    remainingCredits: testData.remaining_credits ?? null,
                },
            },
            { merge: true }
        );

        logger.info('[QEV Save] API key saved', { orgId, uid });

        return NextResponse.json({
            success: true,
            remainingCredits: testData.remaining_credits ?? null,
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[QEV Save] Error saving API key', { error: err.message });
        return NextResponse.json(
            { error: 'Failed to save API key' },
            { status: 500 }
        );
    }
}
