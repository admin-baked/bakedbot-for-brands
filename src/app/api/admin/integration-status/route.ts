/**
 * GET /api/admin/integration-status
 *
 * Returns live connection health for all key integrations.
 * Auth: requireSuperUser (session-based)
 */

import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { checkAllConnections } from '@/server/services/connection-health';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checks = await checkAllConnections();
    return NextResponse.json({ checks, checkedAt: new Date().toISOString() });
}
