import { getAdminFirestore } from '@/firebase/admin';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { logger } from '@/lib/logger';
import { autoSetupCompetitors } from './auto-competitor';
import { SlackService, elroySlackService } from './communications/slack';
import {
  COMPETITIVE_INTEL_ACTIVATION_RUNS_COLLECTION,
  type CompetitiveIntelActivationBlockedReason,
  type CompetitiveIntelActivationEntryPoint,
  type CompetitiveIntelActivationRun,
  type CompetitiveIntelActivationStatus,
  type CompetitiveIntelActivationStepState,
} from '@/types/competitive-intel-activation';

const THRIVE_SYRACUSE_ORG_ID = 'org_thrive_syracuse';
const THRIVE_SYRACUSE_SLACK_CHANNEL = '#thrive-syracuse-pilot';
const DAILY_REPORT_TARGET = 'daily_competitive_intelligence_report';

interface CompetitiveIntelDeliveryReport {
  generatedAt?: Date;
  weekStart?: Date;
  competitors?: Array<{
    competitorName?: string;
    dealCount?: number;
    priceStrategy?: string;
  }>;
  insights?: {
    marketTrends?: string[];
    recommendations?: string[];
    topDeals?: Array<{
      competitorName?: string;
      dealName?: string;
      price?: number;
      discount?: string;
    }>;
  };
}

interface ActivationContext {
  competitorCount: number;
  adminEmail: string | null;
  slackSupported: boolean;
  slackPersona: 'elroy' | null;
  slackChannel: string | null;
}

interface SyncOptions {
  entryPoint?: CompetitiveIntelActivationEntryPoint;
  enableReport?: boolean;
  enableEmail?: boolean;
  enableSlack?: boolean;
}

