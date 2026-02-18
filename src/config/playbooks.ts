/**
 * PLAYBOOKS.ts — BakedBot Playbook Registry
 *
 * Single source of truth for all 23 managed playbooks.
 * Each entry defines the trigger, agent, tier access, delivery channel,
 * execution schedule, and estimated monthly COGS.
 *
 * Playbooks = pre-built automations managed by BakedBot (toggle on/off).
 * Custom Campaigns = built by the customer using Craig (separate allocation).
 *
 * Execution schedule reference (§1.1h):
 *   one_time     → Fired once on trigger event
 *   daily        → 7:00 AM local timezone
 *   weekly       → Monday 9:00 AM local timezone
 *   monthly      → 1st of month, 8:00 AM local timezone
 *   event_driven → Within 5 minutes of trigger
 *   quarterly    → Jan 1, Apr 1, Jul 1, Oct 1
 */

import type { TierId } from './tiers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlaybookAgent = 'craig' | 'smokey' | 'ezal' | 'deebo' | 'big_worm' | 'system';

export type PlaybookChannel = 'email' | 'dashboard' | 'sms_internal' | 'sms_customer';

export type PlaybookFrequency =
  | 'one_time'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'event_driven';

export type PlaybookTrigger =
  | { type: 'schedule'; frequency: Exclude<PlaybookFrequency, 'event_driven'> }
  | { type: 'event'; event: PlaybookEventType };

export type PlaybookEventType =
  | 'customer.signup'
  | 'menu.import_complete'
  | 'owner.day3'               // 3 days after signup — quickstart nudge
  | 'competitor.price_change'
  | 'competitor.menu_shakeup'
  | 'campaign.pre_send'
  | 'usage.at_80_percent'
  | 'usage.feature_ceiling'
  | 'order.post_purchase'
  | 'customer.birthday'
  | 'customer.30_day_inactive'
  | 'inventory.new_product'
  | 'compliance.jurisdiction_change'
  | 'billing.new_empire_signup';

export interface PlaybookDefinition {
  id: string;
  name: string;
  agent: PlaybookAgent;
  description: string;
  /** Which tiers include this playbook */
  tiers: TierId[];
  channels: PlaybookChannel[];
  trigger: PlaybookTrigger;
  /** Estimated monthly COGS in USD (email + AI compute + SMS) */
  estimatedMonthlyCostUsd: number;
}

// ---------------------------------------------------------------------------
// Registry — all 23 playbooks
// ---------------------------------------------------------------------------

