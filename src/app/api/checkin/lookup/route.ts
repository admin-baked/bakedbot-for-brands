/**
 * POS Customer Lookup Endpoint
 *
 * Used by the budtender counter to pull a customer dossier by the last 4
 * digits of their phone number.  Designed for lightweight POS integration —
 * no full authentication required, but requests must include a valid
 * Bearer API key with the `read:customers` permission.
 *
 * GET /api/checkin/lookup?orgId=org_thrive_syracuse&phoneLast4=1234
 *
 * TODO(blackleaf-sms): Once Blackleaf SMS is live, this endpoint can also
 * trigger an optional "Your budtender is ready" SMS to the customer on lookup.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireAPIKey, APIKeyError } from '@/server/auth/api-key-auth';
import { getPosDossierByPhoneLast4 } from '@/server/actions/loyalty-tablet';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        await requireAPIKey(request, 'read:customers');
    } catch (err) {
        if (err instanceof APIKeyError) return err.toResponse() as unknown as NextResponse;
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const phoneLast4 = searchParams.get('phoneLast4');

    if (!orgId || !phoneLast4) {
        return NextResponse.json({ error: 'orgId and phoneLast4 are required' }, { status: 400 });
    }

    if (!/^\d{4}$/.test(phoneLast4)) {
        return NextResponse.json({ error: 'phoneLast4 must be exactly 4 digits' }, { status: 400 });
    }

    try {
        const result = await getPosDossierByPhoneLast4(orgId, phoneLast4);

        if (!result.found) {
            return NextResponse.json({ found: false }, { status: 404 });
        }

        if (result.multipleMatches) {
            return NextResponse.json({ found: true, multipleMatches: true }, { status: 200 });
        }

        logger.info('[CheckinLookup] POS dossier fetched', {
            orgId,
            customerId: result.dossier?.customerId,
        });

        return NextResponse.json({ found: true, dossier: result.dossier }, { status: 200 });
    } catch (error) {
        logger.error('[CheckinLookup] Lookup failed', { orgId, error });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