interface DeliveryUpdate {
  target?: string | null;
  lastAttemptAt?: Date | null;
  lastDeliveredAt?: Date | null;
  lastReportId?: string | null;
  lastError?: string | null;
  status?: CompetitiveIntelActivationStepState['status'];
  blockedReason?: CompetitiveIntelActivationBlockedReason | null;
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeEmail(value: unknown): string | null {
  const email = normalizeText(value);
  return email ? email.toLowerCase() : null;
}

function pickFirstString(...values: Array<unknown>): string | null {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function toDateValue(value: unknown): Date | null {
  return firestoreTimestampToDate(value);
}

function buildStep(
  overrides?: Partial<CompetitiveIntelActivationStepState>,
): CompetitiveIntelActivationStepState {
  return {
    enabled: overrides?.enabled ?? false,
    status: overrides?.status ?? 'pending',
    target: overrides?.target ?? null,
    lastAttemptAt: overrides?.lastAttemptAt ?? null,
    lastDeliveredAt: overrides?.lastDeliveredAt ?? null,
    lastReportId: overrides?.lastReportId ?? null,
    lastError: overrides?.lastError ?? null,
    blockedReason: overrides?.blockedReason ?? null,
  };
}

function hydrateStep(raw: unknown): CompetitiveIntelActivationStepState {
  const data =
    raw && typeof raw === 'object'
      ? (raw as Partial<CompetitiveIntelActivationStepState>)
      : {};

  return buildStep({
    enabled: data.enabled ?? false,
    status: data.status ?? 'pending',
    target: normalizeText(data.target) ?? null,
    lastAttemptAt: toDateValue(data.lastAttemptAt),
    lastDeliveredAt: toDateValue(data.lastDeliveredAt),
    lastReportId: normalizeText(data.lastReportId) ?? null,
    lastError: normalizeText(data.lastError) ?? null,
    blockedReason: data.blockedReason ?? null,
  });
}

function cloneStep(step: CompetitiveIntelActivationStepState): CompetitiveIntelActivationStepState {
  return buildStep({
    ...step,
    lastAttemptAt: step.lastAttemptAt ? new Date(step.lastAttemptAt) : null,
    lastDeliveredAt: step.lastDeliveredAt ? new Date(step.lastDeliveredAt) : null,
  });
}

function getBlockedReasonPriority(): CompetitiveIntelActivationBlockedReason[] {
  return [
    'missing_competitors',
    'missing_admin_email',
    'slack_not_supported',
    'report_generation_failed',
    'email_delivery_failed',
    'slack_delivery_failed',
  ];
}

function pickBlockedReason(
  steps: CompetitiveIntelActivationRun['steps'],
): CompetitiveIntelActivationBlockedReason | null {
  const reasons = getBlockedReasonPriority();

  for (const reason of reasons) {
    if (
      steps.report.blockedReason === reason ||
      steps.email.blockedReason === reason ||
      steps.slack.blockedReason === reason
    ) {
      return reason;
    }
  }

  return null;
}

function describeNextAction(
  blockedReason: CompetitiveIntelActivationBlockedReason | null,
  context: ActivationContext,
): string | null {
  switch (blockedReason) {
    case 'missing_competitors':
      return 'Add or auto-discover competitors so Ezal has a market to monitor.';
    case 'missing_admin_email':
      return 'Add an owner or admin email so the daily report has a delivery target.';
    case 'slack_not_supported':
      return 'Slack delivery is only enabled for the Thrive Syracuse Uncle Elroy pilot right now.';
    case 'report_generation_failed':
      return 'Retry the report run and inspect the Ezal source refresh logs for the failed discovery.';
    case 'email_delivery_failed':
      return 'Review email delivery settings and retry the competitive intelligence report.';
    case 'slack_delivery_failed':
      return 'Confirm the Uncle Elroy Slack bot is in the Thrive pilot channel, then retry the report.';
    default:
      if (context.competitorCount === 0) {
        return 'Track at least one competitor to turn on daily market intelligence.';
      }
      return 'Turn on the daily competitive report and let Ezal deliver the first run.';
  }
}

function buildEvidenceRefs(context: ActivationContext): string[] {
  const refs = [`competitors:${context.competitorCount}`];

  if (context.adminEmail) {
    refs.push(`admin_email:${context.adminEmail}`);
  }

  if (context.slackChannel) {
    refs.push(`slack_channel:${context.slackChannel}`);
  }

  return refs;
}

function deriveStatus(run: CompetitiveIntelActivationRun): CompetitiveIntelActivationStatus {
  if (run.steps.report.enabled && run.steps.report.status === 'failed') {
    return 'failed';
  }

  const enabledDeliverySteps = [run.steps.email, run.steps.slack].filter((step) => step.enabled);

  if (enabledDeliverySteps.some((step) => step.status === 'failed')) {
    return 'failed';
  }

  if (
    run.steps.report.status === 'blocked' ||
    enabledDeliverySteps.some((step) => step.status === 'blocked')
  ) {
    return 'blocked';
  }

  const reportReady = !run.steps.report.enabled || run.steps.report.status === 'active';
  const deliveriesReady = enabledDeliverySteps.every((step) => step.status === 'active');

  if (reportReady && deliveriesReady) {
    return 'completed';
  }

  return 'pending';
}

async function countTrackedCompetitors(orgId: string): Promise<number> {
  const db = getAdminFirestore();

  const [tenantCompetitorsSnap, orgCompetitorsSnap] = await Promise.all([
    db
      .collection('tenants')
      .doc(orgId)
      .collection('competitors')
      .where('active', '==', true)
      .get(),
    db.collection('organizations').doc(orgId).collection('competitors').get(),
  ]);

  const seen = new Set<string>();

  tenantCompetitorsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const key = [
      normalizeText(data.name)?.toLowerCase() ?? doc.id.toLowerCase(),
      normalizeText(data.city)?.toLowerCase() ?? '',
      normalizeText(data.state)?.toLowerCase() ?? '',
    ].join('|');
    seen.add(key);
  });

  orgCompetitorsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const key = [
      normalizeText(data.name)?.toLowerCase() ?? doc.id.toLowerCase(),
      normalizeText(data.city)?.toLowerCase() ?? '',
      normalizeText(data.state)?.toLowerCase() ?? '',
    ].join('|');
    seen.add(key);
  });

  return seen.size;
}

async function resolveAdminEmail(orgId: string): Promise<string | null> {
  const db = getAdminFirestore();
  const [orgDoc, tenantDoc, usersSnap] = await Promise.all([
    db.collection('organizations').doc(orgId).get(),
    db.collection('tenants').doc(orgId).get(),
    db.collection('users').where('orgId', '==', orgId).limit(10).get(),
  ]);

  const orgData = orgDoc.data() ?? {};
  const tenantData = tenantDoc.data() ?? {};

  const directEmail =
    normalizeEmail(orgData.email) ||
    normalizeEmail(tenantData.email) ||
    normalizeEmail(orgData.ownerEmail) ||
    normalizeEmail(tenantData.ownerEmail);
  if (directEmail) {
    return directEmail;
  }

  const ownerId = pickFirstString(
    orgData.ownerId,
    tenantData.ownerId,
    orgData.createdBy,
    tenantData.createdBy,
  );

  const users = usersSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<Record<string, unknown> & { id: string }>;

  if (ownerId) {
    const owner = users.find((user) => user.id === ownerId);
    if (owner) {
      return normalizeEmail(owner.email);
    }

    const ownerDoc = await db.collection('users').doc(ownerId).get();
    if (ownerDoc.exists) {
      return normalizeEmail(ownerDoc.data()?.email);
    }
  }

  const preferredUser =
    users.find((user) => user.role === 'dispensary' || user.role === 'dispensary_owner') ||
    users.find((user) => user.role === 'brand' || user.role === 'brand_admin') ||
    users.find((user) => user.role === 'super_user') ||
    users[0];

  return preferredUser ? normalizeEmail(preferredUser.email) : null;
}

async function resolveBootstrapZip(orgId: string): Promise<string | null> {
  const db = getAdminFirestore();
  const [orgDoc, tenantDoc, locationsSnap, brandDoc] = await Promise.all([
    db.collection('organizations').doc(orgId).get(),
    db.collection('tenants').doc(orgId).get(),
    db.collection('locations').where('orgId', '==', orgId).limit(1).get(),
    db.collection('brands').doc(orgId).get(),
  ]);

  const orgData = orgDoc.data() ?? {};
  const tenantData = tenantDoc.data() ?? {};
  const locationData = locationsSnap.empty ? {} : locationsSnap.docs[0].data();
  const brandData = brandDoc.data() ?? {};

  return pickFirstString(
    orgData.zipCode,
    orgData.zip,
    tenantData.zipCode,
    tenantData.zip,
    locationData.zipCode,
    locationData.zip,
    brandData.zipCode,
    brandData.zip,
  );
}

async function resolveContext(orgId: string): Promise<ActivationContext> {
  const [competitorCount, adminEmail] = await Promise.all([
    countTrackedCompetitors(orgId),
    resolveAdminEmail(orgId),
  ]);

  const slackSupported = orgId === THRIVE_SYRACUSE_ORG_ID;

  return {
    competitorCount,
    adminEmail,
    slackSupported,
    slackPersona: slackSupported ? 'elroy' : null,
    slackChannel: slackSupported ? THRIVE_SYRACUSE_SLACK_CHANNEL : null,
  };
}

function serializeRun(run: CompetitiveIntelActivationRun): Record<string, unknown> {
  return {
    ...run,
    activatedAt: run.activatedAt ?? null,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    steps: {
      report: { ...run.steps.report },
      email: { ...run.steps.email },
      slack: { ...run.steps.slack },
    },
  };
}

