export const COMPETITIVE_INTEL_ACTIVATION_RUNS_COLLECTION = 'competitive_intel_activation_runs';

export type CompetitiveIntelActivationStatus =
  | 'pending'
  | 'blocked'
  | 'failed'
  | 'completed';

export type CompetitiveIntelActivationEntryPoint =
  | 'setup_checklist'
  | 'competitive_intel_page'
  | 'cron';

export type CompetitiveIntelActivationBlockedReason =
  | 'missing_competitors'
  | 'missing_admin_email'
  | 'slack_not_supported'
  | 'report_generation_failed'
  | 'email_delivery_failed'
  | 'slack_delivery_failed';

export type CompetitiveIntelActivationStepStatus =
  | 'pending'
  | 'active'
  | 'blocked'
  | 'failed';

export interface CompetitiveIntelActivationStepState {
  enabled: boolean;
  status: CompetitiveIntelActivationStepStatus;
  target: string | null;
  lastAttemptAt: Date | null;
  lastDeliveredAt: Date | null;
  lastReportId: string | null;
  lastError: string | null;
  blockedReason: CompetitiveIntelActivationBlockedReason | null;
}

export interface CompetitiveIntelActivationRun {
  id: string;
  orgId: string;
  entryPoint: CompetitiveIntelActivationEntryPoint;
  status: CompetitiveIntelActivationStatus;
  competitorCount: number;
  blockedReason: CompetitiveIntelActivationBlockedReason | null;
  nextAction: string | null;
  evidenceRefs: string[];
  slackPersona: 'elroy' | null;
  slackChannel: string | null;
  steps: {
    report: CompetitiveIntelActivationStepState;
    email: CompetitiveIntelActivationStepState;
    slack: CompetitiveIntelActivationStepState;
  };
  activatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
