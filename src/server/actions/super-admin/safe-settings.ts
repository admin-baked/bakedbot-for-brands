'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import type {
    SafeEmailProvider,
    SafeVideoProvider,
    SafeSystemSettings,
    SafeOrgProactivePilotSettings,
    SafeProactiveDiagnosticSummary,
    SafeProactiveOpsCommitmentSummary,
    SafeProactiveOpsOutcomeSummary,
    SafeProactiveOpsSummary,
    SafeProactiveOpsTaskSummary,
} from './safe-settings-types';
import type {
    ProactiveCommitmentRecord,
    ProactiveOutcomeRecord,
    ProactivePilotSettings,
    ProactiveRuntimeDiagnosticRecord,
    ProactiveTaskRecord,
    ProactiveWorkflowKey,
} from '@/types/proactive';
import {
    DEFAULT_PROACTIVE_PILOT_SETTINGS,
    getOrgProactivePilotSettings,
    getSystemProactivePilotSettings,
    sanitizeProactivePilotSettings,
} from '@/server/services/proactive-settings';

// Helper to lazy load admin to avoid circular deps or client leakage
async function getFirebase() {
    const { getAdminAuth, getAdminFirestore } = await import('@/firebase/admin');
    return { getAdminAuth, getAdminFirestore };
}

async function verifySafeSuperAdmin() {
    // Hardcoded for safety in this specific file
    const SUPER_ADMINS = ['martez@bakedbot.ai', 'jack@bakedbot.ai', 'owner@bakedbot.ai'];

    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    if (!session) throw new Error('Unauthorized: No session');
    
    try {
        const { getAdminAuth } = await getFirebase();
        const decoded = await getAdminAuth().verifySessionCookie(session, true);
        const email = decoded.email?.toLowerCase() || '';
        const role = decoded.role || '';
        
        const isSuper = SUPER_ADMINS.includes(email) || role === 'super_user';
        if (!isSuper) throw new Error('Forbidden');
        return decoded;
    } catch (e) {
        throw new Error('Unauthorized: Invalid session');
    }
}

export type {
    SafeEmailProvider,
    SafeVideoProvider,
    SafeSystemSettings,
    SafeOrgProactivePilotSettings,
    SafeProactiveDiagnosticSummary,
    SafeProactiveOpsCommitmentSummary,
    SafeProactiveOpsOutcomeSummary,
    SafeProactiveOpsSummary,
    SafeProactiveOpsTaskSummary,
} from './safe-settings-types';

function toDate(value: unknown): Date | undefined {
    if (!value) {
        return undefined;
    }

    if (value instanceof Date) {
        return value;
    }

    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
        return (value as { toDate: () => Date }).toDate();
    }

    return undefined;
}

function toIsoString(value: unknown): string | undefined {
    return toDate(value)?.toISOString();
}

function serializeOrgProactiveSettings(
    settings: Awaited<ReturnType<typeof getOrgProactivePilotSettings>>
): SafeOrgProactivePilotSettings | null {
    if (!settings) {
        return null;
    }

    return {
        orgId: settings.orgId,
        disabled: settings.disabled,
        workflows: settings.workflows ?? {},
        notes: settings.notes,
        updatedAt: settings.updatedAt?.toISOString(),
        updatedBy: settings.updatedBy,
    };
}

const DEFAULT_SAFE_SYSTEM_SETTINGS: SafeSystemSettings = {
    emailProvider: 'sendgrid',
    videoProvider: 'veo',
};

async function loadSafeSystemSettings(): Promise<SafeSystemSettings> {
    const { getAdminFirestore } = await getFirebase();
    const firestore = getAdminFirestore();
    const doc = await firestore.collection('settings').doc('system').get();

    return {
        emailProvider: doc.exists ? (doc.data()?.emailProvider || DEFAULT_SAFE_SYSTEM_SETTINGS.emailProvider) : DEFAULT_SAFE_SYSTEM_SETTINGS.emailProvider,
        videoProvider: doc.exists ? (doc.data()?.videoProvider || DEFAULT_SAFE_SYSTEM_SETTINGS.videoProvider) : DEFAULT_SAFE_SYSTEM_SETTINGS.videoProvider,
    };
}

