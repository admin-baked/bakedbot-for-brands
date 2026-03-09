import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { retrieveContext, type RetrieveContextInput } from '@/server/services/retrieval/retrieval.service';

const requestSchema = z.object({
    query: z.string().min(1),
    intent: z.enum(['answer_question', 'find_entity', 'compare', 'summarize', 'diagnose', 'recommend', 'plan', 'audit']),
    domain: z.enum(['catalog', 'knowledge', 'operations', 'analytics', 'customers', 'compliance', 'cultivation', 'marketing', 'all']),
    tenant_scope: z.object({
        org_ids: z.array(z.string()).min(1),
        role_scope: z.enum(['super_user', 'dispensary', 'brand', 'grower']),
        visibility: z.enum(['tenant_only', 'cross_tenant_allowed']),
    }),
    filters: z.object({
        store_ids: z.array(z.string()).optional(),
        brand_ids: z.array(z.string()).optional(),
        facility_ids: z.array(z.string()).optional(),
        product_types: z.array(z.string()).optional(),
        statuses: z.array(z.string()).optional(),
        source_systems: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        time_range: z.object({ start: z.string().optional(), end: z.string().optional() }).optional(),
        geography: z.array(z.string()).optional(),
    }).optional(),
    response_shape: z.enum(['brief', 'standard', 'evidence_pack']).optional(),
    top_k: z.number().int().min(1).max(30).optional(),
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

function isSuperUserSession(session: Record<string, unknown>): boolean {
    const role = session.role;
    const roles = Array.isArray(session.roles) ? session.roles : [];
    return role === 'super_user' || role === 'super_admin' || roles.includes('super_user') || roles.includes('super_admin');
}

export async function POST(request: NextRequest) {
    try {
        const session = await requireUser();
        const payload = requestSchema.parse(await request.json()) as RetrieveContextInput;

        const isSuper = isSuperUserSession(session as unknown as Record<string, unknown>);
        if (!isSuper && payload.tenant_scope.visibility === 'cross_tenant_allowed') {
            return NextResponse.json({ error: 'Cross-tenant retrieval requires super user access.' }, { status: 403 });
        }

        if (!isSuper) {
            const sessionOrgs = extractSessionOrgIds(session as unknown as Record<string, unknown>);
            const fallbackOrgs = sessionOrgs.length === 0 ? await resolveUserOrgIds(session.uid) : sessionOrgs;
            const allowed = new Set(fallbackOrgs);

            const unauthorizedTarget = payload.tenant_scope.org_ids.find((orgId) => !allowed.has(orgId));
            if (unauthorizedTarget) {
                return NextResponse.json({ error: `Forbidden for org ${unauthorizedTarget}` }, { status: 403 });
            }
        }

        const result = await retrieveContext(payload);
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request payload', issues: error.issues }, { status: 400 });
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to run retrieval query' },
            { status: 500 },
        );
    }
}