function hydrateRun(raw: Record<string, unknown>): CompetitiveIntelActivationRun {
  const createdAt = toDateValue(raw.createdAt) ?? new Date();
  const updatedAt = toDateValue(raw.updatedAt) ?? createdAt;

  const stepsRaw =
    raw.steps && typeof raw.steps === 'object'
      ? (raw.steps as Record<string, unknown>)
      : {};

  return {
    id: normalizeText(raw.id) ?? '',
    orgId: normalizeText(raw.orgId) ?? '',
    entryPoint:
      (raw.entryPoint as CompetitiveIntelActivationEntryPoint | undefined) ?? 'competitive_intel_page',
    status: (raw.status as CompetitiveIntelActivationStatus | undefined) ?? 'pending',
    competitorCount: typeof raw.competitorCount === 'number' ? raw.competitorCount : 0,
    blockedReason:
      (raw.blockedReason as CompetitiveIntelActivationBlockedReason | undefined) ?? null,
    nextAction: normalizeText(raw.nextAction) ?? null,
    evidenceRefs: Array.isArray(raw.evidenceRefs)
      ? raw.evidenceRefs.filter((value): value is string => typeof value === 'string')
      : [],
    slackPersona: raw.slackPersona === 'elroy' ? 'elroy' : null,
    slackChannel: normalizeText(raw.slackChannel) ?? null,
    steps: {
      report: hydrateStep(stepsRaw.report),
      email: hydrateStep(stepsRaw.email),
      slack: hydrateStep(stepsRaw.slack),
    },
    activatedAt: toDateValue(raw.activatedAt),
    createdAt,
    updatedAt,
  };
}

async function getExistingRun(orgId: string): Promise<CompetitiveIntelActivationRun | null> {
  const db = getAdminFirestore();
  const doc = await db
    .collection(COMPETITIVE_INTEL_ACTIVATION_RUNS_COLLECTION)
    .doc(orgId)
    .get();

  if (!doc.exists) {
    return null;
  }

  const rawData = doc.data();
  if (!rawData) {
    return null;
  }

  const run = hydrateRun(rawData as Record<string, unknown>);
  return {
    ...run,
    id: run.id || doc.id,
    orgId: run.orgId || orgId,
  };
}

function applyContextToSteps(
  existing: CompetitiveIntelActivationRun | null,
  context: ActivationContext,
  options: SyncOptions,
): CompetitiveIntelActivationRun['steps'] {
  const previousReport = cloneStep(existing?.steps.report ?? buildStep());
  const previousEmail = cloneStep(existing?.steps.email ?? buildStep());
  const previousSlack = cloneStep(existing?.steps.slack ?? buildStep());

  const reportEnabled = options.enableReport ?? previousReport.enabled;
  const emailEnabled = options.enableEmail ?? previousEmail.enabled;
  const slackEnabled = options.enableSlack ?? previousSlack.enabled;

  const report = buildStep({
    ...previousReport,
    enabled: reportEnabled,
    target: reportEnabled ? DAILY_REPORT_TARGET : null,
  });

  if (report.enabled) {
    if (context.competitorCount === 0) {
      report.status = 'blocked';
      report.blockedReason = 'missing_competitors';
      report.lastError = null;
    } else if (report.status !== 'active' && report.status !== 'failed') {
      report.status = 'pending';
      report.blockedReason = null;
    } else if (report.status === 'active') {
      report.blockedReason = null;
      report.lastError = null;
    }
  } else {
    report.status = 'pending';
    report.blockedReason = null;
    report.lastError = null;
  }

  const email = buildStep({
    ...previousEmail,
    enabled: emailEnabled,
    target: emailEnabled ? context.adminEmail : null,
  });

  if (email.enabled) {
    if (!context.adminEmail) {
      email.status = 'blocked';
      email.blockedReason = 'missing_admin_email';
      email.lastError = null;
    } else if (email.status !== 'active' && email.status !== 'failed') {
      email.status = 'pending';
      email.blockedReason = null;
    } else if (email.status === 'active') {
      email.blockedReason = null;
      email.lastError = null;
    }
  } else {
    email.status = 'pending';
    email.blockedReason = null;
    email.lastError = null;
    email.target = null;
  }

  const slack = buildStep({
    ...previousSlack,
    enabled: slackEnabled,
    target: slackEnabled ? context.slackChannel : null,
  });

  if (slack.enabled) {
    if (!context.slackSupported) {
      slack.status = 'blocked';
      slack.blockedReason = 'slack_not_supported';
      slack.lastError = null;
    } else if (slack.status !== 'active' && slack.status !== 'failed') {
      slack.status = 'pending';
      slack.blockedReason = null;
    } else if (slack.status === 'active') {
      slack.blockedReason = null;
      slack.lastError = null;
    }
  } else {
    slack.status = 'pending';
    slack.blockedReason = null;
    slack.lastError = null;
    slack.target = null;
  }

  return { report, email, slack };
}

