/**
 * Episode 7: Meet Ezal - Competitive Intelligence
 *
 * Learning Objectives:
 * - Understand what data points Ezal tracks for each competitor
 * - Learn how to set up price alerts and competitive triggers
 * - Discover how to analyze market share and positioning
 * - See real examples of competitive insights driving decisions
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_7_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep7-title',
    type: 'title',
    episodeNumber: 7,
    title: 'Meet Ezal',
    subtitle: 'Competitive Intelligence That Never Sleeps',
    trackColor: '#f59e0b',
    notes: 'Ezal is the lookout. He watches your competitors so you don\'t have to.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep7-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'What data points Ezal tracks for each competitor',
      'How to set up price alerts and competitive triggers',
      'Analyzing market share and positioning',
      'Real examples of competitive insights driving decisions',
    ],
    notes: 'Focus on actionable intelligence, not just data.',
  },

  // ============================================================
  // SLIDE 3: The Blind Spot
  // ============================================================
  {
    id: 'ep7-blind-spot',
    type: 'quote',
    quote: 'Your competitor dropped prices on flower yesterday. Do you know?',
    attribution: 'The question that keeps cannabis operators up at night',
    context: 'In a race-to-the-bottom market, information is survival.',
    notes: 'Create urgency around competitive intelligence.',
  },

  // ============================================================
  // SLIDE 4: Manual CI Problem
  // ============================================================
  {
    id: 'ep7-manual-problem',
    type: 'content',
    title: 'The Problem with Manual Competitive Intel',
    bullets: [
      'Checking competitor menus takes hours',
      'Price changes happen daily (sometimes hourly)',
      'You can\'t monitor everyone consistently',
      'By the time you notice, customers already left',
      'No historical data to spot trends',
    ],
    highlight: 'You\'re always playing catch-up.',
    notes: 'Establish the pain of manual monitoring.',
  },

  // ============================================================
  // SLIDE 5: Meet Ezal
  // ============================================================
  {
    id: 'ep7-ezal-intro',
    type: 'agent',
    agentId: 'ezal',
    agentName: 'Ezal the Lookout',
    tagline: 'Competitive Intelligence on Autopilot',
    description: 'Ezal monitors your competitors 24/7 - their prices, menus, promotions - and alerts you the moment something changes.',
    capabilities: [
      'Real-time price monitoring',
      'Menu change detection',
      'Promotion tracking',
      'Market trend analysis',
    ],
    color: '#f59e0b',
    icon: 'binoculars',
    notes: 'Full introduction to Ezal.',
  },

  // ============================================================
  // SLIDE 6: What Ezal Tracks
  // ============================================================
  {
    id: 'ep7-what-ezal-tracks',
    type: 'split',
    title: 'What Ezal Monitors',
    leftTitle: 'Product Data',
    leftBullets: [
      'Every product in competitor catalogs',
      'Price changes (up and down)',
      'New product additions',
      'Product removals/stockouts',
      'Category changes',
    ],
    rightTitle: 'Marketing Data',
    rightBullets: [
      'Active promotions and deals',
      'Social media posts',
      'Email campaigns (if subscribed)',
      'Review ratings and trends',
      'Special events',
    ],
    notes: 'Show the breadth of monitoring.',
  },

  // ============================================================
  // SLIDE 7: Monitoring Frequency
  // ============================================================
  {
    id: 'ep7-frequency',
    type: 'stat',
    stat: '15 min',
    label: 'monitoring frequency for Empire tier',
    context: 'Ezal checks your competitors every 15 minutes. That\'s 96 checks per day, per competitor.',
    notes: 'Emphasize the automation advantage.',
  },

  // ============================================================
  // SLIDE 8: Price Alerts
  // ============================================================
  {
    id: 'ep7-price-alerts',
    type: 'content',
    title: 'Price Alert System',
    bullets: [
      'Set alerts: "Notify me if [Competitor] drops flower prices"',
      'Threshold alerts: "Alert if any competitor is >10% cheaper"',
      'Category alerts: "Track all concentrate pricing changes"',
      'Instant notification via email, SMS, or dashboard',
      'Historical tracking: See when and how much they changed',
    ],
    highlight: 'Know the moment a competitor undercuts you.',
    notes: 'Show the alert configuration options.',
  },

  // ============================================================
  // SLIDE 9: Competitive Triggers
  // ============================================================
  {
    id: 'ep7-triggers',
    type: 'content',
    title: 'Automated Competitive Triggers',
    bullets: [
      'Competitor drops price → Ezal alerts Money Mike',
      'Money Mike evaluates margin impact',
      'Recommendation: Match, ignore, or differentiate',
      'If matching: Craig can auto-send a price match promo',
      'Full loop in under an hour',
    ],
    highlight: 'From competitor change to customer message automatically.',
    notes: 'Show the agent collaboration.',
  },

  // ============================================================
  // SLIDE 10: Market Positioning
  // ============================================================
  {
    id: 'ep7-positioning',
    type: 'content',
    title: 'Understanding Your Market Position',
    bullets: [
      'Where do you sit on price vs. competitors?',
      'Which categories are you most competitive in?',
      'Where are you losing on price? On selection?',
      'How do your promotions compare to theirs?',
      'Market share estimates by category',
    ],
    highlight: 'You can\'t compete if you don\'t know where you stand.',
    notes: 'Strategic analysis beyond just price tracking.',
  },

  // ============================================================
  // SLIDE 11: Real Intel Example
  // ============================================================
  {
    id: 'ep7-intel-example',
    type: 'comparison',
    title: 'Real Intelligence in Action',
    beforeTitle: 'What Ezal Detected',
    beforeItems: [
      'Competitor A dropped eighth prices by 15%',
      'Competitor B launched "first-time buyer" discount',
      'Competitor C added 20 new vape SKUs',
      'Competitor A reviews mentioning "long lines"',
      '',
    ],
    afterTitle: 'Actions Taken',
    afterItems: [
      '→ Matched eighth prices for top 5 strains only',
      '→ Created our own new customer promo',
      '→ Highlighted our vape selection in email',
      '→ Promoted our "express checkout" experience',
      'Revenue impact: +$15K that month',
    ],
    verdict: 'Intelligence → Action → Results',
    notes: 'Concrete example of intelligence driving decisions.',
  },

  // ============================================================
  // SLIDE 12: Trend Analysis
  // ============================================================
  {
    id: 'ep7-trends',
    type: 'content',
    title: 'Spot Trends Before They Hit',
    bullets: [
      'Which product categories are heating up?',
      'Is the market trending toward premium or value?',
      'Seasonal pricing patterns',
      'New brands gaining traction',
      'Promotion fatigue (everyone doing 20% off?)',
    ],
    highlight: 'Ezal sees the forest, not just the trees.',
    notes: 'Elevate from tactical to strategic.',
  },

  // ============================================================
  // SLIDE 13: Demo
  // ============================================================
  {
    id: 'ep7-demo',
    type: 'demo',
    title: 'See Ezal\'s Intelligence Dashboard',
    description: 'Let\'s explore what competitive intelligence looks like in practice.',
    instructions: [
      'Navigate to the competitive intelligence dashboard',
      'Review price comparison charts',
      'Set up a new price alert',
      'See historical price changes',
      'Check the daily competitive briefing',
    ],
    notes: 'Live demo of the CI dashboard.',
  },

  // ============================================================
  // SLIDE 14: Competitor Selection
  // ============================================================
  {
    id: 'ep7-competitor-selection',
    type: 'content',
    title: 'Choosing Competitors to Track',
    bullets: [
      'Direct competitors (same radius, same customer)',
      'Price leaders (whoever\'s driving the race to the bottom)',
      'Premium players (aspirational positioning)',
      'New entrants (who\'s disrupting?)',
      'Empire tier: Up to 1,000 competitors tracked',
    ],
    highlight: 'More competitors tracked = fewer blind spots.',
    notes: 'Help them think about which competitors matter.',
  },

  // ============================================================
  // SLIDE 15: The Briefing
  // ============================================================
  {
    id: 'ep7-briefing',
    type: 'content',
    title: 'Your Daily Competitive Briefing',
    bullets: [
      'Every morning: Summary of overnight changes',
      'Price changes that affect you',
      'New promotions in your market',
      'Review sentiment shifts',
      'Recommended actions based on changes',
    ],
    highlight: 'Start every day knowing what changed.',
    notes: 'The daily briefing as a habit.',
  },

  // ============================================================
  // SLIDE 16: Recap
  // ============================================================
  {
    id: 'ep7-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      'Manual competitive monitoring can\'t keep up with daily changes',
      'Ezal tracks prices, products, and promotions 24/7',
      'Price alerts let you respond in hours, not days',
      'Competitive triggers automate your response',
      'Trend analysis helps you stay ahead, not just keep up',
    ],
    notes: 'Reinforce the value of automated CI.',
  },

  // ============================================================
  // SLIDE 17: Resources
  // ============================================================
  {
    id: 'ep7-resources',
    type: 'content',
    title: 'Your CI Toolkit',
    bullets: [
      'Competitive Analysis Worksheet',
      'Competitive Intelligence Playbook',
      'Price Positioning Template',
      'Monthly CI Report Format',
      'Download from the Resources tab!',
    ],
    highlight: 'Start tracking your competitors today.',
    notes: 'Point to downloadable resources.',
  },

  // ============================================================
  // SLIDE 18: CTA
  // ============================================================
  {
    id: 'ep7-cta',
    type: 'cta',
    title: 'Ready to See What Your Competitors Are Doing?',
    subtitle: 'Next up: Turning all this data into decisions...',
    primaryAction: 'Watch Episode 8',
    primaryUrl: '/academy?episode=ep8-pops',
    secondaryAction: 'Download CI Playbook',
    secondaryUrl: '/academy?resource=res9-intelligence-playbook',
    nextEpisodeTitle: 'Meet Pops: Turn Data Into Decisions That Drive Revenue',
    notes: 'Transition to Pops - the analyst.',
  },
];

export const EPISODE_7_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep7-ezal',
  episodeNumber: 7,
  title: 'Meet Ezal: Competitive Intelligence That Never Sleeps',
  track: 'ezal',
  trackColor: '#f59e0b',
  estimatedDuration: 13,
  slides: EPISODE_7_SLIDES,
};
