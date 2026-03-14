'use server';

/**
 * analytics-prefs.ts
 *
 * Server actions for:
 * 1. Reading / saving per-user analytics widget preferences
 * 2. Creating scheduled analytics report playbooks from the Analytics Hub
 */

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { createPlaybook } from '@/server/actions/playbooks';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Widget registry (canonical list — mirrors overview-tab.tsx OVERVIEW_WIDGETS)
// ---------------------------------------------------------------------------

export const DEFAULT_WIDGETS = [
  'revenue_kpis',
  'revenue_chart',
  'sales_by_category',
  'top_products',
  'affinity_pairs',
  'cohort_heatmap',
  'conversion_funnel',
  'channel_performance',
] as const;

export type WidgetId = (typeof DEFAULT_WIDGETS)[number];

export interface AnalyticsPrefs {
  enabledWidgets: string[];
  updatedAt: string; // ISO string — serialization-safe, no Timestamps
}

// ---------------------------------------------------------------------------
// getAnalyticsPrefs
// ---------------------------------------------------------------------------

export async function getAnalyticsPrefs(): Promise<AnalyticsPrefs> {
  const user = await requireUser();
  const db = getAdminFirestore();

  try {
    const doc = await db
      .collection('users')
      .doc(user.uid)
      .collection('preferences')
      .doc('analytics')
      .get();

    if (!doc.exists) {
      return { enabledWidgets: [...DEFAULT_WIDGETS], updatedAt: '' };
    }

    const data = doc.data() ?? {};
    const enabledWidgets = Array.isArray(data.enabledWidgets)
      ? (data.enabledWidgets as string[]).filter((id) =>
          (DEFAULT_WIDGETS as readonly string[]).includes(id)
        )
      : [...DEFAULT_WIDGETS];

    return {
      enabledWidgets,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    };
  } catch (err) {
    logger.error('[analytics-prefs] getAnalyticsPrefs error', { uid: user.uid, error: String(err) });
    return { enabledWidgets: [...DEFAULT_WIDGETS], updatedAt: '' };
  }
}

// ---------------------------------------------------------------------------
// saveAnalyticsPrefs
// ---------------------------------------------------------------------------

export async function saveAnalyticsPrefs(
  enabledWidgets: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();
    const db = getAdminFirestore();

    // Filter to known widget IDs only
    const validated = enabledWidgets.filter((id) =>
      (DEFAULT_WIDGETS as readonly string[]).includes(id)
    );

    await db
      .collection('users')
      .doc(user.uid)
      .collection('preferences')
      .doc('analytics')
      .set(
        {
          enabledWidgets: validated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    return { success: true };
  } catch (err) {
    logger.error('[analytics-prefs] saveAnalyticsPrefs error', { error: String(err) });
    return { success: false, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// createAnalyticsReportPlaybook
// ---------------------------------------------------------------------------

export interface CreateAnalyticsReportInput {
  orgId: string;
  name: string;
  widgets: string[];
  schedule: 'daily' | 'weekly' | 'monthly';
  deliveryEmail: string[];
  deliverySms: string[];
  includeAiSummary: boolean;
}

const SCHEDULE_CRON: Record<CreateAnalyticsReportInput['schedule'], string> = {
  daily: '0 8 * * *',
  weekly: '0 8 * * 1',
  monthly: '0 8 1 * *',
};

const COMPARE_WITH: Record<CreateAnalyticsReportInput['schedule'], string> = {
  daily: 'previous_day',
  weekly: 'previous_week',
  monthly: 'previous_month',
};

function userCanAccessOrg(user: Record<string, unknown>, orgId: string): boolean {
  const role = typeof user.role === 'string' ? user.role : '';
  if (role === 'super_user' || role === 'super_admin') return true;
  const candidates = [
    user.brandId,
    user.orgId,
    user.currentOrgId,
    user.locationId,
  ].filter((v): v is string => typeof v === 'string');
  const orgIds = Array.isArray(user.orgIds)
    ? (user.orgIds as unknown[]).filter((v): v is string => typeof v === 'string')
    : [];
  return candidates.includes(orgId) || orgIds.includes(orgId);
}

export async function createAnalyticsReportPlaybook(
  input: CreateAnalyticsReportInput
): Promise<{ success: boolean; playbookId?: string; error?: string }> {
  try {
    const user = await requireUser();

    if (!userCanAccessOrg(user as unknown as Record<string, unknown>, input.orgId)) {
      return { success: false, error: 'Forbidden: no access to this org' };
    }

    if (input.widgets.length === 0) {
      return { success: false, error: 'Select at least one widget' };
    }
    if (input.deliveryEmail.length === 0 && input.deliverySms.length === 0) {
      return { success: false, error: 'Select at least one delivery method' };
    }

    const cron = SCHEDULE_CRON[input.schedule];
    const compareWith = COMPARE_WITH[input.schedule];

    const widgetLabels = input.widgets.join(', ');
    const description = `Automated ${input.schedule} analytics report covering: ${widgetLabels}. ${
      input.includeAiSummary ? 'Includes AI-generated summary and decision recommendations.' : ''
    }`.trim();

    const result = await createPlaybook(input.orgId, {
      name: input.name,
      description,
      agent: 'pops',
      category: 'reporting',
      triggers: [
        {
          type: 'schedule',
          cron,
          timezone: 'America/New_York',
        },
      ],
      steps: [
        {
          action: 'send_analytics_report',
          label: 'Generate and send analytics report',
          params: {
            widgets: input.widgets,
            compareWith,
            includeAiSummary: input.includeAiSummary,
            delivery: {
              email: input.deliveryEmail,
              sms: input.deliverySms,
            },
          },
        },
      ],
      templateId: 'analytics_report_template',
    });

    if (!result.success || !result.playbook) {
      return { success: false, error: result.error ?? 'Failed to create playbook' };
    }

    // Tag the playbook with analytics metadata via a quick update
    try {
      const db = getAdminFirestore();
      await db
        .collection('brands')
        .doc(input.orgId)
        .collection('playbooks')
        .doc(result.playbook.id)
        .set(
          {
            metadata: {
              analyticsReport: true,
              sourceWidgets: input.widgets,
              reportType: input.schedule,
            },
            playbookType: 'analytics_report',
          },
          { merge: true }
        );
    } catch {
      // Non-fatal — playbook still created
    }

    logger.info('[analytics-prefs] Created analytics report playbook', {
      playbookId: result.playbook.id,
      orgId: input.orgId,
      schedule: input.schedule,
      widgets: input.widgets,
    });

    return { success: true, playbookId: result.playbook.id };
  } catch (err) {
    logger.error('[analytics-prefs] createAnalyticsReportPlaybook error', { error: String(err) });
    return { success: false, error: String(err) };
  }
}
