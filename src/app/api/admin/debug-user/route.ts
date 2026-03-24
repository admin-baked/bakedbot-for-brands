/**
 * GET /api/admin/debug-user
 *
 * Returns the current session's decoded token fields relevant to analytics
 * (role, orgId, currentOrgId, brandId, locationId).
 *
 * Auth: valid session cookie (any logged-in user can call this about themselves)
 */

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';

export async function GET() {
    try {
        const user = await requireUser();
        const u = user as any;
        return NextResponse.json({
            uid: u.uid,
            email: u.email,
            role: u.role,
            orgId: u.orgId ?? null,
            currentOrgId: u.currentOrgId ?? null,
            brandId: u.brandId ?? null,
            locationId: u.locationId ?? null,
            // What the analytics page would compute as entityId:
            analyticsEntityId: u.brandId || u.currentOrgId || u.orgId || '(empty — analytics will show $0)',
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}
