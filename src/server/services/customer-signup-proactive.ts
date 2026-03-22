import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
    createInboxArtifactId,
    createInboxThreadId,
    type InboxArtifactProactiveMetadata,
} from '@/types/inbox';
import type { ProactiveSeverity, ProactiveTaskRecord } from '@/types/proactive';
import { appendProactiveEvent } from './proactive-event-log';
import { upsertCommitment } from './proactive-commitment-service';
import { recordProactiveOutcome } from './proactive-outcome-service';
import { getResolvedProactiveSnoozeHours, isProactiveWorkflowEnabled } from './proactive-settings';
import {
    attachProactiveTaskEvidence,
    createOrReuseProactiveTask,
    linkTaskToInbox,
    transitionProactiveTask,
} from './proactive-task-service';

export type WelcomeAutomationState = 'active' | 'paused' | 'unassigned' | 'missing';

export interface CustomerSignupPayload {
    customerId?: string | number | null;
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    [key: string]: unknown;
}

interface CustomerSignupOpportunity {
    customerKey: string;
    displayName: string;
    email?: string;
    phone?: string;
    severity: ProactiveSeverity;
    reason: string;
    businessObjectId: string;
    title: string;
    summary: string;
    commitmentTitle: string;
    welcomeAutomationState: WelcomeAutomationState;
}

const WELCOME_TEMPLATE_ID = 'welcome_email_template';
const ONBOARDING_THREAD_KEY = 'customer_signup_onboarding_watch';

function normalizeText(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeEmail(value: unknown): string | undefined {
    const email = normalizeText(value);
    return email ? email.toLowerCase() : undefined;
}

function resolveDisplayName(payload: CustomerSignupPayload): string {
    const name = normalizeText(payload.name);
    if (name) {
        return name;
    }

    const firstName = normalizeText(payload.firstName);
    const lastName = normalizeText(payload.lastName);
    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    }
    if (firstName) {
        return firstName;
    }

    return normalizeEmail(payload.email) || normalizeText(payload.phone) || 'New customer';
}

function resolveCustomerKey(payload: CustomerSignupPayload): string | null {
    const normalizedId = normalizeText(
        typeof payload.customerId === 'number'
            ? String(payload.customerId)
            : payload.customerId
    );
    if (normalizedId) {
        return normalizedId;
    }

    return normalizeEmail(payload.email) || normalizeText(payload.phone) || null;
}

export function getCustomerSignupOpportunity(input: {
    orgId: string;
    payload: CustomerSignupPayload;
    welcomeAutomationState: WelcomeAutomationState;
}): CustomerSignupOpportunity | null {
    const email = normalizeEmail(input.payload.email);
    const phone = normalizeText(input.payload.phone);
    const customerKey = resolveCustomerKey(input.payload);
    if (!customerKey) {
        return null;
    }

    const displayName = resolveDisplayName(input.payload);
    const customerRef = email || customerKey;

    if (input.welcomeAutomationState === 'active' && email) {
        return null;
    }

    if (!email && !phone) {
        return {
            customerKey,
            displayName,
            severity: 'high',
            reason: 'missing_contact_channel',
            businessObjectId: customerRef,
            title: `New customer needs contact capture: ${displayName}`,
            summary: `${displayName} signed up, but no email or phone was present for a welcome follow-up.`,
            commitmentTitle: 'Review new customer onboarding contact gap',
            welcomeAutomationState: input.welcomeAutomationState,
        };
    }

    if (!email) {
        return {
            customerKey,
            displayName,
            phone,
            severity: 'medium',
            reason: 'email_missing',
            businessObjectId: customerRef,
            title: `New customer missing email welcome path: ${displayName}`,
            summary: `${displayName} signed up with no email on file. Review SMS or in-store onboarding instead of email welcome.`,
            commitmentTitle: 'Review SMS-first onboarding follow-up',
            welcomeAutomationState: input.welcomeAutomationState,
        };
    }

    return {
        customerKey,
        displayName,
        email,
        phone,
        severity: input.welcomeAutomationState === 'missing' ? 'high' : 'medium',
        reason: input.welcomeAutomationState === 'missing'
            ? 'welcome_automation_missing'
            : input.welcomeAutomationState === 'unassigned'
                ? 'welcome_automation_unassigned'
                : 'welcome_automation_paused',
        businessObjectId: customerRef,
        title: `New customer welcome follow-up needed: ${displayName}`,
        summary: `${displayName} signed up, but welcome automation is ${input.welcomeAutomationState}. Review the first-touch onboarding path.`,
        commitmentTitle: 'Review new customer welcome follow-up',
        welcomeAutomationState: input.welcomeAutomationState,
    };
}

