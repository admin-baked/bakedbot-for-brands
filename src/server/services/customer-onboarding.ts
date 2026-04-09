import { getAdminFirestore } from '@/firebase/admin';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';
import type {
    CustomerOnboardingBlockedReason,
    CustomerOnboardingRun,
    CustomerOnboardingRunStatus,
    CustomerOnboardingSignalType,
    CustomerOnboardingStatusSummary,
    CustomerOnboardingStepKey,
    CustomerOnboardingStepState,
} from '@/types/customer-onboarding';
import { CUSTOMER_ONBOARDING_RUNS_COLLECTION } from '@/types/customer-onboarding';
import type { WelcomeAutomationState } from './customer-signup-proactive';
import {
    getWelcomeAutomationState,
    syncCustomerOnboardingRunGap,
} from './customer-signup-proactive';
import { queueReturningWelcomeEmail } from './mrs-parker-returning';
import { sendWelcomeEmail } from './mrs-parker-welcome';

const REVIEW_NUDGE_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
const FAILURE_RETRY_DELAY_MS = 4 * 60 * 60 * 1000;
const DEFAULT_CONFIDENCE_SCORE = 95;

type CustomerOnboardingStepMap = CustomerOnboardingRun['steps'];

interface TabletCheckinSignalContext {
    orgId: string;
    customerId: string;
    visitId: string;
    leadId?: string | null;
    firstName: string;
    email?: string | null;
    emailConsent: boolean;
    smsConsent: boolean;
    isReturning: boolean;
    returningSource?: string | null;
    mood?: string | null;
    source: string;
    loyaltyPoints?: number;
}

type CustomerOnboardingSignal =
    | {
        type: 'tablet_checkin_captured';
        context: TabletCheckinSignalContext;
    }
    | {
        type: 'review_sequence_tick' | 'manual_retry';
        runId: string;
    };

interface VisitRecord {
    visitId: string;
    orgId: string;
    customerId: string;
    leadId?: string | null;
    firstName?: string | null;
    email?: string | null;
    emailConsent?: boolean;
    smsConsent?: boolean;
    isReturning?: boolean;
    returningSource?: string | null;
    mood?: string | null;
    source?: string | null;
    reviewSequence?: {
        reviewLeft?: boolean;
        reviewLeftAt?: Date | FirebaseFirestore.Timestamp | null;
        checkoutEmailScheduledAt?: Date | FirebaseFirestore.Timestamp | null;
        reviewNudgeScheduledAt?: Date | FirebaseFirestore.Timestamp | null;
        checkoutEmailSentAt?: Date | FirebaseFirestore.Timestamp | null;
        reviewNudgeSentAt?: Date | FirebaseFirestore.Timestamp | null;
    };
}

interface VisitContext {
    ref: FirebaseFirestore.DocumentReference;
    data: VisitRecord;
}

const STEP_KEYS: CustomerOnboardingStepKey[] = [
    'welcome',
    'checkoutEmail',
    'reviewNudge',
    'returningWelcome',
];

const BLOCKED_REASON_PRIORITY: CustomerOnboardingBlockedReason[] = [
    'delivery_failed',
    'welcome_automation_missing',
    'welcome_automation_unassigned',
    'welcome_automation_paused',
    'no_email_consent',
    'missing_email',
];

function normalizeText(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeEmail(value: unknown): string | null {
    const normalized = normalizeText(value);
    return normalized ? normalized.toLowerCase() : null;
}

function toDateValue(value: unknown): Date | null {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return value;
    }
    return firestoreTimestampToDate(value as FirebaseFirestore.Timestamp | Date | null) ?? null;
}

function buildPendingStep(scheduledAt: Date): CustomerOnboardingStepState {
    return {
        status: 'pending',
        scheduledAt,
        nextDueAt: scheduledAt,
        lastAttemptAt: null,
        completedAt: null,
        attemptCount: 0,
        result: null,
        sendId: null,
        reason: null,
        lastError: null,
    };
}

function buildSkippedStep(reason: string, scheduledAt: Date | null): CustomerOnboardingStepState {
    return {
        status: 'skipped',
        scheduledAt,
        nextDueAt: null,
        lastAttemptAt: null,
        completedAt: scheduledAt,
        attemptCount: 0,
        result: 'skipped',
        sendId: null,
        reason,
        lastError: null,
    };
}

