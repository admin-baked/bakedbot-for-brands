/**
 * Episode 8: Meet Pops - Analytics & Insights
 *
 * Learning Objectives:
 * - Learn which metrics actually matter for cannabis retail
 * - Understand cohort analysis and customer lifetime value
 * - Discover how to identify slow-moving inventory before it expires
 * - See how Pops generates automated insights and recommendations
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_8_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep8-title',
    type: 'title',
    episodeNumber: 8,
    title: 'Meet Pops',
    subtitle: 'Turn Data Into Decisions That Drive Revenue',
    trackColor: '#8b5cf6',
    notes: 'Pops is the wise analyst. He sees patterns others miss.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep8-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'Which metrics actually matter for cannabis retail',
      'Customer lifetime value and cohort analysis',
      'Identifying slow-moving inventory before expiration',
      'How Pops generates automated insights',
    ],
    notes: 'Data-focused episode with practical metrics.',
  },

  // ============================================================
  // SLIDE 3: The Data Deluge
  // ============================================================
  {
    id: 'ep8-data-deluge',
    type: 'content',
    title: 'The Data Deluge Problem',
    bullets: [
      'POS spitting out reports you never read',
      'Google Analytics you set up and forgot',
      'Email platform metrics you don\'t understand',
      'Too much data, too little insight',
      'No one connecting the dots across systems',
    ],
    highlight: 'Data without insight is just noise.',
    notes: 'Everyone has data. Few have insights.',
  },

  // ============================================================
  // SLIDE 4: Meet Pops
  // ============================================================
  {
    id: 'ep8-pops-intro',
    type: 'agent',
    agentId: 'pops',
    agentName: 'Pops the Analyst',
    tagline: 'Turn Data Into Decisions',
    description: 'Pops analyzes your sales, inventory, and customer data to surface patterns and opportunities you\'d never find on your own.',
    capabilities: [
      'Sales trend analysis',
      'Inventory optimization',
      'Customer cohort insights',
      'Predictive recommendations',
    ],
    color: '#8b5cf6',
    icon: 'chart-bar',
    notes: 'Full introduction to Pops.',
  },

  // ============================================================
  // SLIDE 5: Metrics That Matter
  // ============================================================
  {
    id: 'ep8-metrics',
    type: 'split',
    title: 'Metrics That Actually Matter',
    leftTitle: 'Vanity Metrics (Less Useful)',
    leftBullets: [
      'Total revenue (doesn\'t show profitability)',
      'Transaction count (not all customers equal)',
      'Followers (don\'t pay the bills)',
      'Page views (awareness ≠ action)',
      'Average basket size (hides mix issues)',
    ],
    rightTitle: 'Pops Metrics (Actionable)',
    rightBullets: [
      'Gross margin per transaction',
      'Customer lifetime value (LTV)',
      'Inventory turnover by category',
      'Customer retention rate',
      'Revenue per square foot',
    ],
    notes: 'Help them focus on what matters.',
  },

  // ============================================================
  // SLIDE 6: Customer Lifetime Value
  // ============================================================
  {
    id: 'ep8-ltv',
    type: 'content',
    title: 'Understanding Customer Lifetime Value',
    bullets: [
      'LTV = How much a customer spends over their entire relationship',
      'Average customer visits 2-3x before loyalty kicks in',
      'Top 20% of customers drive 60%+ of revenue',
      'Acquiring a customer costs 5x retaining one',
      'Pops identifies who your best customers are',
    ],
    highlight: 'All customers are not created equal.',
    notes: 'LTV is the most important metric.',
  },

  // ============================================================
  // SLIDE 7: LTV Stat
  // ============================================================
  {
    id: 'ep8-ltv-stat',
    type: 'stat',
    stat: '5x',
    label: 'more valuable: Top 20% customers vs. average',
    context: 'Pops identifies these VIPs so Mrs. Parker can give them the treatment they deserve.',
    notes: 'Connect to the retention strategy.',
  },

  // ============================================================
  // SLIDE 8: Cohort Analysis
  // ============================================================
  {
    id: 'ep8-cohorts',
    type: 'content',
    title: 'Cohort Analysis: See Your Business Over Time',
    bullets: [
      'Group customers by when they first purchased',
      'Track how each cohort behaves over time',
      'Did January customers come back in February?',
      'Which marketing campaign brought the best customers?',
      'Spot trends early, not when it\'s too late',
    ],
    highlight: '"Last month\'s new customers aren\'t coming back" - worth knowing.',
    notes: 'Cohort analysis is powerful but underused.',
  },

  // ============================================================
  // SLIDE 9: Inventory Intelligence
  // ============================================================
  {
    id: 'ep8-inventory',
    type: 'content',
    title: 'Inventory Intelligence',
    bullets: [
      'EXPIRING SOON: Products nearing expiration (move now!)',
      'SLOW MOVERS: Items sitting too long on shelves',
      'HOT SELLERS: Low stock on popular items',
      'DEAD STOCK: Products that haven\'t sold in 30+ days',
      'MARGIN ALERTS: High-volume but low-margin items',
    ],
    highlight: 'Pops tells Money Mike what needs to move.',
    notes: 'Connect to inventory optimization.',
  },

  // ============================================================
  // SLIDE 10: Prediction Power
  // ============================================================
  {
    id: 'ep8-prediction',
    type: 'content',
    title: 'Predictive Insights',
    bullets: [
      '"Based on patterns, you\'ll run out of [Product] by Friday"',
      '"This customer hasn\'t visited in 45 days - they\'re at risk"',
      '"4/20 is coming - here\'s what sold best last year"',
      '"Sales are trending down in [Category] - investigate"',
      '"Weather forecast: Rain this weekend = delivery spike"',
    ],
    highlight: 'Know what\'s coming before it happens.',
    notes: 'Show the predictive capabilities.',
  },

  // ============================================================
  // SLIDE 11: Daily Insights
  // ============================================================
  {
    id: 'ep8-daily-insights',
    type: 'content',
    title: 'Pops\'s Daily Insights',
    bullets: [
      'Every morning: Summary of yesterday\'s performance',
      'Anomaly detection: "Sales were 20% below expected"',
      'Opportunity alerts: "Flower margin is up - push it"',
      'Risk flags: "3 VIP customers haven\'t visited this month"',
      'Recommendations: Specific actions to take',
    ],
    highlight: 'Wake up knowing exactly what needs attention.',
    notes: 'The daily briefing from Pops.',
  },

  // ============================================================
  // SLIDE 12: Demo
  // ============================================================
  {
    id: 'ep8-demo',
    type: 'demo',
    title: 'Explore the Analytics Dashboard',
    description: 'Let\'s see how Pops presents insights in an actionable way.',
    instructions: [
      'Navigate to the analytics dashboard',
      'Review the KPI overview',
      'Explore customer cohort analysis',
      'Check inventory intelligence alerts',
      'See the recommended actions list',
    ],
    notes: 'Live demo of the analytics dashboard.',
  },

  // ============================================================
  // SLIDE 13: Action Loop
  // ============================================================
  {
    id: 'ep8-action-loop',
    type: 'content',
    title: 'From Insight to Action',
    bullets: [
      'Pops: "Edibles sales are trending up 15%"',
      '→ Smokey: Prioritize edible recommendations',
      '→ Craig: Create edibles-focused campaign',
      '→ Money Mike: Optimize edible pricing',
      '→ Pops: Track the impact and refine',
    ],
    highlight: 'Insights trigger a coordinated response.',
    notes: 'Show how Pops connects to other agents.',
  },

  // ============================================================
  // SLIDE 14: Custom Reports
  // ============================================================
  {
    id: 'ep8-custom-reports',
    type: 'content',
    title: 'Reports That Matter to You',
    bullets: [
      'Customize which metrics you see daily',
      'Schedule reports to email automatically',
      'Export to CSV/Excel for deeper analysis',
      'Share dashboards with your team',
      'Historical comparisons (vs. last month, last year)',
    ],
    highlight: 'Your data, your way.',
    notes: 'Customization and export options.',
  },

  // ============================================================
  // SLIDE 15: Recap
  // ============================================================
  {
    id: 'ep8-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      'Focus on actionable metrics, not vanity metrics',
      'Customer LTV tells you who matters most',
      'Cohort analysis reveals trends over time',
      'Inventory intelligence prevents waste and stockouts',
      'Pops connects insights to agent actions',
    ],
    notes: 'Reinforce the data-driven approach.',
  },

  // ============================================================
  // SLIDE 16: Resources
  // ============================================================
  {
    id: 'ep8-resources',
    type: 'content',
    title: 'Your Analytics Toolkit',
    bullets: [
      'Cannabis Retail Metrics Dashboard Template',
      'KPI Tracking Spreadsheet',
      'Cohort Analysis Guide',
      'Inventory Turnover Calculator',
      'Download from the Resources tab!',
    ],
    highlight: 'Start tracking what matters today.',
    notes: 'Point to resources.',
  },

  // ============================================================
  // SLIDE 17: CTA
  // ============================================================
  {
    id: 'ep8-cta',
    type: 'cta',
    title: 'Ready to Make Data-Driven Decisions?',
    subtitle: 'Next up: Maximizing your margins...',
    primaryAction: 'Watch Episode 9',
    primaryUrl: '/academy?episode=ep9-money-mike',
    secondaryAction: 'Download Metrics Template',
    secondaryUrl: '/academy?resource=res10-metrics-dashboard',
    nextEpisodeTitle: 'Meet Money Mike: Dynamic Pricing That Maximizes Margins',
    notes: 'Transition to Money Mike - revenue optimization.',
  },
];

export const EPISODE_8_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep8-pops',
  episodeNumber: 8,
  title: 'Meet Pops: Turn Data Into Decisions',
  track: 'pops',
  trackColor: '#8b5cf6',
  estimatedDuration: 12,
  slides: EPISODE_8_SLIDES,
};
