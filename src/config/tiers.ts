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
