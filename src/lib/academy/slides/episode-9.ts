/**
 * Episode 9: Meet Money Mike - Revenue Optimization
 *
 * Learning Objectives:
 * - Understand dynamic pricing strategies for cannabis
 * - Learn how to balance margin optimization with customer retention
 * - Discover how to price clearance and expiring inventory
 * - See real examples of pricing experiments and results
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_9_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep9-title',
    type: 'title',
    episodeNumber: 9,
    title: 'Meet Money Mike',
    subtitle: 'Dynamic Pricing That Maximizes Margins',
    trackColor: '#10b981',
    notes: 'Money Mike is all about the bottom line. Margin is life.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep9-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'Dynamic pricing strategies for cannabis retail',
      'Balancing margin optimization with customer loyalty',
      'Pricing clearance and expiring inventory',
      'Real pricing experiments with actual results',
    ],
    notes: 'Revenue-focused episode with practical strategies.',
  },

  // ============================================================
  // SLIDE 3: The Margin Problem
  // ============================================================
  {
    id: 'ep9-margin-problem',
    type: 'content',
    title: 'The Cannabis Margin Squeeze',
    bullets: [
      'Competition driving prices down constantly',
      '280E means you can\'t deduct most expenses',
      'Expiring inventory = lost money',
      'Guessing at prices instead of optimizing',
      'Race to the bottom helps nobody',
    ],
    highlight: 'Revenue is vanity. Margin is sanity. Cash is king.',
    notes: 'Set up the margin challenge.',
  },

  // ============================================================
  // SLIDE 4: Meet Money Mike
  // ============================================================
  {
    id: 'ep9-money-mike-intro',
    type: 'agent',
    agentId: 'money-mike',
    agentName: 'Money Mike the Optimizer',
    tagline: 'Maximize Revenue & Margins',
    description: 'Money Mike uses AI to find the optimal price for every product, manage promotions strategically, and protect your margins.',
    capabilities: [
      'Dynamic pricing optimization',
      'Margin protection alerts',
      'Promotion ROI analysis',
      'Clearance automation',
    ],
    color: '#10b981',
    icon: 'dollar-sign',
    notes: 'Full introduction to Money Mike.',
  },

  // ============================================================
  // SLIDE 5: Dynamic Pricing Explained
  // ============================================================
  {
    id: 'ep9-dynamic-pricing',
    type: 'content',
    title: 'What Is Dynamic Pricing?',
    bullets: [
      'Prices that adjust based on market conditions',
      'Demand: More demand = price can increase',
      'Competition: Competitor drops price = respond strategically',
      'Inventory: Too much stock = price to move it',
      'Time: Happy hour pricing, day-of-week patterns',
    ],
    highlight: 'The right price at the right time for the right customer.',
    notes: 'Explain dynamic pricing concept.',
  },

  // ============================================================
  // SLIDE 6: Pricing Stat
  // ============================================================
  {
    id: 'ep9-pricing-stat',
    type: 'stat',
    stat: '5-15%',
    label: 'margin improvement from dynamic pricing',
    context: 'On the same products, at the same volume. Just smarter pricing.',
    notes: 'Show the potential impact.',
  },

  // ============================================================
  // SLIDE 7: Pricing Strategies
  // ============================================================
  {
    id: 'ep9-strategies',
    type: 'split',
    title: 'Money Mike\'s Pricing Strategies',
    leftTitle: 'Margin Protection',
    leftBullets: [
      'Minimum margin rules by category',
      'Alert when margins slip below threshold',
      'Identify loss leaders (intentional vs. accidental)',
      'Cost change pass-through recommendations',
      'Vendor negotiation data',
    ],
    rightTitle: 'Revenue Optimization',
    rightBullets: [
      'Price elasticity testing',
      'Bundle pricing optimization',
      'Premium product positioning',
      'Happy hour/time-based pricing',
      'Loyalty tier pricing',
    ],
    notes: 'Show both protection and growth strategies.',
  },

  // ============================================================
  // SLIDE 8: Competitive Response
  // ============================================================
  {
    id: 'ep9-competitive-response',
    type: 'content',
    title: 'Responding to Competitive Price Changes',
    bullets: [
      'Ezal alerts: "Competitor dropped flower prices 10%"',
      'Money Mike analyzes: Impact on your margins if you match?',
      'Options: Match on top sellers only, ignore niche products',
      'Counter-strategy: Match price but add value (loyalty points)',
      'Auto-execute or approve each decision',
    ],
    highlight: 'Match strategically, not reflexively.',
    notes: 'Connect to Ezal\'s intelligence.',
  },

  // ============================================================
  // SLIDE 9: Inventory-Based Pricing
  // ============================================================
  {
    id: 'ep9-inventory-pricing',
    type: 'content',
    title: 'Inventory-Based Pricing',
    bullets: [
      'HIGH STOCK: Auto-promote to move inventory',
      'LOW STOCK: Resist discounting (scarcity)',
      'EXPIRING: Aggressive clearance 30/15/7 days out',
      'DEAD STOCK: Bundling suggestions to move it',
      'NEW ARRIVALS: Premium pricing window',
    ],
    highlight: 'Your inventory level IS pricing data.',
    notes: 'Connect pricing to inventory intelligence.',
  },

  // ============================================================
  // SLIDE 10: Clearance Automation
  // ============================================================
  {
    id: 'ep9-clearance',
    type: 'content',
    title: 'Automated Clearance Pricing',
    bullets: [
      '30 days to expiration: 10% off, featured placement',
      '15 days to expiration: 25% off, Craig sends alerts',
      '7 days to expiration: 40% off, "Last Chance" messaging',
      '3 days to expiration: 60% off, text VIP customers',
      'Goal: $0 expired product, maximum recovered revenue',
    ],
    highlight: 'Every dollar recovered is profit saved.',
    notes: 'The clearance waterfall.',
  },

  // ============================================================
  // SLIDE 11: Bundle Optimization
  // ============================================================
  {
    id: 'ep9-bundles',
    type: 'content',
    title: 'Smart Bundling',
    bullets: [
      'Pair slow movers with fast sellers',
      'Create "starter kits" for new customers',
      'Bundle complementary categories (flower + papers)',
      'Test bundle prices vs. à la carte',
      'Track bundle performance automatically',
    ],
    highlight: 'Bundles increase basket size AND move inventory.',
    notes: 'Bundling as a margin strategy.',
  },

  // ============================================================
  // SLIDE 12: Demo
  // ============================================================
  {
    id: 'ep9-demo',
    type: 'demo',
    title: 'See Dynamic Pricing in Action',
    description: 'Let\'s explore how Money Mike optimizes pricing.',
    instructions: [
      'Navigate to the pricing dashboard',
      'Review margin analysis by category',
      'See clearance automation rules',
      'Check competitive price comparison',
      'Create a pricing rule',
    ],
    notes: 'Live demo of pricing tools.',
  },

  // ============================================================
  // SLIDE 13: Pricing Rules
  // ============================================================
  {
    id: 'ep9-rules',
    type: 'content',
    title: 'Set It and Forget It: Pricing Rules',
    bullets: [
      '"Never go below 30% margin on flower"',
      '"Match competitor X on these 10 SKUs only"',
      '"Auto-discount expiring inventory on this schedule"',
      '"Add 5% premium on out-of-stock competitor items"',
      'Rules run 24/7, you stay in control',
    ],
    highlight: 'Automate the obvious. Focus on strategy.',
    notes: 'The rules engine.',
  },

  // ============================================================
  // SLIDE 14: ROI Tracking
  // ============================================================
  {
    id: 'ep9-roi',
    type: 'content',
    title: 'Track Every Dollar',
    bullets: [
      'Promotion ROI: Did that 20% off actually make money?',
      'Price change impact: +5% on this SKU = what revenue?',
      'Bundle performance vs. individual sales',
      'Competitive response effectiveness',
      'Monthly margin reports with recommendations',
    ],
    highlight: 'No more guessing if your pricing works.',
    notes: 'Accountability and measurement.',
  },

  // ============================================================
  // SLIDE 15: Recap
  // ============================================================
  {
    id: 'ep9-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      'Dynamic pricing can improve margins 5-15%',
      'Respond to competitors strategically, not reflexively',
      'Automate clearance pricing to prevent waste',
      'Bundles move slow inventory while increasing basket size',
      'Track ROI on every pricing decision',
    ],
    notes: 'Reinforce the margin-first mindset.',
  },

  // ============================================================
  // SLIDE 16: Resources
  // ============================================================
  {
    id: 'ep9-resources',
    type: 'content',
    title: 'Your Pricing Toolkit',
    bullets: [
      'Marketing Budget Calculator',
      'Promotion ROI Tracker',
      'Clearance Pricing Schedule Template',
      'Margin Analysis Worksheet',
      'Download from the Resources tab!',
    ],
    highlight: 'Start optimizing your margins today.',
    notes: 'Point to resources.',
  },

  // ============================================================
  // SLIDE 17: CTA
  // ============================================================
  {
    id: 'ep9-cta',
    type: 'cta',
    title: 'Ready to Protect Your Margins?',
    subtitle: 'Next up: Building customer loyalty that lasts...',
    primaryAction: 'Watch Episode 10',
    primaryUrl: '/academy?episode=ep10-mrs-parker',
    secondaryAction: 'Download Budget Calculator',
    secondaryUrl: '/academy?resource=res11-budget-calculator',
    nextEpisodeTitle: 'Meet Mrs. Parker: Build Loyalty That Lasts',
    notes: 'Transition to Mrs. Parker - retention.',
  },
];

export const EPISODE_9_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep9-money-mike',
  episodeNumber: 9,
  title: 'Meet Money Mike: Dynamic Pricing That Maximizes Margins',
  track: 'money-mike',
  trackColor: '#10b981',
  estimatedDuration: 14,
  slides: EPISODE_9_SLIDES,
};
