/**
 * TIERS.ts - Single Source of Truth for Pricing Tiers
 *
 * All downstream code reads from this file:
 * - Pricing UI components
 * - Checkout logic
 * - Feature gating (dashboard)
 * - Playbook assignment
 * - Usage metering & overages
 *
 * DO NOT hardcode prices, allocations, or playbook IDs elsewhere.
 */

export const TIERS = {
  scout: {
    id: 'scout',
    name: 'The Scout',
    tagline: 'Monitor your market. Zero commitment.',
    price: 0,
    priceId: null, // No Authorize.net subscription
    allocations: {
      aiSessions: 25,
      smsCustomer: 0,
      smsInternal: 0,
      emails: 0,
      competitors: 1,
      zipCodes: 1,
      creativeAssets: 0,
      customCampaigns: 0,
      playbooks: 3,
      playbookIds: [
        'welcome-sequence',
        'weekly-competitive-snapshot',
        'tier-upgrade-nudge',
      ],
      staffPhoneNumbers: 0,
    },
    features: {
      headlessMenu: false,
      smokey: true, // limited to 25 AI sessions
      craig: false,
      ezal: true, // limited to 1 competitor, weekly only
      deebo: false,
      bigWorm: false,
      complianceChecks: false,
      analytics: false,
      prioritySupport: false,
      dedicatedCSM: false,
      customIntegrations: false,
      multiLocation: false,
      whiteGloveOnboarding: false,
    },
    overages: null, // No overages on free tier
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Turn your menu into your #1 sales channel.',
    badge: 'Best Value',
    price: 99,
    priceId: 'AUTHORIZE_NET_PRO_SUBSCRIPTION_ID',
    allocations: {
      aiSessions: -1, // unlimited
      smsCustomer: 500,
      smsInternal: 50,
      emails: 5000,
      competitors: 3,
      zipCodes: 3,
      creativeAssets: 10,
      customCampaigns: 3,
      playbooks: 11,
      playbookIds: [
        // Onboarding (3)
        'welcome-sequence',
        'owner-quickstart-guide',
        'menu-health-scan',
        // Engagement (2)
        'post-purchase-thank-you',
        'birthday-loyalty-reminder',
        // Competitive Intel (1)
        'pro-competitive-brief',
        // Compliance (2)
        'weekly-compliance-digest',
        'pre-send-campaign-check',
        // Analytics (1)
        'weekly-performance-snapshot',
        // System (2)
        'usage-alert',
        'tier-upgrade-nudge',
      ],
      staffPhoneNumbers: 5,
    },
    features: {
      headlessMenu: true,
      smokey: true,
      craig: true,
      ezal: false, // add-on ($49/mo)
      deebo: true,
      bigWorm: false, // add-on ($49/mo)
      complianceChecks: true,
      analytics: false, // basic only
      prioritySupport: false,
      dedicatedCSM: false,
      customIntegrations: false,
      multiLocation: false,
      whiteGloveOnboarding: false,
    },
    overages: {
      sms: 0.05,
      email: 0.002,
      creativeAssets: 2.0,
      zipCodes: 10, // per month
      competitors: 5, // per month
    },
  },

  growth: {
    id: 'growth',
    name: 'Growth',
    tagline: 'Scale your reach. Automate retention.',
    price: 349,
    priceId: 'AUTHORIZE_NET_GROWTH_SUBSCRIPTION_ID',
    allocations: {
      aiSessions: -1, // unlimited
      smsCustomer: 2000,
      smsInternal: 50,
      emails: 15000,
      competitors: 10,
      zipCodes: 10,
      creativeAssets: 50,
      customCampaigns: -1, // unlimited
      playbooks: 17,
      playbookIds: [
        // All 11 from Pro, plus 6 more:
        'welcome-sequence',
        'owner-quickstart-guide',
        'menu-health-scan',
        'post-purchase-thank-you',
        'birthday-loyalty-reminder',
        'pro-competitive-brief',
        'weekly-compliance-digest',
        'pre-send-campaign-check',
        'weekly-performance-snapshot',
        'usage-alert',
        'tier-upgrade-nudge',
        // Engagement (+2)
        'win-back-sequence',
        'new-product-launch',
        // Competitive Intel (+1)
        'daily-competitive-intel',
        // Compliance (+1)
        'jurisdiction-change-alert',
        // Analytics (+1)
        'campaign-roi-report',
        // Seasonal (+1)
        'seasonal-template-pack',
      ],
      staffPhoneNumbers: 5,
    },
    features: {
      headlessMenu: true,
      smokey: true,
      craig: true,
      ezal: false, // add-on but unlocks daily intel
      deebo: true,
      bigWorm: false, // add-on
      complianceChecks: true,
      analytics: true,
      prioritySupport: true,
      dedicatedCSM: false,
      customIntegrations: false,
      multiLocation: false,
      whiteGloveOnboarding: false,
    },
    overages: {
      sms: 0.04,
      email: 0.002,
      creativeAssets: 1.5,
      zipCodes: 8,
      competitors: 4,
    },
  },

  empire: {
    id: 'empire',
    name: 'Empire',
    tagline: 'For MSOs & high-volume operations.',
    price: 999, // starting at — $999/location flat
    priceId: 'AUTHORIZE_NET_EMPIRE_SUBSCRIPTION_ID',
    allocations: {
      aiSessions: -1, // unlimited
      smsCustomer: 5000,
      smsInternal: 50,
      emails: 50000,
      competitors: -1, // unlimited
      zipCodes: -1, // unlimited
      creativeAssets: -1, // unlimited
      customCampaigns: -1, // unlimited
      playbooks: 23,
      playbookIds: [
        // All 17 from Growth, plus 6 more:
        'welcome-sequence',
        'owner-quickstart-guide',
        'menu-health-scan',
        'post-purchase-thank-you',
        'birthday-loyalty-reminder',
        'pro-competitive-brief',
        'weekly-compliance-digest',
        'pre-send-campaign-check',
        'weekly-performance-snapshot',
        'usage-alert',
        'tier-upgrade-nudge',
        'win-back-sequence',
        'new-product-launch',
        'daily-competitive-intel',
        'jurisdiction-change-alert',
        'campaign-roi-report',
        'seasonal-template-pack',
        // Onboarding (+1)
        'white-glove-onboarding',
        // Engagement (+1)
        'vip-customer-identification',
        // Competitive Intel (+1)
        'real-time-price-alerts',
        // Analytics (+2)
        'executive-daily-digest',
        'multi-location-rollup',
        // Compliance (+1)
        'audit-prep-automation',
      ],
      staffPhoneNumbers: 15,
    },
    features: {
      headlessMenu: true,
      smokey: true,
      craig: true,
      ezal: true, // included
      deebo: true,
      bigWorm: true, // included
      complianceChecks: true,
      analytics: true,
      prioritySupport: true,
      dedicatedCSM: true,
      customIntegrations: true,
      multiLocation: true,
      whiteGloveOnboarding: true,
    },
    overages: {
      sms: 0.03,
      email: 0.001,
      creativeAssets: null, // unlimited
      zipCodes: null,
      competitors: null,
    },
  },
} as const;