export const PLAYBOOKS: Record<string, PlaybookDefinition> = {

  // ── ONBOARDING (Scout: 1, Pro: 3, Growth: 3, Empire: 4) ──────────────────

  'welcome-sequence': {
    id: 'welcome-sequence',
    name: 'Welcome Sequence',
    agent: 'craig',
    description: '3-touch email sequence: Day 0 welcome, Day 3 tips, Day 7 value check-in.',
    tiers: ['scout', 'pro', 'growth', 'empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'event', event: 'customer.signup' },
    estimatedMonthlyCostUsd: 0.10,
  },

  'owner-quickstart-guide': {
    id: 'owner-quickstart-guide',
    name: 'Owner Quickstart Guide',
    agent: 'craig',
    description: 'Day 3 email with personalized setup checklist based on what the owner has/hasn\'t configured.',
    tiers: ['pro', 'growth', 'empire'],
    channels: ['email'],
    trigger: { type: 'event', event: 'owner.day3' },
    estimatedMonthlyCostUsd: 0.05,
  },

  'menu-health-scan': {
    id: 'menu-health-scan',
    name: 'Menu Health Scan',
    agent: 'smokey',
    description: 'Day 2 audit after menu import: flags missing descriptions, images, prices.',
    tiers: ['pro', 'growth', 'empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'event', event: 'menu.import_complete' },
    estimatedMonthlyCostUsd: 0.15,
  },

  'white-glove-onboarding': {
    id: 'white-glove-onboarding',
    name: 'White-Glove Onboarding',
    agent: 'craig',
    description: '14-day guided setup: AI-generated checklist emails, progress tracking, configuration templates. CSM human time billed separately.',
    tiers: ['empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'event', event: 'billing.new_empire_signup' },
    estimatedMonthlyCostUsd: 1.50,
  },

  // ── ENGAGEMENT (Pro: 2, Growth: +2, Empire: +1) ───────────────────────────

  'post-purchase-thank-you': {
    id: 'post-purchase-thank-you',
    name: 'Post-Purchase Thank You',
    agent: 'craig',
    description: 'Automated thank-you email after each order with review request and product tips.',
    tiers: ['pro', 'growth', 'empire'],
    channels: ['email'],
    trigger: { type: 'event', event: 'order.post_purchase' },
    estimatedMonthlyCostUsd: 0.20,
  },

  'birthday-loyalty-reminder': {
    id: 'birthday-loyalty-reminder',
    name: 'Birthday Loyalty Reminder',
    agent: 'craig',
    description: 'Monthly birthday cohort email with a loyalty reward offer.',
    tiers: ['pro', 'growth', 'empire'],
    channels: ['email'],
    trigger: { type: 'schedule', frequency: 'monthly' },
    estimatedMonthlyCostUsd: 0.15,
  },

  'win-back-sequence': {
    id: 'win-back-sequence',
    name: 'Win-Back Sequence',
    agent: 'craig',
    description: '3-touch re-engagement sequence triggered when a customer goes 30 days without a purchase.',
    tiers: ['growth', 'empire'],
    channels: ['email'],
    trigger: { type: 'event', event: 'customer.30_day_inactive' },
    estimatedMonthlyCostUsd: 0.30,
  },

  'new-product-launch': {
    id: 'new-product-launch',
    name: 'New Product Launch',
    agent: 'craig',
    description: 'Automated announcement email when new products are added to inventory.',
    tiers: ['growth', 'empire'],
    channels: ['email'],
    trigger: { type: 'event', event: 'inventory.new_product' },
    estimatedMonthlyCostUsd: 0.15,
  },

  'vip-customer-identification': {
    id: 'vip-customer-identification',
    name: 'VIP Customer Identification',
    agent: 'craig',
    description: 'Monthly report identifying top spenders for VIP recognition + special offers.',
    tiers: ['empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'schedule', frequency: 'monthly' },
    estimatedMonthlyCostUsd: 0.20,
  },

  // ── COMPETITIVE INTEL (Scout: 1, Pro: 1, Growth: +1, Empire: +1) ─────────

  'weekly-competitive-snapshot': {
    id: 'weekly-competitive-snapshot',
    name: 'Weekly Competitive Snapshot',
    agent: 'ezal',
    description: 'Scout-tier weekly email: competitor names and categories visible; pricing and stock hidden.',
    tiers: ['scout'],
    channels: ['email'],
    trigger: { type: 'schedule', frequency: 'weekly' },
    estimatedMonthlyCostUsd: 0.30,
  },

  'pro-competitive-brief': {
    id: 'pro-competitive-brief',
    name: 'Pro Competitive Brief',
    agent: 'ezal',
    description: 'Weekly competitive brief with full pricing data for up to 3 competitors.',
    tiers: ['pro', 'growth', 'empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'schedule', frequency: 'weekly' },
    estimatedMonthlyCostUsd: 0.60,
  },

  'daily-competitive-intel': {
    id: 'daily-competitive-intel',
    name: 'Daily Competitive Intel',
    agent: 'ezal',
    description: 'Daily 7 AM report covering up to 10 competitors: price changes, new products, menu shakeups.',
    tiers: ['growth', 'empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'schedule', frequency: 'daily' },
    estimatedMonthlyCostUsd: 1.80,
  },

  'real-time-price-alerts': {
    id: 'real-time-price-alerts',
    name: 'Real-Time Price Alerts',
    agent: 'ezal',
    description: 'Continuous monitoring. SMS to staff when competitor drops price ≥10% or shakes up menu ≥20%.',
    tiers: ['empire'],
    channels: ['sms_internal', 'dashboard'],
    trigger: { type: 'event', event: 'competitor.price_change' },
    estimatedMonthlyCostUsd: 2.50,
  },

  // ── COMPLIANCE (Pro: 2, Growth: +1, Empire: +1) ───────────────────────────

  'weekly-compliance-digest': {
    id: 'weekly-compliance-digest',
    name: 'Weekly Compliance Digest',
    agent: 'deebo',
    description: 'Monday morning summary of compliance posture: what was checked, flagged, and resolved last week.',
    tiers: ['pro', 'growth', 'empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'schedule', frequency: 'weekly' },
    estimatedMonthlyCostUsd: 0.20,
  },

  'pre-send-campaign-check': {
    id: 'pre-send-campaign-check',
    name: 'Pre-Send Campaign Check',
    agent: 'deebo',
    description: 'Compliance review of email/SMS content before campaigns send. Flags restricted claims and required disclaimers.',
    tiers: ['pro', 'growth', 'empire'],
    channels: ['dashboard'],
    trigger: { type: 'event', event: 'campaign.pre_send' },
    estimatedMonthlyCostUsd: 0.30,
  },

  'jurisdiction-change-alert': {
    id: 'jurisdiction-change-alert',
    name: 'Jurisdiction Change Alert',
    agent: 'deebo',
    description: 'Alert when regulatory rules change in the dispensary\'s operating state. Includes action checklist.',
    tiers: ['growth', 'empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'event', event: 'compliance.jurisdiction_change' },
    estimatedMonthlyCostUsd: 0.15,
  },

  'audit-prep-automation': {
    id: 'audit-prep-automation',
    name: 'Audit Prep Automation',
    agent: 'deebo',
    description: 'Quarterly audit package: immutable compliance logs, campaign records, approval trail export.',
    tiers: ['empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'schedule', frequency: 'quarterly' },
    estimatedMonthlyCostUsd: 0.50,
  },

  // ── ANALYTICS (Pro: 1, Growth: +1, Empire: +2) ───────────────────────────

  'weekly-performance-snapshot': {
    id: 'weekly-performance-snapshot',
    name: 'Weekly Performance Snapshot',
    agent: 'big_worm',
    description: 'Monday 9 AM email: top products, conversion rates, SMS/email performance vs prior week.',
    tiers: ['pro', 'growth', 'empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'schedule', frequency: 'weekly' },
    estimatedMonthlyCostUsd: 0.30,
  },

  'campaign-roi-report': {
    id: 'campaign-roi-report',
    name: 'Campaign ROI Report',
    agent: 'big_worm',
    description: 'Per-campaign revenue attribution report generated at month-end.',
    tiers: ['growth', 'empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'schedule', frequency: 'monthly' },
    estimatedMonthlyCostUsd: 0.40,
  },

  'executive-daily-digest': {
    id: 'executive-daily-digest',
    name: 'Executive Daily Digest',
    agent: 'big_worm',
    description: 'Daily multi-agent rollup: revenue, compliance posture, competitor moves, top actions for the day.',
    tiers: ['empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'schedule', frequency: 'daily' },
    estimatedMonthlyCostUsd: 2.00,
  },

  'multi-location-rollup': {
    id: 'multi-location-rollup',
    name: 'Multi-Location Rollup',
    agent: 'big_worm',
    description: 'Monthly cross-location performance report for MSOs: revenue, compliance, and competitive data by location.',
    tiers: ['empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'schedule', frequency: 'monthly' },
    estimatedMonthlyCostUsd: 0.60,
  },

  // ── SEASONAL ──────────────────────────────────────────────────────────────

  'seasonal-template-pack': {
    id: 'seasonal-template-pack',
    name: 'Seasonal Template Pack',
    agent: 'craig',
    description: 'Quarterly AI-generated campaign template pack tailored to the season (holiday, summer, etc.).',
    tiers: ['growth', 'empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'schedule', frequency: 'quarterly' },
    estimatedMonthlyCostUsd: 0.20,
  },

  // ── SYSTEM ────────────────────────────────────────────────────────────────

  'usage-alert': {
    id: 'usage-alert',
    name: 'Usage Alert',
    agent: 'system',
    description: 'Dashboard + email notification when any resource hits 80% of monthly allocation.',
    tiers: ['pro', 'growth', 'empire'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'event', event: 'usage.at_80_percent' },
    estimatedMonthlyCostUsd: 0.05,
  },

  'tier-upgrade-nudge': {
    id: 'tier-upgrade-nudge',
    name: 'Tier Upgrade Nudge',
    agent: 'system',
    description: 'Personalized upgrade prompt triggered by behavioral signals or feature ceiling hits.',
    tiers: ['scout', 'pro', 'growth'],
    channels: ['email', 'dashboard'],
    trigger: { type: 'event', event: 'usage.feature_ceiling' },
    estimatedMonthlyCostUsd: 0.05,
  },
} as const;

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** All playbook IDs for a given tier */
export function getPlaybookIdsForTier(tierId: TierId): string[] {
  return Object.values(PLAYBOOKS)
    .filter((p) => p.tiers.includes(tierId))
    .map((p) => p.id);
}

/** Playbooks by agent */
export function getPlaybooksByAgent(agent: PlaybookAgent): PlaybookDefinition[] {
  return Object.values(PLAYBOOKS).filter((p) => p.agent === agent);
}

/** Total estimated COGS for all playbooks on a given tier */
export function getPlaybookCogsByTier(tierId: TierId): number {
  return Object.values(PLAYBOOKS)
    .filter((p) => p.tiers.includes(tierId))
    .reduce((sum, p) => sum + p.estimatedMonthlyCostUsd, 0);
}

/**
 * PLAYBOOK_EXECUTION_SCHEDULE reference (§1.1h)
 *
 * one_time   → On trigger event (signup, menu import, empire signup)
 * daily      → 7:00 AM local timezone (competitive intel, exec digest)
 * weekly     → Monday 9:00 AM local timezone (reports, snapshots, digests)
 * monthly    → 1st of month, 8:00 AM local timezone (birthday, roi, multi-location)
 * quarterly  → Jan 1, Apr 1, Jul 1, Oct 1 (audit prep, seasonal pack)
 * event_driven → Within 5 min of trigger (post-purchase, price alerts, usage 80%, compliance)
 */

export type PlaybookId = keyof typeof PLAYBOOKS;
