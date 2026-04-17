export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { resolveActorOrgId } from '@/server/auth/actor-context';
import { getCompetitiveIntelActivationRun } from '@/server/services/competitive-intel-activation';

export async function GET() {
    try {
        const user = await requireUser();
        const orgId = resolveActorOrgId(user);

        if (!orgId) {
            return NextResponse.json({ run: null }, { status: 200 });
        }

        const run = await getCompetitiveIntelActivationRun(orgId);
        return NextResponse.json({ run });
    } catch (error) {
        console.error('[API] competitive-intel-activation error:', error);
        return NextResponse.json({ run: null }, { status: 200 });
    }
}