/**
 * CREATIVE_ASSET_DEFINITION
 *
 * A "creative asset" = one AI-generated output. Specifically:
 * - Email campaign (subject + body + variations = 1 asset)
 * - SMS copy = 1 asset
 * - Social media post = 1 asset
 * - Blog title + meta description = 1 asset
 * - Product description rewrite = 1 asset
 * - Multiple A/B variations of the same piece = still 1 asset
 *
 * NOT a creative asset (doesn't count against allocation):
 * - Smokey budtender conversations (counted under AI sessions)
 * - Ezal competitive reports (counted under intel reports)
 * - Deebo compliance checks (unlimited on all paid tiers)
 * - Dashboard notifications / playbook emails (system-generated)
 */
export const CREATIVE_ASSET_DEFINITION = `
A creative asset = one AI-generated output:
- Email campaign (with subject + body + variations) = 1 asset
- SMS copy variation = 1 asset
- Social media post = 1 asset
- Blog title + meta description = 1 asset
- Product description rewrite = 1 asset
- Multiple A/B variations of the same piece = still 1 asset

Video, designs, custom imagery = custom integrations add-on
`;

/**
 * PLAYBOOK_VS_CAMPAIGN_TABLE
 *
 * Playbooks = pre-built, managed-by-BakedBot automation templates
 *   - Run on schedules or event triggers
 *   - Customers can toggle on/off but cannot edit logic
 *   - Examples: welcome sequence, competitive snapshot, compliance digest
 *
 * Custom Campaigns = sequences customer builds using Craig
 *   - Choose audience, message, channel, timing, cadence
 *   - Pro: 3 active custom campaigns
 *   - Growth/Empire: unlimited
 *
 * | Tier   | Pre-Built Playbooks | Custom Campaigns | Total Active |
 * |--------|-------------------|------------------|--------------|
 * | Scout  | 3                 | 0                | 3            |
 * | Pro    | 11                | 3                | 14           |
 * | Growth | 17                | Unlimited        | Unlimited    |
 * | Empire | 23                | Unlimited        | Unlimited    |
 */

// Type export for TypeScript narrowing
export type TierId = keyof typeof TIERS;
export type TierConfig = typeof TIERS[TierId];

// ---------------------------------------------------------------------------
// FEATURE GATES — Tier-specific data access (§1.1e)
// Used by dashboard to render locked states with upgrade prompts
// ---------------------------------------------------------------------------

