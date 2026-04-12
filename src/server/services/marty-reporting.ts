import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { MartyScoreboard, MartyScoreboardMetric, MartyWeeklyMemoData } from '@/types/marty';

export const TARGET_MRR = 83333;
const NOT_INSTRUMENTED_YET = 'Not instrumented yet';

function formatChicagoDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function createMetric(
  id: string,
  label: string,
  value: number | null,
  format: MartyScoreboardMetric['format'],
  note?: string,
): MartyScoreboardMetric {
  return {
    id,
    label,
    value,
    format,
    note: value === null ? note ?? NOT_INSTRUMENTED_YET : note,
  };
}

function formatMetricValue(metric: MartyScoreboardMetric): string {
  if (metric.value === null) {
    return metric.note ?? NOT_INSTRUMENTED_YET;
  }

  switch (metric.format) {
    case 'currency':
      return `$${metric.value.toLocaleString()}`;
    case 'percent':
      return `${metric.value}%`;
    case 'days':
      return `${metric.value} days`;
    case 'integer':
    default:
      return metric.value.toLocaleString();
  }
}

export function buildMartyScoreboard(input?: {
  currentMrr?: number | null;
  arpu?: number | null;
  netNewMrrMonth?: number | null;
  churnedMrr?: number | null;
  expansionMrr?: number | null;
  updatedAt?: Date;
}): MartyScoreboard {
  const currentMrr = input?.currentMrr ?? null;
  const arpu = input?.arpu ?? null;
  const arrRunRate = currentMrr === null ? null : Math.round(currentMrr * 12);

  return {
    targetMrr: TARGET_MRR,
    updatedAt: (input?.updatedAt ?? new Date()).toISOString(),
    groups: [
      {
        id: 'revenue',
        title: 'Revenue',
        metrics: [
          createMetric('current_mrr', 'Current MRR', currentMrr, 'currency', currentMrr === null ? NOT_INSTRUMENTED_YET : 'Trusted CRM subscriptions total.'),
          createMetric('net_new_mrr_month', 'Net New MRR This Month', input?.netNewMrrMonth ?? null, 'currency'),
          createMetric('arr_run_rate', 'ARR Run Rate', arrRunRate, 'currency', arrRunRate === null ? NOT_INSTRUMENTED_YET : 'Derived from current MRR.'),
          createMetric('average_revenue_per_account', 'Average Revenue Per Account', arpu, 'currency', arpu === null ? NOT_INSTRUMENTED_YET : 'Derived from paid accounts.'),
          createMetric('churned_mrr', 'Churned MRR', input?.churnedMrr ?? null, 'currency'),
          createMetric('expansion_mrr', 'Expansion MRR', input?.expansionMrr ?? null, 'currency'),
        ],
      },
      {
        id: 'pipeline',
        title: 'Pipeline',
        metrics: [
          createMetric('qualified_opportunities_added', 'Qualified Opportunities Added', null, 'integer'),
          createMetric('discovery_calls_booked', 'Discovery Calls Booked', null, 'integer'),
          createMetric('pilots_launched', 'Pilots Launched', null, 'integer'),
          createMetric('proposals_sent', 'Proposals Sent', null, 'integer'),
          createMetric('close_rate', 'Close Rate', null, 'percent'),
          createMetric('average_days_to_close', 'Average Days to Close', null, 'days'),
        ],
      },
      {
        id: 'activation',
        title: 'Activation',
        metrics: [
          createMetric('time_to_first_value', 'Time to First Value', null, 'days'),
          createMetric('welcome_checkin_flow_activation_rate', 'Welcome Check-In Flow Activation Rate', null, 'percent'),
          createMetric('welcome_email_playbook_activation_rate', 'Welcome Email Playbook Activation Rate', null, 'percent'),
          createMetric('accounts_live_within_30_days', 'Accounts Live Within 30 Days', null, 'integer'),
          createMetric('customer_roi_signals_captured', 'Customer ROI Signals Captured', null, 'integer'),
        ],
      },
      {
        id: 'customer_health',
        title: 'Customer Health',
        metrics: [
          createMetric('at_risk_accounts', 'At-Risk Accounts', null, 'integer'),
          createMetric('usage_decline', 'Usage Decline', null, 'integer'),
          createMetric('blocked_onboarding_items', 'Blocked Onboarding Items', null, 'integer'),
          createMetric('expansion_ready_accounts', 'Expansion-Ready Accounts', null, 'integer'),
          createMetric('unresolved_support_or_implementation_issues', 'Unresolved Support or Implementation Issues', null, 'integer'),
        ],
      },
      {
        id: 'execution',
        title: 'Execution',
        metrics: [
          createMetric('top_priorities_completed', 'Top Priorities Completed', null, 'integer'),
          createMetric('critical_blockers_still_open', 'Critical Blockers Still Open', null, 'integer'),
          createMetric('tasks_overdue', 'Tasks Overdue', null, 'integer'),
          createMetric('founder_decisions_waiting', 'Founder Decisions Waiting', null, 'integer'),
        ],
      },
    ],
  };
}