async function saveSafeSystemSettings(
    input: Partial<SafeSystemSettings> & { updatedBy?: string }
): Promise<void> {
    const { getAdminFirestore } = await getFirebase();
    const firestore = getAdminFirestore();
    await firestore.collection('settings').doc('system').set({
        ...input,
        updatedAt: new Date(),
    }, { merge: true });
}

async function saveSystemProactivePilotSettings(
    input: ProactivePilotSettings & { updatedBy?: string }
): Promise<void> {
    const { getAdminFirestore } = await getFirebase();
    const firestore = getAdminFirestore();
    const { updatedBy, ...proactivePilot } = input;
    await firestore.collection('settings').doc('system').set({
        proactivePilot,
        proactivePilotUpdatedAt: new Date(),
        proactivePilotUpdatedBy: updatedBy,
        updatedAt: new Date(),
    }, { merge: true });
}

async function saveOrgProactivePilotSettings(input: {
    orgId: string;
    disabled: boolean;
    workflows: Partial<Record<ProactiveWorkflowKey, boolean>>;
    notes?: string;
    updatedBy?: string;
}): Promise<void> {
    const { getAdminFirestore } = await getFirebase();
    const firestore = getAdminFirestore();
    await firestore.collection('org_settings').doc(input.orgId).set({
        proactivePilot: {
            disabled: input.disabled,
            workflows: input.workflows,
            notes: input.notes ?? '',
            updatedAt: new Date(),
            updatedBy: input.updatedBy,
        },
        updatedAt: new Date(),
    }, { merge: true });
}

export async function getSafeSystemSettingsAction(): Promise<SafeSystemSettings> {
    try {
        return await loadSafeSystemSettings();
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to get system settings', {
            error: error instanceof Error ? error.message : String(error),
        });
        return DEFAULT_SAFE_SYSTEM_SETTINGS;
    }
}

export async function updateSafeSystemSettingsAction(input: SafeSystemSettings) {
    try {
        const decoded = await verifySafeSuperAdmin();
        await saveSafeSystemSettings({
            emailProvider: input.emailProvider,
            videoProvider: input.videoProvider,
            updatedBy: decoded.uid,
        });

        revalidatePath('/dashboard/ceo');
        return { success: true };
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to update system settings', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw new Error('Failed to update system settings.');
    }
}

// --- Video Provider ---

interface UpdateVideoProviderInput {
    provider: SafeVideoProvider;
}

export async function getSafeVideoProviderAction() {
    try {
        return (await loadSafeSystemSettings()).videoProvider;
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to get video provider', {
            error: error instanceof Error ? error.message : String(error),
        });
        return DEFAULT_SAFE_SYSTEM_SETTINGS.videoProvider;
    }
}

export async function updateSafeVideoProviderAction(input: UpdateVideoProviderInput) {
    try {
        const decoded = await verifySafeSuperAdmin();
        await saveSafeSystemSettings({
            videoProvider: input.provider,
            updatedBy: decoded.uid,
        });

        revalidatePath('/dashboard/ceo');
        return { success: true };
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to update video provider', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw new Error('Failed to update video settings.');
    }
}

// --- Org-Level Video Provider (dispensary_admin allowed) ---

async function getCallerOrgId(): Promise<{ uid: string; orgId: string; email: string; role: string }> {
    const { getAdminAuth, getAdminFirestore } = await getFirebase();
    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    if (!session) throw new Error('Unauthorized: No session');
    const decoded = await getAdminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;
    const email = (decoded.email || '').toLowerCase();
    const role = (decoded.role as string) || '';

    // Resolve orgId from user doc
    const firestore = getAdminFirestore();
    const userDoc = await firestore.collection('users').doc(uid).get();
    const orgId: string = (userDoc.data()?.currentOrgId || userDoc.data()?.orgId || '') as string;
    if (!orgId) throw new Error('No org associated with this account');

    return { uid, orgId, email, role };
}