async function getWelcomeAutomationState(orgId: string): Promise<{
    state: WelcomeAutomationState;
    playbookId?: string;
}> {
    const db = getAdminFirestore();
    const playbookSnap = await db
        .collection('playbooks')
        .where('orgId', '==', orgId)
        .where('templateId', '==', WELCOME_TEMPLATE_ID)
        .limit(5)
        .get();

    if (playbookSnap.empty) {
        return { state: 'missing' };
    }

    const playbookId = playbookSnap.docs[0].id;
    const assignmentSnap = await db
        .collection('playbook_assignments')
        .where('orgId', '==', orgId)
        .where('playbookId', '==', playbookId)
        .limit(5)
        .get();

    if (assignmentSnap.empty) {
        return { state: 'unassigned', playbookId };
    }

    const status = assignmentSnap.docs[0].data()?.status;
    if (status === 'active') {
        return { state: 'active', playbookId };
    }

    return { state: 'paused', playbookId };
}

async function safelyTransitionTask(
    task: ProactiveTaskRecord,
    nextStatus: Parameters<typeof transitionProactiveTask>[1],
    reason: string
): Promise<ProactiveTaskRecord> {
    try {
        return await transitionProactiveTask(task.id, nextStatus, reason);
    } catch (error) {
        logger.warn('[CustomerSignupProactive] Proactive task transition skipped', {
            taskId: task.id,
            nextStatus,
            reason,
            error: error instanceof Error ? error.message : String(error),
        });
        return task;
    }
}

