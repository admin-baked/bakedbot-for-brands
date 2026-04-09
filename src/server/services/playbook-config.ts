/**
 * Playbook Configuration Service
 *
 * CRUD operations for org-level playbook subscriptions.
 * Playbooks control which briefing cards are generated, at what frequency,
 * with what parameters, and whether they require human approval.
 *
 * Storage: tenants/{orgId}/playbooks/{playbookId}
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/lib/logger';
import type { PlaybookConfig } from '@/types/inbox';

// ============================================================================
// Playbook Templates — Default configs for quick activation
// ============================================================================

export interface PlaybookTemplate {
    id: string;
    name: string;
    description: string;
    primaryAgent: string;
    supportingAgents?: string[];
    frequency: PlaybookConfig['frequency'];
    cronExpression: string;
    defaultConfig: Record<string, unknown>;
    requiresApproval: boolean;
    tier: 'starter' | 'growth' | 'pro';
}

export const PLAYBOOK_TEMPLATES: PlaybookTemplate[] = [
    // ---- Starter (Free) ----
    {
        id: 'daily_revenue_pulse',
        name: 'Daily Revenue Pulse',
        description: 'Yesterday\'s revenue vs 7-day average — know if you\'re up or down before you open',
        primaryAgent: 'money_mike',
        frequency: 'daily',
        cronExpression: '0 7 * * *',
        defaultConfig: {},
        requiresApproval: false,
        tier: 'starter',
    },
    {
        id: 'restock_predictor',
        name: 'Restock Predictor',
        description: 'Alerts when top sellers are projected to stock out within 3 days',
        primaryAgent: 'money_mike',
        frequency: 'daily',
        cronExpression: '0 7 * * *',
        defaultConfig: { stockoutThresholdDays: 3, topN: 10 },
        requiresApproval: false,
        tier: 'starter',
    },
    {
        id: 'compliance_calendar',
        name: 'Compliance Calendar',
        description: 'Tracks license renewals, cert expirations, and regulatory deadlines',
        primaryAgent: 'deebo',
        frequency: 'daily',
        cronExpression: '0 8 * * *',
        defaultConfig: { alertDaysBefore: 30 },
        requiresApproval: false,
        tier: 'starter',
    },

    // ---- Growth ----
    {
        id: 'competitor_price_match',
        name: 'Competitor Price Match',
        description: 'Beat competitor prices by $1 on high-traffic products — one-tap POS push',
        primaryAgent: 'ezal',
        supportingAgents: ['money_mike'],
        frequency: 'daily',
        cronExpression: '0 9 * * *',
        defaultConfig: {
            beatMargin: 1,
            threshold: 5,
            categories: ['flower', 'vape', 'edible', 'pre-roll', 'concentrate'],
            marginFloor: 0.25,
            maxDiscountsPerDay: 5,
        },
        requiresApproval: true,
        tier: 'growth',
    },
    {
        id: 'flash_sale_slow_movers',
        name: 'Flash Sale: Slow Movers',
        description: 'Auto-generates 7-day discount on products with 0 sales in 14+ days',
        primaryAgent: 'money_mike',
        frequency: 'daily',
        cronExpression: '0 8 * * *',
        defaultConfig: { staleThresholdDays: 14, discountPercent: 20, durationDays: 7, maxItems: 10 },
        requiresApproval: true,
        tier: 'growth',
    },
    {
        id: 'winback_campaign',
        name: 'Win-Back Campaign',
        description: 'Daily SMS/email outreach to at-risk customers with personalized coupon',
        primaryAgent: 'smokey',
        supportingAgents: ['craig'],
        frequency: 'daily',
        cronExpression: '0 9 * * *',
        defaultConfig: { inactiveDays: 30, couponValue: 5, maxPerDay: 10 },
        requiresApproval: true,
        tier: 'growth',
    },
    {
        id: 'first_visit_followup',
        name: 'First Visit Follow-Up',
        description: '24h after first check-in — "Thanks for visiting!" SMS with return incentive',
        primaryAgent: 'smokey',
        supportingAgents: ['craig'],
        frequency: 'daily',
        cronExpression: '0 10 * * *',
        defaultConfig: { delayHours: 24, incentiveType: 'percentage', incentiveValue: 10 },
        requiresApproval: true,
        tier: 'growth',
    },
    {
        id: 'birthday_offers',
        name: 'Birthday Offers',
        description: 'Send personalized birthday deal to customers with birthdays this week',
        primaryAgent: 'smokey',
        frequency: 'daily',
        cronExpression: '0 8 * * *',
        defaultConfig: { daysAhead: 7, discountPercent: 15 },
        requiresApproval: true,
        tier: 'growth',
    },
    {
        id: 'review_management',
        name: 'Google Review Response',
        description: 'Draft replies to new Google reviews — approve before posting',
        primaryAgent: 'mrs_parker',
        frequency: 'daily',
        cronExpression: '0 9 * * *',
        defaultConfig: { minRatingToAlert: 3 },
        requiresApproval: true,
        tier: 'growth',
    },

    // ---- Pro ----
    {
        id: 'weather_triggered_promo',
        name: 'Weather-Triggered Promo',
        description: 'Rainy day? Push delivery promo. Heat wave? Edibles campaign.',
        primaryAgent: 'ezal',
        supportingAgents: ['craig'],
        frequency: 'daily',
        cronExpression: '0 7 * * *',
        defaultConfig: { rainThreshold: 60, heatThresholdF: 90 },
        requiresApproval: true,
        tier: 'pro',
    },
    {
        id: 'local_event_promo',
        name: 'Local Event Boost',
        description: 'Detects nearby events (concerts, games, graduations) and creates prep promos',
        primaryAgent: 'ezal',
        frequency: 'daily',
        cronExpression: '0 7 * * *',
        defaultConfig: { radiusMiles: 10, minAttendance: 500 },
        requiresApproval: true,
        tier: 'pro',
    },
    {
        id: 'loyalty_tier_nudge',
        name: 'Loyalty Tier Nudge',
        description: 'SMS customers within 1 purchase of next loyalty tier',
        primaryAgent: 'smokey',
        frequency: 'daily',
        cronExpression: '0 9 * * *',
        defaultConfig: { purchasesFromTier: 1 },
        requiresApproval: true,
        tier: 'pro',
    },
    {
        id: 'basket_upsell',
        name: 'Basket Builder',
        description: 'Auto-create POS bundles from frequently co-purchased products',
        primaryAgent: 'money_mike',
        frequency: 'daily',
        cronExpression: '30 8 * * *',
        defaultConfig: { minCoPurchaseRate: 0.3, bundleDiscount: 10 },
        requiresApproval: true,
        tier: 'pro',
    },
    {
        id: 'retention_wave_alert',
        name: 'Retention Wave Alert',
        description: 'Weekly: cohort approaching 30-day churn window — proactive outreach',
        primaryAgent: 'smokey',
        supportingAgents: ['craig'],
        frequency: 'weekly',
        cronExpression: '0 9 * * 1',
        defaultConfig: { churnWindowDays: 30, cohortSize: 20 },
        requiresApproval: true,
        tier: 'pro',
    },
    {
        id: 'cross_sell_bundles',
        name: 'Cross-Sell Bundles',
        description: 'Weekly: detect category crossover trends and create bundled offerings',
        primaryAgent: 'smokey',
        supportingAgents: ['money_mike'],
        frequency: 'weekly',
        cronExpression: '0 9 * * 3',
        defaultConfig: { minCrossoverPercent: 15 },
        requiresApproval: true,
        tier: 'pro',
    },
    {
        id: 'margin_optimizer',
        name: 'Margin Optimizer',
        description: 'Weekly: identify inelastic SKUs where +$1-2 won\'t hurt volume',
        primaryAgent: 'money_mike',
        frequency: 'weekly',
        cronExpression: '0 9 * * 2',
        defaultConfig: { minWeeklySales: 5, testIncrementDollars: 1 },
        requiresApproval: true,
        tier: 'pro',
    },
    {
        id: 'dead_stock_clearance',
        name: 'Dead Stock Clearance',
        description: 'Weekly: deep discount on zero-velocity items (60+ days, 0 sales)',
        primaryAgent: 'money_mike',
        frequency: 'weekly',
        cronExpression: '0 9 * * 5',
        defaultConfig: { zeroSalesDays: 60, clearanceDiscount: 50 },
        requiresApproval: true,
        tier: 'pro',
    },
    {
        id: 'staff_performance',
        name: 'Staff Leaderboard',
        description: 'Weekly budtender performance — check-ins assisted, avg basket, ratings',
        primaryAgent: 'pops',
        frequency: 'weekly',
        cronExpression: '0 9 * * 1',
        defaultConfig: {},
        requiresApproval: false,
        tier: 'pro',
    },
    {
        id: 'menu_content_refresh',
        name: 'Menu Content Refresh',
        description: 'Weekly: flag stale product photos and descriptions for Craig to refresh',
        primaryAgent: 'craig',
        frequency: 'weekly',
        cronExpression: '0 9 * * 3',
        defaultConfig: { staleThresholdDays: 30 },
        requiresApproval: true,
        tier: 'pro',
    },
    {
        id: 'competitor_menu_monitor',
        name: 'Competitor Menu Monitor',
        description: 'Daily: track competitor product additions, removals, and category shifts',
        primaryAgent: 'ezal',
        frequency: 'daily',
        cronExpression: '0 9 * * *',
        defaultConfig: {},
        requiresApproval: false,
        tier: 'pro',
    },
    {
        id: 'promo_timing_optimizer',
        name: 'Promo Timing Optimizer',
        description: 'Weekly: analyze traffic patterns and recommend promo schedule changes',
        primaryAgent: 'pops',
        frequency: 'weekly',
        cronExpression: '0 9 * * 1',
        defaultConfig: {},
        requiresApproval: true,
        tier: 'pro',
    },
];

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Activate a playbook for an org using a template.
 * Merges template defaults with any org-specific overrides.
 */
