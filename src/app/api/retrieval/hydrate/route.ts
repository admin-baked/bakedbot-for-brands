export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { hydrateRecords } from '@/server/services/retrieval/retrieval.service';

const requestSchema = z.object({
    tenantId: z.string().min(1),
    ids: z.array(z.string().min(1)).min(1).max(200),
    fields: z.array(z.string()).optional(),
    max_records: z.number().int().min(1).max(200).optional(),
});

function extractSessionOrgIds(session: Record<string, unknown>): string[] {
    const candidates = [
        session.orgId,
        session.currentOrgId,
        session.brandId,
        session.locationId,
        session.tenantId,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);

    return Array.from(new Set(candidates));
}

function isSuperUserSession(session: Record<string, unknown>): boolean {
    const role = session.role;
    const roles = Array.isArray(session.roles) ? session.roles : [];
    return role === 'super_user' || role === 'super_admin' || roles.includes('super_user') || roles.includes('super_admin');
}

async function resolveUserOrgIds(uid: string): Promise<string[]> {
    const db = getAdminFirestore();
    const doc = await db.collection('users').doc(uid).get();
    const data = doc.data() || {};

    const candidates = [
        data.orgId,
        data.currentOrgId,
        data.brandId,
        data.locationId,
        data.tenantId,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);

    return Array.from(new Set(candidates));
}

export async function POST(request: NextRequest) {
    try {
        const session = await requireUser();
        const payload = requestSchema.parse(await request.json());

        const isSuper = isSuperUserSession(session as unknown as Record<string, unknown>);
        if (!isSuper) {
            const sessionOrgs = extractSessionOrgIds(session as unknown as Record<string, unknown>);
            const fallbackOrgs = sessionOrgs.length === 0 ? await resolveUserOrgIds(session.uid) : sessionOrgs;
            if (!fallbackOrgs.includes(payload.tenantId)) {
                return NextResponse.json({ error: `Forbidden for org ${payload.tenantId}` }, { status: 403 });
            }
        }

        const result = await hydrateRecords(
            {
                ids: payload.ids,
                fields: payload.fields,
                max_records: payload.max_records,
            },
            payload.tenantId,
        );

        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request payload', issues: error.issues }, { status: 400 });
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to hydrate records' },
            { status: 500 },
        );
    }
}