export const FEATURE_GATES = {
  competitiveIntel: {
    scout: {
      competitorNames: true,
      competitorCategories: true,
      competitorPricing: false,      // Hidden — upgrade prompt
      stockLevels: false,            // Hidden — upgrade prompt
      priceChangeAlerts: false,      // None
      competitorsTracked: 1,
      dashboardAccess: false,        // No live dashboard — weekly email only
      reportDelivery: 'weekly_email_only',
    },
    pro: {
      competitorNames: true,
      competitorCategories: true,
      competitorPricing: true,
      stockLevels: true,
      priceChangeAlerts: true,
      priceChangeFrequency: 'weekly',
      competitorsTracked: 3,
      dashboardAccess: true,
      reportDelivery: 'weekly_email_and_dashboard',
    },
    growth: {
      competitorNames: true,
      competitorCategories: true,
      competitorPricing: true,
      stockLevels: true,
      priceChangeAlerts: true,
      priceChangeFrequency: 'daily',
      competitorsTracked: 10,
      dashboardAccess: true,
      reportDelivery: 'daily_email_and_dashboard',
    },
    empire: {
      competitorNames: true,
      competitorCategories: true,
      competitorPricing: true,
      stockLevels: true,
      priceChangeAlerts: true,
      priceChangeFrequency: 'realtime_sms',
      competitorsTracked: -1,         // Unlimited
      dashboardAccess: true,
      reportDelivery: 'realtime_daily_and_dashboard',
    },
  },
} as const;

// ---------------------------------------------------------------------------
// EMPIRE COGS BREAKDOWN — $999/mo target, ~51.3% gross margin (§1.1d)
// ---------------------------------------------------------------------------

export const EMPIRE_COGS = {
  aiPlaybookAutomation: 228,   // Genkit/Gemini compute for 23 playbooks
  smsCustomer5k: 165,          // 5,000 SMS × $0.033 avg COGS
  email50k: 50,                // 50,000 emails via Mailjet
  smsInternal50: 1.65,         // Internal staff alerts (50/mo)
  crawling: 1.26,              // Ezal competitor crawling
  infrastructure: 20,          // Firebase hosting, Firestore, storage
  csmOnboardingAmortized: 20,  // 4 hrs × $60/hr CSM ÷ 12 months (§1.1d)
  total: 485.91,
  grossMarginAtListPrice: 0.513,
} as const;

// ---------------------------------------------------------------------------
// BEHAVIORAL UPGRADE SIGNALS (§1.1f)
// Firestore collection: upgrade_signals
// ---------------------------------------------------------------------------

export interface UpgradeSignal {
  userId: string;
  orgId: string;
  fromTier: TierId;
  toTier: TierId;
  signalType:
    | 'high_smokey_usage'          // 3+ queries/day for 5+ days → Scout → Pro
    | 'repeated_snapshot_views'    // Views competitive snapshot 3 weeks in a row → Scout → Pro
    | 'locked_pricing_attempts'    // Attempts to access locked pricing data 2+ times → Scout → Pro
    | 'sms_cap_hit_repeatedly'     // Hits 80% SMS 2 months in a row → Pro → Growth
    | 'campaign_cap_hit'           // 3 active campaigns simultaneously → Pro → Growth
    | 'intel_engagement_high'      // Opens Ezal reports within 1hr, 3+ times → Pro → Growth
    | 'competitor_search_overflow' // Searches for competitor outside allocation → Pro → Growth
    | 'multi_location_mention'     // Mentions "second location" in Smokey → Growth → Empire
    | 'multi_license_upload'       // Uploads products from multiple licenses → Growth → Empire
    | 'pos_integration_request'    // Asks about POS integration → Growth → Empire
    | 'audit_prep_request';        // Asks about compliance documentation → Growth → Empire
  signalDetail: string;           // e.g. "hit_25_msg_limit", "viewed_locked_pricing_3x"
  score: number;                  // Increment per signal (threshold: 3+ in 30 days → trigger nudge)
  recordedAt: Date;
}

// ---------------------------------------------------------------------------
// CONVERSION TRACKING (§1.1g)
// Firestore collection: conversion_events
// ---------------------------------------------------------------------------

export interface ConversionEvent {
  userId: string;
  orgId: string;
  fromTier: 'scout' | 'pro' | 'growth';
  toTier: 'pro' | 'growth' | 'empire';
  triggerSource:
    | 'feature_ceiling'
    | 'upgrade_nudge_playbook'
    | 'competitive_snapshot'
    | 'behavioral_signal'
    | 'manual'
    | 'sales_call';
  triggerDetail: string;  // e.g. "hit_25_msg_limit", "viewed_locked_pricing_3x"
  daysFromSignup: number;
  convertedAt: Date;
}

// Upgrade signal score threshold — when a tier accumulates this many signals
// within a 30-day window, trigger the upgrade nudge playbook
export const UPGRADE_SIGNAL_THRESHOLD = 3;
export const UPGRADE_SIGNAL_WINDOW_DAYS = 30;