export async function activatePlaybook(
    orgId: string,
    templateId: string,
    overrides?: {
        config?: Record<string, unknown>;
        slackChannel?: string;
        cronTimezone?: string;
        requiresApproval?: boolean;
    },
    activatedBy: string = 'system'
): Promise<PlaybookConfig> {
    const template = PLAYBOOK_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
        throw new Error(`Unknown playbook template: ${templateId}`);
    }

    const db = getAdminFirestore();
    const now = Timestamp.now();

    const playbook: PlaybookConfig = {
        id: template.id,
        orgId,
        enabled: true,
        name: template.name,
        description: template.description,
        cronExpression: template.cronExpression,
        cronTimezone: overrides?.cronTimezone ?? 'America/New_York',
        frequency: template.frequency,
        primaryAgent: template.primaryAgent,
        supportingAgents: template.supportingAgents,
        config: { ...template.defaultConfig, ...overrides?.config },
        requiresApproval: overrides?.requiresApproval ?? template.requiresApproval,
        slackChannel: overrides?.slackChannel,
        approvalRoles: ['owner', 'manager'],
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
        createdBy: activatedBy,
    };

    await db
        .collection('tenants')
        .doc(orgId)
        .collection('playbooks')
        .doc(template.id)
        .set({
            ...playbook,
            createdAt: now,
            updatedAt: now,
        });

    logger.info('[PlaybookConfig] Activated', {
        orgId,
        playbookId: template.id,
        activatedBy,
    });

    return playbook;
}