const ALLOWED_ORG_ROLES = ['dispensary_admin', 'super_user', 'super_admin', 'owner'];
const SUPER_ADMIN_EMAILS = ['martez@bakedbot.ai', 'jack@bakedbot.ai', 'owner@bakedbot.ai'];

export async function getOrgVideoProviderAction(): Promise<string> {
    try {
        const { getAdminFirestore } = await getFirebase();
        const firestore = getAdminFirestore();
        const { orgId } = await getCallerOrgId();
        // Org-level first, then global fallback
        const orgDoc = await firestore.collection('org_settings').doc(orgId).get();
        if (orgDoc.exists && orgDoc.data()?.videoProvider) {
            return orgDoc.data()!.videoProvider as string;
        }
        const globalDoc = await firestore.collection('settings').doc('system').get();
        return globalDoc.exists ? (globalDoc.data()?.videoProvider || 'kling') : 'kling';
    } catch {
        return 'kling';
    }
}

export async function updateOrgVideoProviderAction(input: UpdateVideoProviderInput) {
    try {
        const { uid, orgId, email, role } = await getCallerOrgId();
        const canSave = SUPER_ADMIN_EMAILS.includes(email) || ALLOWED_ORG_ROLES.includes(role);
        if (!canSave) throw new Error('Forbidden');

        const { getAdminFirestore } = await getFirebase();
        const firestore = getAdminFirestore();
        await firestore.collection('org_settings').doc(orgId).set({
            videoProvider: input.provider,
            updatedAt: new Date(),
            updatedBy: uid,
        }, { merge: true });

        revalidatePath('/dashboard/ceo');
        return { success: true };
    } catch (error: unknown) {
        console.error('[safe-settings] Failed to update org video provider:', error instanceof Error ? error.message : String(error));
        throw new Error('Failed to update video settings.');
    }
}

// --- Email Provider ---

interface UpdateEmailProviderInput {
    provider: SafeEmailProvider;
}

export async function getSafeEmailProviderAction() {
    try {
        return (await loadSafeSystemSettings()).emailProvider;
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to get email provider', {
            error: error instanceof Error ? error.message : String(error),
        });
        return DEFAULT_SAFE_SYSTEM_SETTINGS.emailProvider;
    }
}

export async function updateSafeEmailProviderAction(input: UpdateEmailProviderInput) {
    try {
        const decoded = await verifySafeSuperAdmin();
        await saveSafeSystemSettings({
            emailProvider: input.provider,
            updatedBy: decoded.uid,
        });

        revalidatePath('/dashboard/ceo');
        return { success: true };
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to update email provider', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw new Error('Failed to update email settings.');
    }
}

export async function getSafeProactivePilotSettingsAction(): Promise<ProactivePilotSettings> {
    try {
        await verifySafeSuperAdmin();
        return await getSystemProactivePilotSettings();
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to get proactive pilot settings', {
            error: error instanceof Error ? error.message : String(error),
        });
        return DEFAULT_PROACTIVE_PILOT_SETTINGS;
    }
}

export async function updateSafeProactivePilotSettingsAction(input: ProactivePilotSettings) {
    try {
        const decoded = await verifySafeSuperAdmin();
        const sanitized = sanitizeProactivePilotSettings({ proactivePilot: input });
        await saveSystemProactivePilotSettings({
            ...sanitized,
            updatedBy: decoded.uid,
        });
        revalidatePath('/dashboard/ceo');
        return { success: true };
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to update proactive pilot settings', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw new Error('Failed to update proactive pilot settings.');
    }
}