export function buildMartyWeeklyMemoData(input?: {
  currentMrr?: number | null;
  arpu?: number | null;
  highestValueOpportunities?: string[];
  generatedAt?: Date;
}): MartyWeeklyMemoData {
  const generatedAt = input?.generatedAt ?? new Date();
  const scoreboard = buildMartyScoreboard({
    currentMrr: input?.currentMrr ?? null,
    arpu: input?.arpu ?? null,
    updatedAt: generatedAt,
  });
  const currentMrr = input?.currentMrr ?? null;
  const paceVsTargetPct = currentMrr === null ? null : Math.round((currentMrr / TARGET_MRR) * 100);
  const highestValueOpportunities = input?.highestValueOpportunities ?? [];
  const revenueMetrics = scoreboard.groups.find((group) => group.id === 'revenue')?.metrics ?? [];
  const pipelineMetrics = scoreboard.groups.find((group) => group.id === 'pipeline')?.metrics ?? [];
  const activationMetrics = scoreboard.groups.find((group) => group.id === 'activation')?.metrics ?? [];
  const customerHealthMetrics = scoreboard.groups.find((group) => group.id === 'customer_health')?.metrics ?? [];
  const revenueCurrentMrr = revenueMetrics.find((metric) => metric.id === 'current_mrr');
  const revenueArrRunRate = revenueMetrics.find((metric) => metric.id === 'arr_run_rate');
  const activationCheckin = activationMetrics.find((metric) => metric.id === 'welcome_checkin_flow_activation_rate');
  const activationEmail = activationMetrics.find((metric) => metric.id === 'welcome_email_playbook_activation_rate');
  const activationLive = activationMetrics.find((metric) => metric.id === 'accounts_live_within_30_days');
  const pipelineQualified = pipelineMetrics.find((metric) => metric.id === 'qualified_opportunities_added');
  const pipelineDiscovery = pipelineMetrics.find((metric) => metric.id === 'discovery_calls_booked');
  const pipelineProposals = pipelineMetrics.find((metric) => metric.id === 'proposals_sent');
  const customerAtRisk = customerHealthMetrics.find((metric) => metric.id === 'at_risk_accounts');
  const customerBlocked = customerHealthMetrics.find((metric) => metric.id === 'blocked_onboarding_items');
  const customerExpansion = customerHealthMetrics.find((metric) => metric.id === 'expansion_ready_accounts');

  const decisionsNeeded = [
    'Confirm owners and deadlines for missing pipeline, activation, customer-health, and execution instrumentation.',
    'Keep Access as the trust-building wedge and Operator as the premium managed revenue activation sale.',
  ];

  return {
    date: formatChicagoDate(generatedAt),
    generatedAt: generatedAt.toISOString(),
    targetMrr: TARGET_MRR,
    currentMrr,
    paceVsTargetPct,
    highestValueOpportunities,
    decisionsNeeded,
    scoreboard,
    sections: [
      {
        id: 'business_status',
        title: 'Business Status',
        summary: currentMrr === null
          ? 'Current MRR is not available in this memo context, so pace versus the $83,333 target cannot be stated with confidence.'
          : `Current MRR is ${formatMetricValue(revenueCurrentMrr ?? createMetric('current_mrr', 'Current MRR', null, 'currency'))} against the $${TARGET_MRR.toLocaleString()} pace required for $1M ARR.`,
        bullets: [
          `Current MRR: ${formatMetricValue(revenueCurrentMrr ?? createMetric('current_mrr', 'Current MRR', null, 'currency'))}`,
          `ARR run rate: ${formatMetricValue(revenueArrRunRate ?? createMetric('arr_run_rate', 'ARR Run Rate', null, 'currency'))}`,
          `Pace vs target: ${paceVsTargetPct === null ? NOT_INSTRUMENTED_YET : `${paceVsTargetPct}%`}`,
          highestValueOpportunities.length > 0
            ? `Highest-value active opportunities: ${highestValueOpportunities.join('; ')}`
            : 'Highest-value active opportunities: Not instrumented yet',
        ],
      },
      {
        id: 'product_status',
        title: 'Product Status',
        summary: 'The product focus stays on the Welcome Check-In Flow and Welcome Email Playbook, with onboarding and proof-of-value instrumentation still incomplete.',
        bullets: [
          `Welcome Check-In Flow activation rate: ${formatMetricValue(activationCheckin ?? createMetric('welcome_checkin_flow_activation_rate', 'Welcome Check-In Flow Activation Rate', null, 'percent'))}`,
          `Welcome Email Playbook activation rate: ${formatMetricValue(activationEmail ?? createMetric('welcome_email_playbook_activation_rate', 'Welcome Email Playbook Activation Rate', null, 'percent'))}`,
          `Accounts live within 30 days: ${formatMetricValue(activationLive ?? createMetric('accounts_live_within_30_days', 'Accounts Live Within 30 Days', null, 'integer'))}`,
        ],
      },
      {
        id: 'gtm_status',
        title: 'GTM Status',
        summary: 'The commercial rule remains Access builds trust and Operator builds the company, but the live pipeline scorecard is still only partially instrumented.',
        bullets: [
          `Qualified opportunities added: ${formatMetricValue(pipelineQualified ?? createMetric('qualified_opportunities_added', 'Qualified Opportunities Added', null, 'integer'))}`,
          `Discovery calls booked: ${formatMetricValue(pipelineDiscovery ?? createMetric('discovery_calls_booked', 'Discovery Calls Booked', null, 'integer'))}`,
          `Proposals sent: ${formatMetricValue(pipelineProposals ?? createMetric('proposals_sent', 'Proposals Sent', null, 'integer'))}`,
        ],
      },
      {
        id: 'customer_status',
        title: 'Customer Status',
        summary: 'Customer health review is still constrained by missing instrumentation, so risk, expansion, and onboarding blockers remain partly manual.',
        bullets: [
          `At-risk accounts: ${formatMetricValue(customerAtRisk ?? createMetric('at_risk_accounts', 'At-Risk Accounts', null, 'integer'))}`,
          `Blocked onboarding items: ${formatMetricValue(customerBlocked ?? createMetric('blocked_onboarding_items', 'Blocked Onboarding Items', null, 'integer'))}`,
          `Expansion-ready accounts: ${formatMetricValue(customerExpansion ?? createMetric('expansion_ready_accounts', 'Expansion-Ready Accounts', null, 'integer'))}`,
        ],
      },
      {
        id: 'decisions_needed',
        title: 'Decisions Needed',
        summary: 'Instrumentation ownership and commercial discipline remain the main decisions preventing a fully numbers-first weekly operating cadence.',
        bullets: decisionsNeeded,
      },
    ],
  };
}