/**
 * Activate a bundle of playbooks (starter, growth, or pro).
 */
export async function activatePlaybookBundle(
    orgId: string,
    tier: 'starter' | 'growth' | 'pro',
    options?: {
        slackChannel?: string;
        cronTimezone?: string;
    },
    activatedBy: string = 'system'
): Promise<PlaybookConfig[]> {
    const tierOrder = ['starter', 'growth', 'pro'];
    const maxTierIndex = tierOrder.indexOf(tier);

    const templates = PLAYBOOK_TEMPLATES.filter(
        t => tierOrder.indexOf(t.tier) <= maxTierIndex
    );

    const results: PlaybookConfig[] = [];
    for (const template of templates) {
        const playbook = await activatePlaybook(orgId, template.id, {
            slackChannel: options?.slackChannel,
            cronTimezone: options?.cronTimezone,
        }, activatedBy);
        results.push(playbook);
    }

    logger.info('[PlaybookConfig] Bundle activated', {
        orgId,
        tier,
        count: results.length,
    });

    return results;
}

/**
 * Get all active playbooks for an org.
 */
export async function getActivePlaybooks(orgId: string): Promise<PlaybookConfig[]> {
    const db = getAdminFirestore();
    const snap = await db
        .collection('tenants')
        .doc(orgId)
        .collection('playbooks')
        .where('enabled', '==', true)
        .get();

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlaybookConfig));
}

/**
 * Get a specific playbook config.
 */
export async function getPlaybook(orgId: string, playbookId: string): Promise<PlaybookConfig | null> {
    const db = getAdminFirestore();
    const doc = await db
        .collection('tenants')
        .doc(orgId)
        .collection('playbooks')
        .doc(playbookId)
        .get();

    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as PlaybookConfig;
}

/**
 * Disable a playbook.
 */
export async function disablePlaybook(orgId: string, playbookId: string): Promise<void> {
    const db = getAdminFirestore();
    await db
        .collection('tenants')
        .doc(orgId)
        .collection('playbooks')
        .doc(playbookId)
        .update({ enabled: false, updatedAt: Timestamp.now() });

    logger.info('[PlaybookConfig] Disabled', { orgId, playbookId });
}

/**
 * Update playbook config (operator tuning their settings).
 */
export async function updatePlaybookConfig(
    orgId: string,
    playbookId: string,
    updates: Partial<Pick<PlaybookConfig, 'config' | 'requiresApproval' | 'slackChannel' | 'cronExpression' | 'cronTimezone'>>
): Promise<void> {
    const db = getAdminFirestore();
    await db
        .collection('tenants')
        .doc(orgId)
        .collection('playbooks')
        .doc(playbookId)
        .update({ ...updates, updatedAt: Timestamp.now() });

    logger.info('[PlaybookConfig] Updated', { orgId, playbookId, fields: Object.keys(updates) });
}
