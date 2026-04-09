import type { WelcomeAutomationState } from '@/server/services/customer-signup-proactive';

export const CUSTOMER_ONBOARDING_RUNS_COLLECTION = 'customer_onboarding_runs';

export type CustomerOnboardingRunStatus =
    | 'detected'
    | 'scheduled'
    | 'executing'
    | 'blocked'
    | 'failed'
    | 'completed';

export type CustomerOnboardingSignalType =
    | 'tablet_checkin_captured'
    | 'review_sequence_tick'
    | 'manual_retry';

export type CustomerOnboardingStepKey =
    | 'welcome'
    | 'checkoutEmail'
    | 'reviewNudge'
    | 'returningWelcome';

export type CustomerOnboardingStepStatus =
    | 'pending'
    | 'processing'
    | 'succeeded'
    | 'skipped'
    | 'blocked'
    | 'failed';

export type CustomerOnboardingBlockedReason =
    | 'missing_email'
    | 'no_email_consent'
    | 'welcome_automation_paused'
    | 'welcome_automation_unassigned'
    | 'welcome_automation_missing'
    | 'delivery_failed';

export interface CustomerOnboardingStepState {
    status: CustomerOnboardingStepStatus;
    scheduledAt: Date | null;
    nextDueAt: Date | null;
    lastAttemptAt: Date | null;
    completedAt: Date | null;
    attemptCount: number;
    result: 'queued' | 'sent' | 'skipped' | 'blocked' | 'failed' | null;
    sendId: string | null;
    reason: string | null;
    lastError: string | null;
}

export interface CustomerOnboardingRunSteps {
    welcome: CustomerOnboardingStepState;
    checkoutEmail: CustomerOnboardingStepState;
    reviewNudge: CustomerOnboardingStepState;
    returningWelcome: CustomerOnboardingStepState;
}

export interface CustomerOnboardingRun {
    id: string;
    orgId: string;
    customerId: string;
    visitId: string;
    leadId: string | null;
    entryPoint: 'tablet_checkin';
    source: string;
    firstName: string;
    email: string | null;
    emailConsent: boolean;
    smsConsent: boolean;
    isReturning: boolean;
    returningSource: string | null;
    mood: string | null;
    loyaltyPoints: number;
    welcomeAutomationState: WelcomeAutomationState | null;
    status: CustomerOnboardingRunStatus;
    blockedReason: CustomerOnboardingBlockedReason | null;
    riskScore: number;
    confidenceScore: number;
    evidenceRefs: string[];
    nextAction: string | null;
    nextActionDueAt: Date | null;
    reviewLeft: boolean;
    reviewLeftAt: Date | null;
    proactiveTaskId: string | null;
    steps: CustomerOnboardingRunSteps;
    lastProcessedSignal: CustomerOnboardingSignalType | null;
    lastEvaluatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
}

export interface CustomerOnboardingStatusSummary {
    pending: number;
    blocked: number;
    failed: number;
    completedToday: number;
}
