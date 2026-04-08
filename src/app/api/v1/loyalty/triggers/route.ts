import { NextResponse, type NextRequest } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { getTriggerRegistry } from '@/server/services/loyalty/event-processor';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/loyalty/triggers — List the trigger registry + recent executions.
 *
 * Query params:
 *   orgId    — filter executions by org (required)
 *   limit    — max executions to return (default 20)
 */
export async function GET(request: NextRequest) {
    const orgId = request.nextUrl.searchParams.get('orgId');
    if (!orgId) {
        return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 20), 100);

    const db = getAdminFirestore();
    const execSnap = await db.collection('trigger_executions')
        .where('organizationId', '==', orgId)
        .orderBy('executedAt', 'desc')
        .limit(limit)
        .get();

    const executions = execSnap.docs.map(doc => doc.data());
    const registry = getTriggerRegistry();

    return NextResponse.json({
        registry,
        recentExecutions: executions,
        totalExecutions: executions.length,
    });
}