function hydrateStep(raw: unknown, fallbackScheduledAt: Date | null): CustomerOnboardingStepState {
    const data = raw && typeof raw === 'object' ? raw as Partial<CustomerOnboardingStepState> : {};
    return {
        status: data.status ?? (fallbackScheduledAt ? 'pending' : 'skipped'),
        scheduledAt: toDateValue(data.scheduledAt) ?? fallbackScheduledAt,
        nextDueAt: toDateValue(data.nextDueAt),
        lastAttemptAt: toDateValue(data.lastAttemptAt),
        completedAt: toDateValue(data.completedAt),
        attemptCount: typeof data.attemptCount === 'number' ? data.attemptCount : 0,
        result: data.result ?? null,
        sendId: normalizeText(data.sendId) ?? null,
        reason: normalizeText(data.reason) ?? null,
        lastError: normalizeText(data.lastError) ?? null,
    };
}

function serializeStep(step: CustomerOnboardingStepState): CustomerOnboardingStepState {
    return {
        ...step,
        scheduledAt: step.scheduledAt ?? null,
        nextDueAt: step.nextDueAt ?? null,
        lastAttemptAt: step.lastAttemptAt ?? null,
        completedAt: step.completedAt ?? null,
        sendId: step.sendId ?? null,
        reason: step.reason ?? null,
        lastError: step.lastError ?? null,
    };
}

function needsEmail(email: string | null, emailConsent: boolean): CustomerOnboardingBlockedReason | null {
    if (!email) {
        return 'missing_email';
    }
    if (!emailConsent) {
        return 'no_email_consent';
    }
    return null;
}

function getWelcomeBlockedReason(
    email: string | null,
    emailConsent: boolean,
    welcomeAutomationState: WelcomeAutomationState | null,
): CustomerOnboardingBlockedReason | null {
    const emailBlock = needsEmail(email, emailConsent);
    if (emailBlock) {
        return emailBlock;
    }

    switch (welcomeAutomationState) {
        case 'active':
            return null;
        case 'paused':
            return 'welcome_automation_paused';
        case 'unassigned':
            return 'welcome_automation_unassigned';
        case 'missing':
        default:
            return 'welcome_automation_missing';
    }
}

function resolveRiskScore(reason: CustomerOnboardingBlockedReason | null): number {
    switch (reason) {
        case 'delivery_failed':
            return 88;
        case 'welcome_automation_missing':
            return 82;
        case 'welcome_automation_unassigned':
        case 'welcome_automation_paused':
            return 70;
        case 'no_email_consent':
            return 55;
        case 'missing_email':
            return 48;
        default:
            return 22;
    }
}

function pickBlockedReason(steps: CustomerOnboardingStepMap): CustomerOnboardingBlockedReason | null {
    for (const reason of BLOCKED_REASON_PRIORITY) {
        const match = STEP_KEYS.find((key) => steps[key].reason === reason);
        if (match) {
            return reason;
        }
    }

    return null;
}

function allStepsSettled(steps: CustomerOnboardingStepMap): boolean {
    return STEP_KEYS.every((key) => {
        const status = steps[key].status;
        return status === 'succeeded' || status === 'skipped';
    });
}

function deriveNextDueStep(steps: CustomerOnboardingStepMap): {
    key: CustomerOnboardingStepKey;
    dueAt: Date;
} | null {
    const pending = STEP_KEYS
        .map((key) => ({ key, dueAt: steps[key].nextDueAt, status: steps[key].status }))
        .filter((entry): entry is { key: CustomerOnboardingStepKey; dueAt: Date; status: CustomerOnboardingStepState['status'] } => (
            entry.status === 'pending' && entry.dueAt instanceof Date
        ))
        .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime());

    return pending[0] ?? null;
}

function describeNextAction(stepKey: CustomerOnboardingStepKey): string {
    switch (stepKey) {
        case 'welcome':
            return 'send_welcome_email';
        case 'checkoutEmail':
            return 'send_checkout_email';
        case 'reviewNudge':
            return 'send_review_nudge';
        case 'returningWelcome':
            return 'queue_returning_welcome';
        default:
            return 'review_onboarding_run';
    }
}

function deriveRunStatus(run: CustomerOnboardingRun): CustomerOnboardingRunStatus {
    if (allStepsSettled(run.steps)) {
        return 'completed';
    }

    if (STEP_KEYS.some((key) => run.steps[key].status === 'processing')) {
        return 'executing';
    }

    if (STEP_KEYS.some((key) => run.steps[key].status === 'failed')) {
        return 'failed';
    }

    if (pickBlockedReason(run.steps)) {
        return 'blocked';
    }

    if (STEP_KEYS.some((key) => run.steps[key].status === 'pending')) {
        return 'scheduled';
    }

    return 'detected';
}

function finalizeRunState(run: CustomerOnboardingRun, now: Date): void {
    run.blockedReason = pickBlockedReason(run.steps);
    run.riskScore = resolveRiskScore(run.blockedReason);
    run.confidenceScore = DEFAULT_CONFIDENCE_SCORE;

    const nextDue = deriveNextDueStep(run.steps);
    run.nextAction = nextDue ? describeNextAction(nextDue.key) : (run.blockedReason ? 'operator_review' : null);
    run.nextActionDueAt = nextDue?.dueAt ?? null;
    run.status = deriveRunStatus(run);
    run.updatedAt = now;
    run.lastEvaluatedAt = now;
    run.completedAt = run.status === 'completed' ? now : null;
}

