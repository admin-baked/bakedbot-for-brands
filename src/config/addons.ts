/**
 * ADDONS.ts - Optional Add-On Modules
 *
 * Available on Pro & Growth tiers. Included in Empire.
 */

export const ADDONS = {
  ezal: {
    id: 'ezal',
    name: 'Ezal — Intel Engine',
    price: 49,
    description:
      'Competitor tracking, price alerts, market summaries. Unlock daily competitive intelligence and real-time price monitoring.',
    availableOn: ['pro', 'growth'], // included in empire
    features: [
      'Daily competitive intelligence reports',
      'Real-time price change alerts',
      'Competitor menu tracking',
      'Market opportunity detection',
      'Category trend analysis',
    ],
  },

  bigWorm: {
    id: 'bigWorm',
    name: 'Big Worm — Analytics',
    price: 49,
    description:
      'Revenue dashboards, retention insights, demand forecasting. Deep-dive into your business metrics.',
    availableOn: ['pro', 'growth'],
    features: [
      'Revenue & margin dashboards',
      'Customer retention cohorts',
      'Demand forecasting',
      'Lifetime value analysis',
      'Exportable reports',
    ],
  },

  ezalBigWormBundle: {
    id: 'ezalBigWormBundle',
    name: 'Intel + Analytics Bundle',
    price: 79, // vs $98 separate — save $19
    description:
      'Get both Ezal and Big Worm together at a discount. Full competitive intelligence + advanced analytics.',
    availableOn: ['pro', 'growth'],
    includesAddons: ['ezal', 'bigWorm'],
    features: [
      'Everything in Ezal (daily intel, price alerts)',
      'Everything in Big Worm (analytics, dashboards)',
      'Single invoice, easier billing',
    ],
  },

  customIntegrations: {
    id: 'customIntegrations',
    name: 'Custom Integrations',
    price: 99,
    description:
      'POS sync, loyalty bridges, ERP connections, custom webhooks. Connect BakedBot to your existing systems.',
    availableOn: ['pro', 'growth'],
    features: [
      'POS integration (Cova, Dutchie, Treez, custom)',
      'Loyalty platform bridges (SpringBig, Toast)',
      'ERP system connections',
      'Custom webhook setup',
      'Technical onboarding support',
    ],
  },
} as const;

export type AddonId = keyof typeof ADDONS;
export type AddonConfig = typeof ADDONS[AddonId];
