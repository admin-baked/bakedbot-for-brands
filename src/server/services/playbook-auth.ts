import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import type { Playbook } from '@/types/playbook';

export class PlaybookApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = 'PlaybookApiError';
    }
}

export function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

export function resolveActorOrgId(user: Record<string, unknown>): string | null {
    const currentOrgId =
        typeof user.currentOrgId === 'string' ? user.currentOrgId : undefined;
    const orgId = typeof user.orgId === 'string' ? user.orgId : undefined;
    const brandId = typeof user.brandId === 'string' ? user.brandId : undefined;
    const dispensaryId =
        typeof user.dispensaryId === 'string' ? user.dispensaryId : undefined;
    const tenantId = typeof user.tenantId === 'string' ? user.tenantId : undefined;
    const organizationId =
        typeof user.organizationId === 'string' ? user.organizationId : undefined;

    return currentOrgId ?? orgId ?? brandId ?? dispensaryId ?? tenantId ?? organizationId ?? null;
}

export function assertOrgAccess(user: Record<string, unknown>, orgId: string): void {
    if (isSuperRole(user.role)) {
        return;
    }

    if (resolveActorOrgId(user) !== orgId) {
        throw new PlaybookApiError('Forbidden', 403);
    }
}

export async function requirePlaybookUser(): Promise<DecodedIdToken> {
    return requireUser(['brand', 'dispensary', 'super_user']);
}

export async function resolveRequestedOrgId(
    requestedOrgId?: unknown,
): Promise<{ user: DecodedIdToken; orgId: string }> {
    const user = await requirePlaybookUser();
    const actorOrgId = resolveActorOrgId(user as Record<string, unknown>);

    const candidateOrgId =
        typeof requestedOrgId === 'string' && requestedOrgId.trim().length > 0
            ? requestedOrgId.trim()
            : actorOrgId;

    if (!candidateOrgId) {
        throw new PlaybookApiError('Organization context is required', 400);
    }

    assertOrgAccess(user as Record<string, unknown>, candidateOrgId);
    return { user, orgId: candidateOrgId };
}

export async function getAuthorizedPlaybook(playbookId: string): Promise<{
    user: DecodedIdToken;
    playbook: Playbook;
    ref: FirebaseFirestore.DocumentReference;
}> {
    const user = await requirePlaybookUser();
    const db = getAdminFirestore();
    const ref = db.collection('playbooks').doc(playbookId);
    const snap = await ref.get();

    if (!snap.exists) {
        throw new PlaybookApiError('Playbook not found', 404);
    }

    const playbook = snap.data() as Playbook;
    assertOrgAccess(user as Record<string, unknown>, playbook.orgId);

    return { user, playbook, ref };
}

export async function getAuthorizedRun(runId: string): Promise<{
    user: DecodedIdToken;
    run: Record<string, unknown>;
    runRef: FirebaseFirestore.DocumentReference;
    playbook: Playbook;
    playbookRef: FirebaseFirestore.DocumentReference;
}> {
    const user = await requirePlaybookUser();
    const db = getAdminFirestore();
    const runRef = db.collection('playbook_runs').doc(runId);
    const runSnap = await runRef.get();

    if (!runSnap.exists) {
        throw new PlaybookApiError('Run not found', 404);
    }

    const run = (runSnap.data() ?? {}) as Record<string, unknown>;
    const playbookId = typeof run.playbookId === 'string' ? run.playbookId : null;
    if (!playbookId) {
        throw new PlaybookApiError('Run is missing playbook reference', 500);
    }

    const playbookRef = db.collection('playbooks').doc(playbookId);
    const playbookSnap = await playbookRef.get();
    if (!playbookSnap.exists) {
        throw new PlaybookApiError('Playbook not found for run', 404);
    }

    const playbook = playbookSnap.data() as Playbook;
    const runOrgId =
        typeof run.orgId === 'string' && run.orgId.length > 0
            ? run.orgId
            : playbook.orgId;

    assertOrgAccess(user as Record<string, unknown>, runOrgId);

    return { user, run, runRef, playbook, playbookRef };
}