async function persistRun(
  orgId: string,
  context: ActivationContext,
  steps: CompetitiveIntelActivationRun['steps'],
  options: SyncOptions,
): Promise<CompetitiveIntelActivationRun> {
  const now = new Date();
  const existing = await getExistingRun(orgId);

  const run: CompetitiveIntelActivationRun = {
    id: orgId,
    orgId,
    entryPoint: options.entryPoint ?? existing?.entryPoint ?? 'competitive_intel_page',
    status: 'pending',
    competitorCount: context.competitorCount,
    blockedReason: null,
    nextAction: null,
    evidenceRefs: buildEvidenceRefs(context),
    slackPersona: context.slackPersona,
    slackChannel: context.slackChannel,
    steps,
    activatedAt:
      existing?.activatedAt ??
      (steps.report.enabled || steps.email.enabled || steps.slack.enabled ? now : null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  run.blockedReason = pickBlockedReason(run.steps);
  run.nextAction = describeNextAction(run.blockedReason, context);
  run.status = deriveStatus(run);

  const db = getAdminFirestore();
  await db
    .collection(COMPETITIVE_INTEL_ACTIVATION_RUNS_COLLECTION)
    .doc(orgId)
    .set(serializeRun(run), { merge: true });

  return run;
}

async function updateRunStep(
  orgId: string,
  stepKey: keyof CompetitiveIntelActivationRun['steps'],
  update: DeliveryUpdate,
): Promise<CompetitiveIntelActivationRun> {
  const existing = await getExistingRun(orgId);
  const context = await resolveContext(orgId);
  const steps = applyContextToSteps(existing, context, {});
  const step = steps[stepKey];

  step.target = update.target ?? step.target;
  step.lastAttemptAt = update.lastAttemptAt ?? step.lastAttemptAt;
  step.lastDeliveredAt = update.lastDeliveredAt ?? step.lastDeliveredAt;
  step.lastReportId = update.lastReportId ?? step.lastReportId;
  step.lastError = update.lastError ?? null;
  step.status = update.status ?? step.status;
  step.blockedReason = update.blockedReason ?? null;

  return persistRun(orgId, context, steps, {
    entryPoint: existing?.entryPoint ?? 'cron',
  });
}

export async function getCompetitiveIntelActivationRun(
  orgId: string,
): Promise<CompetitiveIntelActivationRun> {
  const existing = await getExistingRun(orgId);
  const context = await resolveContext(orgId);
  const steps = applyContextToSteps(existing, context, {});
  return persistRun(orgId, context, steps, {
    entryPoint: existing?.entryPoint ?? 'competitive_intel_page',
  });
}

export async function activateCompetitiveIntelDelivery(
  orgId: string,
  options?: {
    entryPoint?: CompetitiveIntelActivationEntryPoint;
  },
): Promise<{
  run: CompetitiveIntelActivationRun;
  autoDiscovered: number;
}> {
  let existing = await getCompetitiveIntelActivationRun(orgId);
  let autoDiscovered = 0;

  if (existing.competitorCount === 0) {
    const zip = await resolveBootstrapZip(orgId);
    if (zip) {
      const bootstrap = await autoSetupCompetitors(orgId, zip);
      autoDiscovered = bootstrap.competitors.length;
      logger.info('[CompetitiveIntelActivation] Auto-discovered competitors during activation', {
        orgId,
        zip,
        autoDiscovered,
      });
    }
  }

  const context = await resolveContext(orgId);
  const steps = applyContextToSteps(existing, context, {
    enableReport: true,
    enableEmail: true,
    enableSlack: context.slackSupported,
  });

  const run = await persistRun(orgId, context, steps, {
    entryPoint: options?.entryPoint ?? 'competitive_intel_page',
  });

  return {
    run,
    autoDiscovered,
  };
}

export async function recordCompetitiveIntelReportGenerated(input: {
  orgId: string;
  reportId: string;
  generatedAt?: Date;
}): Promise<CompetitiveIntelActivationRun> {
  const deliveredAt = input.generatedAt ?? new Date();
  const run = await updateRunStep(input.orgId, 'report', {
    target: DAILY_REPORT_TARGET,
    lastAttemptAt: deliveredAt,
    lastDeliveredAt: deliveredAt,
    lastReportId: input.reportId,
    lastError: null,
    status: 'active',
    blockedReason: null,
  });

  const existing = await getExistingRun(input.orgId);
  const context = await resolveContext(input.orgId);
  const steps = applyContextToSteps(existing ?? run, context, {});

  if (steps.email.enabled && steps.email.status !== 'blocked' && steps.email.lastReportId !== input.reportId) {
    steps.email.status = 'pending';
    steps.email.lastError = null;
    steps.email.blockedReason = null;
  }

  if (steps.slack.enabled && steps.slack.status !== 'blocked' && steps.slack.lastReportId !== input.reportId) {
    steps.slack.status = 'pending';
    steps.slack.lastError = null;
    steps.slack.blockedReason = null;
  }

  return persistRun(input.orgId, context, steps, {
    entryPoint: run.entryPoint,
  });
}

export async function recordCompetitiveIntelReportFailure(
  orgId: string,
  errorMessage: string,
): Promise<CompetitiveIntelActivationRun> {
  return updateRunStep(orgId, 'report', {
    lastAttemptAt: new Date(),
    lastError: errorMessage,
    status: 'failed',
    blockedReason: 'report_generation_failed',
  });
}

export async function recordCompetitiveIntelEmailDelivered(input: {
  orgId: string;
  reportId: string;
  targetEmail: string;
  deliveredAt?: Date;
}): Promise<CompetitiveIntelActivationRun> {
  return updateRunStep(input.orgId, 'email', {
    target: input.targetEmail,
    lastAttemptAt: input.deliveredAt ?? new Date(),
    lastDeliveredAt: input.deliveredAt ?? new Date(),
    lastReportId: input.reportId,
    lastError: null,
    status: 'active',
    blockedReason: null,
  });
}

export async function recordCompetitiveIntelEmailFailure(
  orgId: string,
  errorMessage: string,
): Promise<CompetitiveIntelActivationRun> {
  return updateRunStep(orgId, 'email', {
    lastAttemptAt: new Date(),
    lastError: errorMessage,
    status: 'failed',
    blockedReason: 'email_delivery_failed',
  });
}

export async function recordCompetitiveIntelSlackDelivered(input: {
  orgId: string;
  reportId: string;
  targetChannel: string;
  deliveredAt?: Date;
}): Promise<CompetitiveIntelActivationRun> {
  return updateRunStep(input.orgId, 'slack', {
    target: input.targetChannel,
    lastAttemptAt: input.deliveredAt ?? new Date(),
    lastDeliveredAt: input.deliveredAt ?? new Date(),
    lastReportId: input.reportId,
    lastError: null,
    status: 'active',
    blockedReason: null,
  });
}

export async function recordCompetitiveIntelSlackFailure(
  orgId: string,
  errorMessage: string,
): Promise<CompetitiveIntelActivationRun> {
  return updateRunStep(orgId, 'slack', {
    lastAttemptAt: new Date(),
    lastError: errorMessage,
    status: 'failed',
    blockedReason: 'slack_delivery_failed',
  });
}

function formatCurrency(value: number | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return `$${value.toFixed(2)}`;
}

function buildElroySlackSummary(report: CompetitiveIntelDeliveryReport): string {
  const lines: string[] = [];
  const reportDate = report.generatedAt ?? report.weekStart ?? new Date();
  lines.push(
    `Morning team. Ezal's competitive intel for ${reportDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} is ready for Thrive Syracuse.`,
  );
  lines.push('');

  const topDeal = report.insights?.topDeals?.[0];
  if (topDeal) {
    const price = formatCurrency(topDeal.price);
    const discount = topDeal.discount ? ` (${topDeal.discount})` : '';
    lines.push(
      `Top move: ${topDeal.competitorName || 'A competitor'} is pushing ${topDeal.dealName || 'a featured offer'}${price ? ` at ${price}` : ''}${discount}.`,
    );
  }

  const leadTrend = report.insights?.marketTrends?.[0];
  if (leadTrend) {
    lines.push(`Market read: ${leadTrend}`);
  }

  const recommendation = report.insights?.recommendations?.[0];
  if (recommendation) {
    lines.push(`Recommended move: ${recommendation}`);
  }

  const topCompetitor = report.competitors?.[0];
  if (topCompetitor?.competitorName) {
    const strategy = topCompetitor.priceStrategy ? ` (${topCompetitor.priceStrategy} pricing)` : '';
    lines.push(
      `Closest watch: ${topCompetitor.competitorName}${strategy}${topCompetitor.dealCount ? ` with ${topCompetitor.dealCount} tracked offers` : ''}.`,
    );
  }

  lines.push('');
  lines.push('Open the Competitive Intel dashboard for the full breakdown.');

  return lines.join('\n');
}

export async function maybeSendCompetitiveIntelSlackDigest(input: {
  orgId: string;
  reportId: string;
  report: CompetitiveIntelDeliveryReport;
}): Promise<{
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
}> {
  const run = await getCompetitiveIntelActivationRun(input.orgId);

  if (!run.steps.slack.enabled) {
    return { sent: false, skipped: true, reason: 'slack_disabled' };
  }

  if (run.steps.slack.status === 'blocked') {
    return {
      sent: false,
      skipped: true,
      reason: run.steps.slack.blockedReason ?? 'slack_blocked',
    };
  }

  if (
    run.steps.slack.lastReportId === input.reportId &&
    run.steps.slack.lastDeliveredAt
  ) {
    return { sent: false, skipped: true, reason: 'already_sent' };
  }

  const summary = buildElroySlackSummary(input.report);
  const blocks = SlackService.formatAgentResponse(summary, 'elroy');
  const channel = run.steps.slack.target || THRIVE_SYRACUSE_SLACK_CHANNEL;
  const fallbackText = `[DAILY INTEL] ${summary.slice(0, 160)}`;

  const postResult = await elroySlackService.postMessage(channel, fallbackText, blocks);

  if (!postResult.sent) {
    const errorMessage = postResult.error || 'Slack delivery failed';
    await recordCompetitiveIntelSlackFailure(input.orgId, errorMessage);
    logger.error('[CompetitiveIntelActivation] Slack delivery failed', {
      orgId: input.orgId,
      reportId: input.reportId,
      channel,
      error: errorMessage,
    });
    return { sent: false, error: errorMessage };
  }

  await recordCompetitiveIntelSlackDelivered({
    orgId: input.orgId,
    reportId: input.reportId,
    targetChannel: channel,
  });

  logger.info('[CompetitiveIntelActivation] Posted daily intel to Slack', {
    orgId: input.orgId,
    reportId: input.reportId,
    channel,
    ts: postResult.ts,
  });

  return { sent: true };
}