async function ensureOnboardingThread(orgId: string): Promise<string> {
    const db = getAdminFirestore();
    const existingThreads = await db
        .collection('inbox_threads')
        .where('orgId', '==', orgId)
        .limit(100)
        .get();

    const existing = existingThreads.docs.find(
        (doc) => doc.data()?.metadata?.customerSignupThreadKey === ONBOARDING_THREAD_KEY
    );
    if (existing) {
        return existing.id;
    }

    const threadId = createInboxThreadId();
    await db.collection('inbox_threads').doc(threadId).set({
        id: threadId,
        orgId,
        userId: 'system',
        type: 'customer_health',
        status: 'active',
        title: 'Customer Onboarding Watch',
        preview: 'Mrs. Parker is monitoring welcome automation gaps for new customers',
        primaryAgent: 'mrs_parker',
        assignedAgents: ['mrs_parker', 'craig'],
        artifactIds: [],
        messages: [],
        metadata: {
            customerSignupThreadKey: ONBOARDING_THREAD_KEY,
            proactiveWorkflowKey: 'daily_dispensary_health',
            isProactiveThread: true,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    });

    return threadId;
}

async function upsertOnboardingArtifact(input: {
    orgId: string;
    threadId: string;
    taskId: string;
    opportunity: CustomerSignupOpportunity;
    playbookId?: string;
    existingArtifactId?: string;
}): Promise<string> {
    const db = getAdminFirestore();
    const artifactId = input.existingArtifactId ?? createInboxArtifactId();
    const proactive: InboxArtifactProactiveMetadata = {
        taskId: input.taskId,
        workflowKey: 'daily_dispensary_health',
        severity: input.opportunity.severity,
        evidence: [
            { label: 'Customer', value: input.opportunity.displayName },
            { label: 'Welcome automation', value: input.opportunity.welcomeAutomationState },
            { label: 'Reason', value: input.opportunity.reason.replace(/_/g, ' ') },
        ],
        nextActionLabel: 'Review onboarding gap',
    };

    const payload = {
        id: artifactId,
        threadId: input.threadId,
        orgId: input.orgId,
        type: 'health_scorecard' as const,
        status: 'draft',
        data: {
            source: 'customer_signup_webhook',
            customerId: input.opportunity.customerKey,
            customerName: input.opportunity.displayName,
            email: input.opportunity.email ?? null,
            phone: input.opportunity.phone ?? null,
            welcomeAutomationState: input.opportunity.welcomeAutomationState,
            playbookId: input.playbookId ?? null,
            summary: input.opportunity.summary,
            nextStep: input.opportunity.commitmentTitle,
        },
        rationale: 'New customer signup detected. BakedBot created an onboarding follow-up only because the welcome path is incomplete or unusable.',
        proactive,
        createdBy: 'system',
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (input.existingArtifactId) {
        await db.collection('inbox_artifacts').doc(artifactId).update(payload);
    } else {
        await db.collection('inbox_artifacts').doc(artifactId).set({
            ...payload,
            createdAt: FieldValue.serverTimestamp(),
        });
    }

    await db.collection('inbox_threads').doc(input.threadId).set({
        artifactIds: FieldValue.arrayUnion(artifactId),
        status: 'active',
        preview: input.opportunity.summary,
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return artifactId;
}

export async function syncCustomerSignupProactiveGap(
    orgId: string,
    payload: CustomerSignupPayload
): Promise<{ success: boolean; skipped?: boolean; taskId?: string; reason?: string; error?: string }> {
    try {
        const workflowEnabled = await isProactiveWorkflowEnabled(orgId, 'daily_dispensary_health');
        if (!workflowEnabled) {
            return { success: true, skipped: true, reason: 'workflow_disabled' };
        }

        const automation = await getWelcomeAutomationState(orgId);
        const opportunity = getCustomerSignupOpportunity({
            orgId,
            payload,
            welcomeAutomationState: automation.state,
        });

        if (!opportunity) {
            logger.info('[CustomerSignupProactive] Welcome path already healthy for signup', {
                orgId,
                customerId: payload.customerId,
                email: normalizeEmail(payload.email),
                welcomeAutomationState: automation.state,
            });
            return { success: true, skipped: true, reason: 'welcome_path_healthy' };
        }

        let task = await createOrReuseProactiveTask({
            tenantId: orgId,
            organizationId: orgId,
            workflowKey: 'daily_dispensary_health',
            agentKey: 'mrs_parker',
            title: opportunity.title,
            summary: opportunity.summary,
            severity: opportunity.severity,
            businessObjectType: 'customer',
            businessObjectId: opportunity.businessObjectId,
            dedupeKey: `customer_signup_gap:${orgId}:${opportunity.customerKey}`,
            dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            createdBy: 'system',
        });

        task = await safelyTransitionTask(task, 'triaged', 'customer_signup_gap_detected');
        task = await safelyTransitionTask(task, 'investigating', 'customer_signup_gap_written_back');
        task = await safelyTransitionTask(task, 'draft_ready', 'customer_signup_gap_ready_for_review');

        const threadId = await ensureOnboardingThread(orgId);
        const artifactId = await upsertOnboardingArtifact({
            orgId,
            threadId,
            taskId: task.id,
            opportunity,
            playbookId: automation.playbookId,
            existingArtifactId: task.artifactId,
        });

        await linkTaskToInbox(task.id, { threadId, artifactId });

        await attachProactiveTaskEvidence(task.id, {
            taskId: task.id,
            tenantId: task.tenantId,
            evidenceType: 'customer_signup_gap',
            refId: artifactId,
            payload: {
                customerId: normalizeText(
                    typeof payload.customerId === 'number' ? String(payload.customerId) : payload.customerId
                ) ?? null,
                email: normalizeEmail(payload.email) ?? null,
                phone: normalizeText(payload.phone) ?? null,
                displayName: opportunity.displayName,
                welcomeAutomationState: automation.state,
                playbookId: automation.playbookId ?? null,
                reason: opportunity.reason,
            },
        });

        await appendProactiveEvent({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            actorType: 'system',
            eventType: 'customer.signup.onboarding_gap_detected',
            businessObjectType: 'customer',
            businessObjectId: opportunity.businessObjectId,
            payload: {
                threadId,
                artifactId,
                welcomeAutomationState: automation.state,
                playbookId: automation.playbookId ?? null,
                reason: opportunity.reason,
            },
        });

        const snoozeHours = await getResolvedProactiveSnoozeHours(orgId);
        await upsertCommitment({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            commitmentType: 'follow_up',
            title: opportunity.commitmentTitle,
            dueAt: new Date(Date.now() + snoozeHours * 60 * 60 * 1000),
            payload: {
                threadId,
                artifactId,
                customerId: opportunity.customerKey,
                welcomeAutomationState: automation.state,
            },
        });

        await recordProactiveOutcome({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            workflowKey: 'daily_dispensary_health',
            outcomeType: 'executed',
            payload: {
                threadId,
                artifactId,
                customerId: opportunity.customerKey,
                reason: opportunity.reason,
            },
        });

        logger.info('[CustomerSignupProactive] Signup onboarding gap synced', {
            orgId,
            taskId: task.id,
            customerId: opportunity.customerKey,
            welcomeAutomationState: automation.state,
            playbookId: automation.playbookId ?? null,
        });

        return { success: true, taskId: task.id };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[CustomerSignupProactive] Failed to sync signup proactive gap', {
            orgId,
            customerId: payload.customerId,
            error: message,
        });
        return { success: false, error: message };
    }
}