export async function getSafeOrgProactivePilotSettingsAction(orgId: string): Promise<SafeOrgProactivePilotSettings | null> {
    try {
        await verifySafeSuperAdmin();
        return serializeOrgProactiveSettings(await getOrgProactivePilotSettings(orgId));
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to get org proactive pilot settings', {
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

export async function updateSafeOrgProactivePilotSettingsAction(input: {
    orgId: string;
    disabled: boolean;
    workflows: Partial<Record<ProactiveWorkflowKey, boolean>>;
    notes?: string;
}) {
    try {
        const decoded = await verifySafeSuperAdmin();
        await saveOrgProactivePilotSettings({
            ...input,
            updatedBy: decoded.uid,
        });
        revalidatePath('/dashboard/ceo');
        return { success: true };
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to update org proactive pilot settings', {
            orgId: input.orgId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw new Error('Failed to update org proactive pilot settings.');
    }
}

export async function getSafeProactiveOpsSummaryAction(input?: {
    orgId?: string;
    limit?: number;
}): Promise<SafeProactiveOpsSummary> {
    try {
        await verifySafeSuperAdmin();
        const { getAdminFirestore } = await getFirebase();
        const firestore = getAdminFirestore();
        const limit = input?.limit ?? 8;
        const orgId = input?.orgId?.trim();
        const cutoff = Date.now() - 7 * 86_400_000;

        const [settings, orgSettings, tasksSnap, commitmentsSnap, outcomesSnap, diagnosticsSnap] = await Promise.all([
            getSystemProactivePilotSettings(),
            orgId ? getOrgProactivePilotSettings(orgId) : Promise.resolve(null),
            firestore.collection('proactive_tasks').get(),
            firestore.collection('proactive_commitments').get(),
            firestore.collection('proactive_outcomes').get(),
            firestore.collection('proactive_runtime_diagnostics').get().catch(() => null),
        ]);

        const tasks: ProactiveTaskRecord[] = tasksSnap.docs
            .map((doc) => ({
                ...(doc.data() as Omit<ProactiveTaskRecord, 'id'>),
                id: doc.id,
            }))
            .filter((task) => !orgId || task.organizationId === orgId);

        const commitments: ProactiveCommitmentRecord[] = commitmentsSnap.docs
            .map((doc) => ({
                ...(doc.data() as Omit<ProactiveCommitmentRecord, 'id'>),
                id: doc.id,
            }))
            .filter((commitment) => !orgId || commitment.organizationId === orgId);

        const outcomes: ProactiveOutcomeRecord[] = outcomesSnap.docs
            .map((doc) => ({
                ...(doc.data() as Omit<ProactiveOutcomeRecord, 'id'>),
                id: doc.id,
            }))
            .filter((outcome) => !orgId || outcome.organizationId === orgId);

        const diagnostics: ProactiveRuntimeDiagnosticRecord[] = diagnosticsSnap?.docs
            ?.map((doc) => ({
                ...(doc.data() as Omit<ProactiveRuntimeDiagnosticRecord, 'id'>),
                id: doc.id,
            }))
            .filter((record) => !orgId || record.organizationId === orgId) ?? [];

        const recentTasks: SafeProactiveOpsTaskSummary[] = tasks
            .sort((left, right) => {
                const leftTime = toDate(left.updatedAt)?.getTime() ?? 0;
                const rightTime = toDate(right.updatedAt)?.getTime() ?? 0;
                return rightTime - leftTime;
            })
            .slice(0, limit)
            .map((task) => ({
                id: String(task.id),
                orgId: String(task.organizationId),
                workflowKey: task.workflowKey as ProactiveWorkflowKey,
                status: task.status as SafeProactiveOpsTaskSummary['status'],
                severity: task.severity as SafeProactiveOpsTaskSummary['severity'],
                title: String(task.title ?? 'Untitled task'),
                updatedAt: toIsoString(task.updatedAt) ?? new Date().toISOString(),
                dueAt: toIsoString(task.dueAt),
                threadId: typeof task.threadId === 'string' ? task.threadId : undefined,
                artifactId: typeof task.artifactId === 'string' ? task.artifactId : undefined,
            }));

        const recentCommitments: SafeProactiveOpsCommitmentSummary[] = commitments
            .sort((left, right) => {
                const leftTime = toDate(left.updatedAt)?.getTime() ?? 0;
                const rightTime = toDate(right.updatedAt)?.getTime() ?? 0;
                return rightTime - leftTime;
            })
            .slice(0, limit)
            .map((commitment) => ({
                id: String(commitment.id),
                orgId: String(commitment.organizationId),
                taskId: String(commitment.taskId),
                title: String(commitment.title ?? 'Untitled commitment'),
                state: commitment.state as SafeProactiveOpsCommitmentSummary['state'],
                dueAt: toIsoString(commitment.dueAt),
            }));

        const recentOutcomes: SafeProactiveOpsOutcomeSummary[] = outcomes
            .sort((left, right) => {
                const leftTime = toDate(left.createdAt)?.getTime() ?? 0;
                const rightTime = toDate(right.createdAt)?.getTime() ?? 0;
                return rightTime - leftTime;
            })
            .slice(0, limit)
            .map((outcome) => ({
                id: String(outcome.id),
                orgId: typeof outcome.organizationId === 'string' ? outcome.organizationId : undefined,
                taskId: typeof outcome.taskId === 'string' ? outcome.taskId : undefined,
                workflowKey: outcome.workflowKey as ProactiveWorkflowKey,
                outcomeType: outcome.outcomeType as SafeProactiveOpsOutcomeSummary['outcomeType'],
                createdAt: toIsoString(outcome.createdAt) ?? new Date().toISOString(),
            }));

        const recentDiagnostics: SafeProactiveDiagnosticSummary[] = diagnostics
            .sort((left, right) => {
                const leftTime = toDate(left.createdAt)?.getTime() ?? 0;
                const rightTime = toDate(right.createdAt)?.getTime() ?? 0;
                return rightTime - leftTime;
            })
            .slice(0, limit)
            .map((diagnostic) => ({
                id: String(diagnostic.id),
                orgId: String(diagnostic.organizationId),
                workflowKey: diagnostic.workflowKey as ProactiveWorkflowKey | undefined,
                source: String(diagnostic.source ?? 'unknown'),
                mode: diagnostic.mode as SafeProactiveDiagnosticSummary['mode'],
                createdAt: toIsoString(diagnostic.createdAt) ?? new Date().toISOString(),
                message: typeof diagnostic.message === 'string' ? diagnostic.message : undefined,
            }));

        const activeStatuses = new Set(['detected', 'triaged', 'investigating', 'draft_ready', 'awaiting_approval', 'approved', 'executing', 'executed', 'blocked']);

        return {
            settings,
            orgSettings: serializeOrgProactiveSettings(orgSettings),
            counts: {
                openTasks: tasks.filter((task) => activeStatuses.has(String(task.status))).length,
                draftReadyTasks: tasks.filter((task) => task.status === 'draft_ready').length,
                awaitingApprovalTasks: tasks.filter((task) => task.status === 'awaiting_approval').length,
                openCommitments: commitments.filter((commitment) => commitment.state === 'open').length,
                approvalsLast7Days: outcomes.filter((outcome) => outcome.outcomeType === 'approved' && (toDate(outcome.createdAt)?.getTime() ?? 0) >= cutoff).length,
                dismissalsLast7Days: outcomes.filter((outcome) => outcome.outcomeType === 'dismissed' && (toDate(outcome.createdAt)?.getTime() ?? 0) >= cutoff).length,
                outcomesLast7Days: outcomes.filter((outcome) => (toDate(outcome.createdAt)?.getTime() ?? 0) >= cutoff).length,
                fallbackEventsLast7Days: diagnostics.filter((diagnostic) => diagnostic.mode === 'fallback' && (toDate(diagnostic.createdAt)?.getTime() ?? 0) >= cutoff).length,
            },
            recentTasks,
            recentCommitments,
            recentOutcomes,
            diagnostics: recentDiagnostics,
        };
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to load proactive ops summary', {
            orgId: input?.orgId,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            settings: DEFAULT_PROACTIVE_PILOT_SETTINGS,
            orgSettings: null,
            counts: {
                openTasks: 0,
                draftReadyTasks: 0,
                awaitingApprovalTasks: 0,
                openCommitments: 0,
                approvalsLast7Days: 0,
                dismissalsLast7Days: 0,
                outcomesLast7Days: 0,
                fallbackEventsLast7Days: 0,
            },
            recentTasks: [],
            recentCommitments: [],
            recentOutcomes: [],
            diagnostics: [],
        };
    }
}