export function formatMartyWeeklyMemoMarkdown(memo: MartyWeeklyMemoData): string {
  const header = [
    `**Marty Benjamins - Weekly CEO Memo**`,
    memo.date,
    '',
    `Target pace: $${memo.targetMrr.toLocaleString()} MRR to reach $1M ARR by April 11, 2027.`,
    `Current MRR: ${memo.currentMrr === null ? NOT_INSTRUMENTED_YET : `$${memo.currentMrr.toLocaleString()}`}`,
    `Pace vs target: ${memo.paceVsTargetPct === null ? NOT_INSTRUMENTED_YET : `${memo.paceVsTargetPct}%`}`,
  ];

  const sections = memo.sections.flatMap((section) => [
    '',
    `## ${section.title}`,
    section.summary,
    ...section.bullets.map((bullet) => `- ${bullet}`),
  ]);

  return [...header, ...sections].join('\n');
}

export async function getOrCreateMartyWeeklyMemoThread(): Promise<string> {
  const db = getAdminFirestore();
  const threadsSnap = await db
    .collection('inbox_threads')
    .where('metadata.isMartyWeeklyMemoThread', '==', true)
    .where('metadata.scope', '==', 'platform')
    .limit(1)
    .get();

  if (!threadsSnap.empty) {
    const threadDoc = threadsSnap.docs[0];
    if (threadDoc) {
      return threadDoc.id;
    }
  }

  const threadRef = db.collection('inbox_threads').doc();
  await threadRef.set({
    id: threadRef.id,
    orgId: 'platform',
    userId: 'system',
    type: 'weekly_sync',
    status: 'active',
    title: 'Marty Weekly CEO Memos',
    preview: 'Monday operating memos from Marty',
    primaryAgent: 'marty',
    assignedAgents: ['marty'],
    artifactIds: [],
    messages: [],
    metadata: { isMartyWeeklyMemoThread: true, scope: 'platform' },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  });

  logger.info('[MartyWeeklyMemo] Created platform memo thread', { threadId: threadRef.id });
  return threadRef.id;
}

export async function postMartyWeeklyMemoToInbox(memo: MartyWeeklyMemoData): Promise<{ threadId: string }> {
  const db = getAdminFirestore();
  const now = new Date();
  const threadId = await getOrCreateMartyWeeklyMemoThread();
  const messageBody = formatMartyWeeklyMemoMarkdown(memo);

  await db.collection('inbox_threads').doc(threadId).collection('messages').add({
    role: 'assistant',
    content: messageBody,
    agentId: 'marty',
    artifact: {
      type: 'marty_weekly_memo',
      data: memo,
    },
    createdAt: now,
    metadata: { source: 'marty-weekly-memo' },
  });

  await db.collection('inbox_threads').doc(threadId).update({
    lastMessage: messageBody.slice(0, 120),
    lastMessageAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });

  logger.info('[MartyWeeklyMemo] Posted memo to inbox', {
    threadId,
    currentMrr: memo.currentMrr,
    paceVsTargetPct: memo.paceVsTargetPct,
  });

  return { threadId };
}