function getDispensaryName(orgId: string): string {
    const names: Record<string, string> = {
        org_thrive_syracuse: 'Thrive Syracuse',
    };
    return names[orgId] ?? orgId;
}

function checkoutEmailHtml(firstName: string, orgId: string): string {
    const dispensaryName = getDispensaryName(orgId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bakedbot.ai';
    const brandSlug = orgId.replace(/^org_/, '').replace(/_/g, '');

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
        <tr><td style="background:#1a472a;padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">${dispensaryName}</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Your trusted cannabis dispensary</p>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:20px">Thanks for stopping by, ${firstName}! 🌿</h2>
          <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6">
            It was great seeing you in-store today. We hope we found something perfect for you!
          </p>
          <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6">
            As a loyalty member, you earn points on every purchase. Check your balance and explore
            exclusive member deals on your next visit.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:28px 0">
            <tr><td style="background:#1a472a;border-radius:8px;padding:14px 28px">
              <a href="${appUrl}/${brandSlug}/rewards" style="color:#fff;font-size:15px;font-weight:600;text-decoration:none">
                View Your Loyalty Rewards →
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#888;font-size:13px">
            See you again soon! — The ${dispensaryName} team
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #eee">
          <p style="margin:0;color:#aaa;font-size:12px;line-height:1.5">
            You're receiving this because you checked in at ${dispensaryName}.
            Reply to unsubscribe at any time.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function reviewNudgeEmailHtml(firstName: string, orgId: string, visitId: string): string {
    const dispensaryName = getDispensaryName(orgId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bakedbot.ai';
    const reviewUrl = `${appUrl}/review?orgId=${encodeURIComponent(orgId)}&visitId=${encodeURIComponent(visitId)}`;

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
        <tr><td style="background:#1a472a;padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">${dispensaryName}</h1>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:20px">How was your experience, ${firstName}? 🌟</h2>
          <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6">
            We loved having you in-store a few days ago! Your feedback helps other customers
            shopping at ${dispensaryName} — and means the world to our team.
          </p>
          <p style="margin:0 0 4px;color:#555;font-size:15px;line-height:1.6">
            Could you spare 30 seconds to rate your visit?
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:28px 0">
            <tr><td style="background:#1a472a;border-radius:8px;padding:14px 28px">
              <a href="${reviewUrl}" style="color:#fff;font-size:15px;font-weight:600;text-decoration:none">
                ⭐ Rate Your Visit →
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#888;font-size:13px">
            Thank you for your support! — The ${dispensaryName} team
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #eee">
          <p style="margin:0;color:#aaa;font-size:12px;line-height:1.5">
            You're receiving this because you checked in at ${dispensaryName}.
            Reply to unsubscribe at any time.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function createBaseRun(context: TabletCheckinSignalContext, visit: VisitRecord, now: Date): CustomerOnboardingRun {
    const reviewNudgeAt = new Date(now.getTime() + REVIEW_NUDGE_DELAY_MS);
    const email = normalizeEmail(context.email ?? visit.email);
    const reviewLeft = Boolean(visit.reviewSequence?.reviewLeft);

    return {
        id: context.visitId,
        orgId: context.orgId,
        customerId: context.customerId,
        visitId: context.visitId,
        leadId: normalizeText(context.leadId) ?? null,
        entryPoint: 'tablet_checkin',
        source: context.source,
        firstName: context.firstName,
        email,
        emailConsent: context.emailConsent,
        smsConsent: context.smsConsent,
        isReturning: context.isReturning,
        returningSource: normalizeText(context.returningSource) ?? null,
        mood: normalizeText(context.mood) ?? null,
        loyaltyPoints: typeof context.loyaltyPoints === 'number' ? context.loyaltyPoints : 0,
        welcomeAutomationState: null,
        status: 'detected',
        blockedReason: null,
        riskScore: resolveRiskScore(null),
        confidenceScore: DEFAULT_CONFIDENCE_SCORE,
        evidenceRefs: [
            `checkin_visit:${context.visitId}`,
            `customer:${context.customerId}`,
            ...(context.leadId ? [`lead:${context.leadId}`] : []),
        ],
        nextAction: 'review_onboarding_run',
        nextActionDueAt: now,
        reviewLeft,
        reviewLeftAt: toDateValue(visit.reviewSequence?.reviewLeftAt),
        proactiveTaskId: null,
        steps: {
            welcome: context.isReturning
                ? buildSkippedStep('returning_customer', now)
                : buildPendingStep(now),
            checkoutEmail: buildPendingStep(now),
            reviewNudge: reviewLeft
                ? buildSkippedStep('review_already_left', reviewNudgeAt)
                : buildPendingStep(reviewNudgeAt),
            returningWelcome: context.isReturning
                ? buildPendingStep(now)
                : buildSkippedStep('new_customer', now),
        },
        lastProcessedSignal: null,
        lastEvaluatedAt: now,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
    };
}

function hydrateRun(raw: Record<string, unknown>): CustomerOnboardingRun {
    const createdAt = toDateValue(raw.createdAt) ?? new Date();
    const stepsRaw = raw.steps && typeof raw.steps === 'object' ? raw.steps as Record<string, unknown> : {};

    return {
        id: normalizeText(raw.id) ?? '',
        orgId: normalizeText(raw.orgId) ?? '',
        customerId: normalizeText(raw.customerId) ?? '',
        visitId: normalizeText(raw.visitId) ?? '',
        leadId: normalizeText(raw.leadId) ?? null,
        entryPoint: 'tablet_checkin',
        source: normalizeText(raw.source) ?? 'loyalty_tablet_checkin',
        firstName: normalizeText(raw.firstName) ?? 'there',
        email: normalizeEmail(raw.email),
        emailConsent: Boolean(raw.emailConsent),
        smsConsent: Boolean(raw.smsConsent),
        isReturning: Boolean(raw.isReturning),
        returningSource: normalizeText(raw.returningSource) ?? null,
        mood: normalizeText(raw.mood) ?? null,
        loyaltyPoints: typeof raw.loyaltyPoints === 'number' ? raw.loyaltyPoints : 0,
        welcomeAutomationState: (normalizeText(raw.welcomeAutomationState) as WelcomeAutomationState | null) ?? null,
        status: (normalizeText(raw.status) as CustomerOnboardingRunStatus | null) ?? 'detected',
        blockedReason: (normalizeText(raw.blockedReason) as CustomerOnboardingBlockedReason | null) ?? null,
        riskScore: typeof raw.riskScore === 'number' ? raw.riskScore : resolveRiskScore(null),
        confidenceScore: typeof raw.confidenceScore === 'number' ? raw.confidenceScore : DEFAULT_CONFIDENCE_SCORE,
        evidenceRefs: Array.isArray(raw.evidenceRefs) ? raw.evidenceRefs.filter((value): value is string => typeof value === 'string') : [],
        nextAction: normalizeText(raw.nextAction) ?? null,
        nextActionDueAt: toDateValue(raw.nextActionDueAt),
        reviewLeft: Boolean(raw.reviewLeft),
        reviewLeftAt: toDateValue(raw.reviewLeftAt),
        proactiveTaskId: normalizeText(raw.proactiveTaskId) ?? null,
        steps: {
            welcome: hydrateStep(stepsRaw.welcome, createdAt),
            checkoutEmail: hydrateStep(stepsRaw.checkoutEmail, createdAt),
            reviewNudge: hydrateStep(stepsRaw.reviewNudge, new Date(createdAt.getTime() + REVIEW_NUDGE_DELAY_MS)),
            returningWelcome: hydrateStep(stepsRaw.returningWelcome, createdAt),
        },
        lastProcessedSignal: (normalizeText(raw.lastProcessedSignal) as CustomerOnboardingSignalType | null) ?? null,
        lastEvaluatedAt: toDateValue(raw.lastEvaluatedAt),
        createdAt,
        updatedAt: toDateValue(raw.updatedAt) ?? createdAt,
        completedAt: toDateValue(raw.completedAt),
    };
}

function serializeRun(run: CustomerOnboardingRun): CustomerOnboardingRun {
    return {
        ...run,
        welcomeAutomationState: run.welcomeAutomationState ?? null,
        email: run.email ?? null,
        returningSource: run.returningSource ?? null,
        mood: run.mood ?? null,
        blockedReason: run.blockedReason ?? null,
        nextAction: run.nextAction ?? null,
        nextActionDueAt: run.nextActionDueAt ?? null,
        reviewLeftAt: run.reviewLeftAt ?? null,
        proactiveTaskId: run.proactiveTaskId ?? null,
        lastProcessedSignal: run.lastProcessedSignal ?? null,
        lastEvaluatedAt: run.lastEvaluatedAt ?? null,
        completedAt: run.completedAt ?? null,
        steps: {
            welcome: serializeStep(run.steps.welcome),
            checkoutEmail: serializeStep(run.steps.checkoutEmail),
            reviewNudge: serializeStep(run.steps.reviewNudge),
            returningWelcome: serializeStep(run.steps.returningWelcome),
        },
    };
}

async function loadVisitContext(visitId: string): Promise<VisitContext> {
    const db = getAdminFirestore();
    const ref = db.collection('checkin_visits').doc(visitId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new Error(`Check-in visit ${visitId} not found`);
    }

    return {
        ref,
        data: snap.data() as VisitRecord,
    };
}

async function loadRun(runId: string): Promise<CustomerOnboardingRun | null> {
    const db = getAdminFirestore();
    const snap = await db.collection(CUSTOMER_ONBOARDING_RUNS_COLLECTION).doc(runId).get();
    if (!snap.exists) {
        return null;
    }
    return hydrateRun(snap.data() as Record<string, unknown>);
}

async function persistRun(run: CustomerOnboardingRun): Promise<void> {
    const db = getAdminFirestore();
    await db.collection(CUSTOMER_ONBOARDING_RUNS_COLLECTION).doc(run.id).set(serializeRun(run), { merge: true });
}

function deriveLegacyReviewSequenceStatus(run: CustomerOnboardingRun): string {
    if (run.status === 'failed') {
        return 'failed';
    }

    if (run.blockedReason === 'missing_email' || run.blockedReason === 'no_email_consent') {
        return 'skipped_no_email';
    }

    if (run.status === 'completed') {
        return 'complete';
    }

    if (run.status === 'blocked') {
        return 'blocked';
    }

    return 'pending';
}

async function syncLegacyReviewSequence(run: CustomerOnboardingRun, visit: VisitContext): Promise<void> {
    const checkoutScheduledAt = run.steps.checkoutEmail.scheduledAt ?? run.createdAt;
    const reviewNudgeScheduledAt = run.steps.reviewNudge.scheduledAt ?? new Date(run.createdAt.getTime() + REVIEW_NUDGE_DELAY_MS);
    const existingReviewSequence = visit.data.reviewSequence ?? {};

    await visit.ref.set({
        reviewSequence: {
            ...existingReviewSequence,
            status: deriveLegacyReviewSequenceStatus(run),
            onboardingRunId: run.id,
            blockedReason: run.blockedReason ?? null,
            checkoutEmailScheduledAt: checkoutScheduledAt,
            reviewNudgeScheduledAt,
            checkoutEmailSentAt: run.steps.checkoutEmail.completedAt ?? toDateValue(existingReviewSequence.checkoutEmailSentAt),
            reviewNudgeSentAt: run.steps.reviewNudge.completedAt ?? toDateValue(existingReviewSequence.reviewNudgeSentAt),
            reviewLeft: run.reviewLeft,
            reviewLeftAt: run.reviewLeftAt,
        },
    }, { merge: true });
}

function setStepPending(step: CustomerOnboardingStepState, dueAt: Date): void {
    step.status = 'pending';
    step.scheduledAt = step.scheduledAt ?? dueAt;
    step.nextDueAt = dueAt;
    step.completedAt = null;
    step.result = null;
    step.reason = null;
    step.lastError = null;
    step.sendId = null;
}

function setStepBlocked(step: CustomerOnboardingStepState, reason: CustomerOnboardingBlockedReason): void {
    step.status = 'blocked';
    step.nextDueAt = null;
    step.completedAt = null;
    step.result = 'blocked';
    step.reason = reason;
    step.lastError = null;
    step.sendId = null;
}

function setStepSkipped(step: CustomerOnboardingStepState, reason: string, completedAt: Date): void {
    step.status = 'skipped';
    step.nextDueAt = null;
    step.completedAt = completedAt;
    step.result = 'skipped';
    step.reason = reason;
    step.lastError = null;
}

async function refreshRunContext(run: CustomerOnboardingRun, visit: VisitContext, now: Date): Promise<void> {
    run.email = normalizeEmail(visit.data.email ?? run.email);
    run.emailConsent = Boolean(visit.data.emailConsent ?? run.emailConsent);
    run.smsConsent = Boolean(visit.data.smsConsent ?? run.smsConsent);
    run.reviewLeft = Boolean(visit.data.reviewSequence?.reviewLeft ?? run.reviewLeft);
    run.reviewLeftAt = toDateValue(visit.data.reviewSequence?.reviewLeftAt) ?? run.reviewLeftAt;
    run.firstName = normalizeText(visit.data.firstName) ?? run.firstName;
    run.source = normalizeText(visit.data.source) ?? run.source;
    run.mood = normalizeText(visit.data.mood) ?? run.mood;
    run.returningSource = normalizeText(visit.data.returningSource) ?? run.returningSource;
    run.isReturning = Boolean(visit.data.isReturning ?? run.isReturning);

    if (!run.isReturning) {
        const automation = await getWelcomeAutomationState(run.orgId);
        run.welcomeAutomationState = automation.state;
        const welcomeBlockedReason = getWelcomeBlockedReason(run.email, run.emailConsent, automation.state);
        if (run.steps.welcome.status !== 'succeeded' && run.steps.welcome.status !== 'skipped') {
            if (welcomeBlockedReason) {
                setStepBlocked(run.steps.welcome, welcomeBlockedReason);
            } else if (run.steps.welcome.status === 'blocked' || run.steps.welcome.status === 'failed') {
                setStepPending(run.steps.welcome, now);
            }
        }
    } else {
        run.welcomeAutomationState = null;
        if (run.steps.welcome.status !== 'succeeded') {
            setStepSkipped(run.steps.welcome, 'returning_customer', now);
        }
    }

    const emailBlockedReason = needsEmail(run.email, run.emailConsent);
    for (const key of ['checkoutEmail', 'reviewNudge'] as const) {
        const step = run.steps[key];
        if (step.status === 'succeeded') {
            continue;
        }

        if (key === 'reviewNudge' && run.reviewLeft) {
            setStepSkipped(step, 'review_already_left', run.reviewLeftAt ?? now);
            continue;
        }

        if (emailBlockedReason) {
            setStepBlocked(step, emailBlockedReason);
            continue;
        }

        if (step.status === 'blocked' || step.status === 'failed') {
            const defaultDueAt = key === 'checkoutEmail'
                ? (step.scheduledAt ?? run.createdAt)
                : (step.scheduledAt ?? new Date(run.createdAt.getTime() + REVIEW_NUDGE_DELAY_MS));
            setStepPending(step, step.nextDueAt ?? defaultDueAt);
        }
    }

    if (run.isReturning) {
        const returningBlockedReason = needsEmail(run.email, run.emailConsent);
        if (run.steps.returningWelcome.status !== 'succeeded') {
            if (returningBlockedReason) {
                setStepBlocked(run.steps.returningWelcome, returningBlockedReason);
            } else if (run.steps.returningWelcome.status === 'blocked' || run.steps.returningWelcome.status === 'failed') {
                setStepPending(run.steps.returningWelcome, run.steps.returningWelcome.scheduledAt ?? run.createdAt);
            }
        }
    } else if (run.steps.returningWelcome.status !== 'succeeded') {
        setStepSkipped(run.steps.returningWelcome, 'new_customer', now);
    }
}

function shouldAttemptStep(
    step: CustomerOnboardingStepState,
    now: Date,
    signalType: CustomerOnboardingSignalType,
): boolean {
    if (signalType === 'manual_retry') {
        return step.status === 'pending' || step.status === 'failed';
    }

    if (step.status === 'pending') {
        return !!step.nextDueAt && step.nextDueAt <= now;
    }

    return step.status === 'failed' && !!step.nextDueAt && step.nextDueAt <= now;
}

function beginStepAttempt(step: CustomerOnboardingStepState, now: Date): void {
    step.status = 'processing';
    step.lastAttemptAt = now;
    step.attemptCount += 1;
    step.lastError = null;
}

function markStepSuccess(
    step: CustomerOnboardingStepState,
    now: Date,
    result: CustomerOnboardingStepState['result'],
    sendId?: string | null,
): void {
    step.status = 'succeeded';
    step.completedAt = now;
    step.nextDueAt = null;
    step.result = result;
    step.reason = null;
    step.lastError = null;
    step.sendId = sendId ?? null;
}

function markStepFailure(step: CustomerOnboardingStepState, now: Date, message: string): void {
    step.status = 'failed';
    step.completedAt = null;
    step.nextDueAt = new Date(now.getTime() + FAILURE_RETRY_DELAY_MS);
    step.result = 'failed';
    step.reason = 'delivery_failed';
    step.lastError = message;
    step.sendId = null;
}

async function maybeQueueReturningWelcome(run: CustomerOnboardingRun, now: Date): Promise<{ success: boolean; sendId?: string; error?: string }> {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const db = getAdminFirestore();
    const existing = await db
        .collection('customer_communications')
        .where('customerId', '==', run.customerId)
        .where('type', '==', 'returning_welcome_email')
        .where('sentAt', '>=', startOfDay)
        .limit(1)
        .get();

    if (!existing.empty) {
        return { success: true };
    }

    const result = await queueReturningWelcomeEmail({
        customerId: run.customerId,
        email: run.email ?? '',
        firstName: run.firstName || 'there',
        orgId: run.orgId,
        mood: run.mood ?? undefined,
        visitId: run.visitId,
        loyaltyPoints: run.loyaltyPoints,
    });

    return {
        success: result.success,
        sendId: result.jobId,
        error: result.error,
    };
}

async function processRunSteps(
    run: CustomerOnboardingRun,
    visit: VisitContext,
    signalType: CustomerOnboardingSignalType,
    now: Date,
): Promise<void> {
    const persistProgress = async () => {
        finalizeRunState(run, now);
        await persistRun(run);
        await syncLegacyReviewSequence(run, visit);
    };

    if (shouldAttemptStep(run.steps.welcome, now, signalType)) {
        beginStepAttempt(run.steps.welcome, now);
        await persistProgress();

        const result = await sendWelcomeEmail({
            leadId: run.leadId ?? run.visitId,
            email: run.email ?? '',
            firstName: run.firstName,
            dispensaryId: run.orgId,
            source: run.source,
        });

        if (result.success) {
            markStepSuccess(run.steps.welcome, now, 'sent');
        } else {
            markStepFailure(run.steps.welcome, now, result.error ?? 'Failed to send welcome email');
        }

        await persistProgress();
    }

    if (shouldAttemptStep(run.steps.returningWelcome, now, signalType)) {
        beginStepAttempt(run.steps.returningWelcome, now);
        await persistProgress();

        const result = await maybeQueueReturningWelcome(run, now);
        if (result.success) {
            markStepSuccess(run.steps.returningWelcome, now, 'queued', result.sendId ?? null);
        } else {
            markStepFailure(run.steps.returningWelcome, now, result.error ?? 'Failed to queue returning welcome email');
        }

        await persistProgress();
    }

    if (shouldAttemptStep(run.steps.checkoutEmail, now, signalType)) {
        beginStepAttempt(run.steps.checkoutEmail, now);
        await persistProgress();

        const result = await sendGenericEmail({
            to: run.email ?? '',
            name: run.firstName,
            subject: `Thanks for visiting ${getDispensaryName(run.orgId)}! 🌿`,
            htmlBody: checkoutEmailHtml(run.firstName, run.orgId),
            orgId: run.orgId,
            communicationType: 'transactional',
            agentName: 'loyalty-tablet',
        });

        if (result.success) {
            markStepSuccess(run.steps.checkoutEmail, now, 'sent');
        } else {
            markStepFailure(run.steps.checkoutEmail, now, result.error ?? 'Failed to send checkout email');
        }

        await persistProgress();
    }

    if (shouldAttemptStep(run.steps.reviewNudge, now, signalType)) {
        beginStepAttempt(run.steps.reviewNudge, now);
        await persistProgress();

        const result = await sendGenericEmail({
            to: run.email ?? '',
            name: run.firstName,
            subject: `How was your visit to ${getDispensaryName(run.orgId)}? Rate your experience 🌟`,
            htmlBody: reviewNudgeEmailHtml(run.firstName, run.orgId, run.visitId),
            orgId: run.orgId,
            communicationType: 'transactional',
            agentName: 'loyalty-tablet',
        });

        if (result.success) {
            markStepSuccess(run.steps.reviewNudge, now, 'sent');
        } else {
            markStepFailure(run.steps.reviewNudge, now, result.error ?? 'Failed to send review nudge');
        }

        await persistProgress();
    }
}

function mergeVisitContextIntoSignal(
    signalContext: TabletCheckinSignalContext,
    visit: VisitRecord,
): TabletCheckinSignalContext {
    return {
        ...signalContext,
        leadId: normalizeText(signalContext.leadId) ?? normalizeText(visit.leadId) ?? null,
        firstName: normalizeText(visit.firstName) ?? signalContext.firstName,
        email: normalizeEmail(visit.email ?? signalContext.email),
        emailConsent: Boolean(visit.emailConsent ?? signalContext.emailConsent),
        smsConsent: Boolean(visit.smsConsent ?? signalContext.smsConsent),
        isReturning: Boolean(visit.isReturning ?? signalContext.isReturning),
        returningSource: normalizeText(visit.returningSource) ?? normalizeText(signalContext.returningSource) ?? null,
        mood: normalizeText(visit.mood) ?? normalizeText(signalContext.mood) ?? null,
        source: normalizeText(visit.source) ?? signalContext.source,
    };
}

async function upsertRunForTabletCheckin(
    context: TabletCheckinSignalContext,
    now: Date,
): Promise<{ run: CustomerOnboardingRun; visit: VisitContext }> {
    const visit = await loadVisitContext(context.visitId);
    const mergedContext = mergeVisitContextIntoSignal(context, visit.data);
    const existingRun = await loadRun(context.visitId);
    const run = existingRun ?? createBaseRun(mergedContext, visit.data, now);

    run.orgId = mergedContext.orgId;
    run.customerId = mergedContext.customerId;
    run.visitId = mergedContext.visitId;
    run.leadId = normalizeText(mergedContext.leadId) ?? run.leadId;
    run.firstName = mergedContext.firstName;
    run.email = normalizeEmail(mergedContext.email);
    run.emailConsent = mergedContext.emailConsent;
    run.smsConsent = mergedContext.smsConsent;
    run.isReturning = mergedContext.isReturning;
    run.returningSource = normalizeText(mergedContext.returningSource) ?? null;
    run.mood = normalizeText(mergedContext.mood) ?? null;
    run.source = mergedContext.source;
    run.loyaltyPoints = typeof mergedContext.loyaltyPoints === 'number' ? mergedContext.loyaltyPoints : run.loyaltyPoints;
    run.lastProcessedSignal = 'tablet_checkin_captured';

    await refreshRunContext(run, visit, now);
    finalizeRunState(run, now);
    await persistRun(run);
    await syncLegacyReviewSequence(run, visit);

    return { run, visit };
}

async function syncGapIfNeeded(run: CustomerOnboardingRun): Promise<void> {
    if (run.status !== 'blocked' && run.status !== 'failed') {
        return;
    }

    const reason = run.blockedReason ?? 'delivery_failed';
    const result = await syncCustomerOnboardingRunGap({
        orgId: run.orgId,
        runId: run.id,
        visitId: run.visitId,
        customerId: run.customerId,
        leadId: run.leadId,
        customerName: run.firstName,
        email: run.email,
        blockedReason: reason,
        welcomeAutomationState: run.welcomeAutomationState,
        nextAction: run.nextAction,
    });

    if (result.success && result.taskId) {
        run.proactiveTaskId = result.taskId;
        run.evidenceRefs = Array.from(new Set([...run.evidenceRefs, `proactive_task:${result.taskId}`]));
        await persistRun(run);
    }
}

export async function listDueCustomerOnboardingRunIds(limit = 50, now = new Date()): Promise<string[]> {
    const db = getAdminFirestore();
    const snapshot = await db
        .collection(CUSTOMER_ONBOARDING_RUNS_COLLECTION)
        .where('nextActionDueAt', '<=', now)
        .limit(limit)
        .get();

    return snapshot.docs.map((doc) => doc.id);
}

export async function getCustomerOnboardingStatusSummary(orgId: string): Promise<CustomerOnboardingStatusSummary> {
    const db = getAdminFirestore();
    const snapshot = await db
        .collection(CUSTOMER_ONBOARDING_RUNS_COLLECTION)
        .where('orgId', '==', orgId)
        .get();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let pending = 0;
    let blocked = 0;
    let failed = 0;
    let completedToday = 0;

    snapshot.docs.forEach((doc) => {
        const run = hydrateRun(doc.data() as Record<string, unknown>);
        if (run.status === 'blocked') {
            blocked += 1;
        } else if (run.status === 'failed') {
            failed += 1;
        } else if (run.status === 'completed') {
            if (run.completedAt && run.completedAt >= today) {
                completedToday += 1;
            }
        } else if (run.status === 'detected' || run.status === 'scheduled' || run.status === 'executing') {
            pending += 1;
        }
    });

    return { pending, blocked, failed, completedToday };
}

export async function handleCustomerOnboardingSignal(signal: CustomerOnboardingSignal): Promise<{
    success: boolean;
    runId?: string;
    status?: CustomerOnboardingRunStatus;
    error?: string;
}> {
    const now = new Date();

    try {
        if (signal.type === 'tablet_checkin_captured') {
            const { run, visit } = await upsertRunForTabletCheckin(signal.context, now);
            await processRunSteps(run, visit, signal.type, now);
            finalizeRunState(run, now);
            run.lastProcessedSignal = signal.type;
            await persistRun(run);
            await syncLegacyReviewSequence(run, visit);
            await syncGapIfNeeded(run);

            return { success: true, runId: run.id, status: run.status };
        }

        const existingRun = await loadRun(signal.runId);
        if (!existingRun) {
            return { success: false, error: `Customer onboarding run ${signal.runId} not found` };
        }

        const visit = await loadVisitContext(existingRun.visitId);
        existingRun.lastProcessedSignal = signal.type;
        await refreshRunContext(existingRun, visit, now);
        finalizeRunState(existingRun, now);
        await persistRun(existingRun);
        await syncLegacyReviewSequence(existingRun, visit);

        await processRunSteps(existingRun, visit, signal.type, now);
        finalizeRunState(existingRun, now);
        await persistRun(existingRun);
        await syncLegacyReviewSequence(existingRun, visit);
        await syncGapIfNeeded(existingRun);

        return { success: true, runId: existingRun.id, status: existingRun.status };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[CustomerOnboarding] Failed to handle signal', {
            signalType: signal.type,
            runId: 'runId' in signal ? signal.runId : signal.context.visitId,
            error: message,
        });
        return { success: false, error: message };
    }
}
