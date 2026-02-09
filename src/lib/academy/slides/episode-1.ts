/**
 * Episode 1: Welcome to the Cannabis Marketing AI Revolution
 *
 * Learning Objectives:
 * - Understand the 7 BakedBot agents and their roles
 * - See the difference between AI agents vs. traditional dashboards
 * - Identify your biggest cannabis marketing challenges
 * - Learn the 3 pillars of autonomous commerce
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_1_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep1-title',
    type: 'title',
    episodeNumber: 1,
    title: 'Welcome to the Cannabis Marketing AI Revolution',
    subtitle: 'How AI Agents Are Transforming Cannabis Retail',
    trackColor: '#10b981',
    notes: 'Welcome viewers, introduce yourself briefly. Set the stage for what they\'ll learn.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep1-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'Meet the 7 BakedBot agents and understand their unique roles',
      'See why AI agents beat traditional dashboards',
      'Identify your biggest cannabis marketing challenges',
      'Discover the 3 pillars of autonomous commerce',
    ],
    notes: 'Quick overview of what we\'ll cover. Keep energy high.',
  },

  // ============================================================
  // SLIDE 3: The Problem
  // ============================================================
  {
    id: 'ep1-problem',
    type: 'content',
    title: 'The Cannabis Marketing Problem',
    bullets: [
      'Fragmented tools: POS, CRM, email, SMS, loyalty... all siloed',
      'Manual work: Budtenders juggling tasks instead of selling',
      'Compliance nightmares: One wrong message = massive fines',
      'Data overload: Reports everywhere, insights nowhere',
      'Competitors: Racing to the bottom on price',
    ],
    highlight: 'Sound familiar?',
    notes: 'Get viewers nodding along. These are pain points they live every day.',
  },

  // ============================================================
  // SLIDE 4: Big Stat
  // ============================================================
  {
    id: 'ep1-stat-1',
    type: 'stat',
    stat: '67%',
    label: 'of dispensary staff time is spent on non-revenue tasks',
    context: 'Inventory checks, compliance paperwork, responding to reviews, updating menus...',
    source: 'Cannabis Retail Operations Survey 2025',
    notes: 'Pause for effect. Let this sink in.',
  },

  // ============================================================
  // SLIDE 5: Traditional Approach
  // ============================================================
  {
    id: 'ep1-traditional',
    type: 'comparison',
    title: 'Traditional Dashboards vs. AI Agents',
    beforeTitle: 'Traditional Dashboards',
    beforeItems: [
      'You pull reports manually',
      'You analyze the data',
      'You decide what to do',
      'You execute the action',
      'You track the results',
    ],
    afterTitle: 'AI Agents',
    afterItems: [
      'Agent monitors automatically',
      'Agent identifies opportunities',
      'Agent proposes actions',
      'Agent executes (with approval)',
      'Agent learns & improves',
    ],
    verdict: 'Dashboards inform. Agents act.',
    notes: 'Key insight: agents are proactive, dashboards are passive.',
  },

  // ============================================================
  // SLIDE 6: The BakedBot Squad Intro
  // ============================================================
  {
    id: 'ep1-squad-intro',
    type: 'content',
    title: 'Meet Your AI Squad',
    bullets: [
      '7 specialized agents, each a domain expert',
      'They communicate with each other automatically',
      'They have persistent memory (they remember your customers)',
      'They work 24/7 while you sleep',
      'They get smarter over time from every interaction',
    ],
    highlight: 'Like having 7 full-time employees who never call in sick.',
    notes: 'Build excitement. These aren\'t chatbots - they\'re autonomous specialists.',
  },

  // ============================================================
  // SLIDE 7: Smokey
  // ============================================================
  {
    id: 'ep1-smokey',
    type: 'agent',
    agentId: 'smokey',
    agentName: 'Smokey the Budtender',
    tagline: 'Chemistry-First Product Recommendations',
    description: 'Smokey knows your entire catalog and recommends products based on terpene profiles, not outdated indica/sativa labels.',
    capabilities: [
      'Real-time product recommendations via chat',
      'Terpene-based effect matching',
      'Customer preference learning',
      'Inventory-aware suggestions',
    ],
    color: '#10b981',
    icon: 'leaf',
    notes: 'Smokey is often the first agent customers interact with.',
  },

  // ============================================================
  // SLIDE 8: Craig
  // ============================================================
  {
    id: 'ep1-craig',
    type: 'agent',
    agentId: 'craig',
    agentName: 'Craig the Marketer',
    tagline: 'Multi-Channel Campaign Automation',
    description: 'Craig orchestrates your SMS, email, and social campaigns with perfect timing, personalization, and compliance.',
    capabilities: [
      'Automated campaign scheduling',
      'Personalized messaging at scale',
      'A/B testing optimization',
      'Cross-channel coordination',
    ],
    color: '#3b82f6',
    icon: 'megaphone',
    notes: 'Craig is your campaign manager who never sleeps.',
  },

  // ============================================================
  // SLIDE 9: Ezal
  // ============================================================
  {
    id: 'ep1-ezal',
    type: 'agent',
    agentId: 'ezal',
    agentName: 'Ezal the Lookout',
    tagline: 'Competitive Intelligence on Autopilot',
    description: 'Ezal monitors your competitors 24/7 - their prices, menus, promotions - and alerts you when something changes.',
    capabilities: [
      'Real-time price monitoring',
      'Menu change detection',
      'Promotion tracking',
      'Market trend analysis',
    ],
    color: '#f59e0b',
    icon: 'binoculars',
    notes: 'Ezal keeps you ahead of the competition without manual research.',
  },

  // ============================================================
  // SLIDE 10: Pops
  // ============================================================
  {
    id: 'ep1-pops',
    type: 'agent',
    agentId: 'pops',
    agentName: 'Pops the Analyst',
    tagline: 'Turn Data Into Decisions',
    description: 'Pops analyzes your sales, inventory, and customer data to find patterns and opportunities you\'d never see on your own.',
    capabilities: [
      'Sales trend analysis',
      'Inventory optimization',
      'Customer cohort insights',
      'Predictive recommendations',
    ],
    color: '#8b5cf6',
    icon: 'chart-bar',
    notes: 'Pops turns your data into actionable insights.',
  },

  // ============================================================
  // SLIDE 11: Money Mike
  // ============================================================
  {
    id: 'ep1-money-mike',
    type: 'agent',
    agentId: 'money-mike',
    agentName: 'Money Mike the Optimizer',
    tagline: 'Maximize Revenue & Margins',
    description: 'Money Mike finds the optimal price for every product, manages promotions strategically, and protects your margins.',
    capabilities: [
      'Dynamic pricing optimization',
      'Margin protection alerts',
      'Promotion ROI analysis',
      'Clearance automation',
    ],
    color: '#10b981',
    icon: 'dollar-sign',
    notes: 'Money Mike is all about the bottom line.',
  },

  // ============================================================
  // SLIDE 12: Mrs. Parker
  // ============================================================
  {
    id: 'ep1-mrs-parker',
    type: 'agent',
    agentId: 'mrs-parker',
    agentName: 'Mrs. Parker the Retention Specialist',
    tagline: 'Build Lasting Relationships',
    description: 'Mrs. Parker remembers every customer, nurtures relationships, and brings lapsed buyers back with personal touches.',
    capabilities: [
      'Personalized welcome sequences',
      'Win-back campaigns',
      'Birthday & anniversary messages',
      'VIP customer identification',
    ],
    color: '#ec4899',
    icon: 'heart',
    notes: 'Mrs. Parker has that Southern hospitality vibe.',
  },

  // ============================================================
  // SLIDE 13: Deebo
  // ============================================================
  {
    id: 'ep1-deebo',
    type: 'agent',
    agentId: 'deebo',
    agentName: 'Deebo the Enforcer',
    tagline: 'Stay Compliant, Stay Safe',
    description: 'Deebo reviews every piece of content before it goes out, ensuring you never violate state regulations or TCPA rules.',
    capabilities: [
      'Content compliance review',
      'Age verification enforcement',
      'State-by-state rule engine',
      'TCPA violation prevention',
    ],
    color: '#ef4444',
    icon: 'shield',
    notes: 'Deebo is your compliance safety net.',
  },

  // ============================================================
  // SLIDE 14: How They Work Together
  // ============================================================
  {
    id: 'ep1-collaboration',
    type: 'content',
    title: 'Agents Work Together, Not in Silos',
    bullets: [
      'Ezal spots a competitor price drop → alerts Money Mike',
      'Money Mike adjusts pricing → tells Craig to promote it',
      'Craig sends SMS campaign → Deebo reviews for compliance',
      'Smokey recommends the deal → Mrs. Parker follows up with the customer',
      'Pops tracks the results → informs next campaign',
    ],
    highlight: 'Orchestrated intelligence, not isolated tools.',
    notes: 'This is the magic - they collaborate automatically.',
  },

  // ============================================================
  // SLIDE 15: 3 Pillars of Autonomous Commerce
  // ============================================================
  {
    id: 'ep1-pillars',
    type: 'content',
    title: 'The 3 Pillars of Autonomous Commerce',
    bullets: [
      '1. OBSERVE: Agents continuously monitor data, competitors, and customers',
      '2. DECIDE: AI analyzes patterns and proposes optimal actions',
      '3. ACT: With your approval, agents execute and learn from results',
    ],
    highlight: 'You set the strategy. Agents handle the execution.',
    notes: 'This framework underlies everything BakedBot does.',
  },

  // ============================================================
  // SLIDE 16: What Changes
  // ============================================================
  {
    id: 'ep1-transformation',
    type: 'split',
    title: 'The Transformation',
    leftTitle: 'Before BakedBot',
    leftBullets: [
      'Reactive firefighting',
      'Disconnected tools',
      'Manual everything',
      'Guessing at prices',
      'Compliance anxiety',
    ],
    rightTitle: 'After BakedBot',
    rightBullets: [
      'Proactive optimization',
      'Unified intelligence',
      'Automated workflows',
      'Data-driven pricing',
      'Built-in compliance',
    ],
    notes: 'Paint the before/after picture clearly.',
  },

  // ============================================================
  // SLIDE 17: Recap
  // ============================================================
  {
    id: 'ep1-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      '7 specialized AI agents work together for you',
      'Agents act proactively - dashboards just display',
      'The 3 pillars: Observe → Decide → Act',
      'Compliance is built-in, not bolted-on',
      'This is autonomous commerce for cannabis',
    ],
    notes: 'Summarize the big ideas. Set up curiosity for Episode 2.',
  },

  // ============================================================
  // SLIDE 18: CTA
  // ============================================================
  {
    id: 'ep1-cta',
    type: 'cta',
    title: 'Ready to Meet the Agents?',
    subtitle: 'Continue your journey with Episode 2',
    primaryAction: 'Watch Episode 2',
    primaryUrl: '/academy?episode=ep2-invisible-menu',
    secondaryAction: 'Book a Demo',
    secondaryUrl: 'https://bakedbot.ai/demo',
    nextEpisodeTitle: 'The Invisible Menu Problem: Why Google Can\'t Find Your Products',
    notes: 'Strong CTA. Encourage them to continue or book a demo.',
  },
];

export const EPISODE_1_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep1-intro',
  episodeNumber: 1,
  title: 'Welcome to the Cannabis Marketing AI Revolution',
  track: 'general',
  trackColor: '#10b981',
  estimatedDuration: 10,
  slides: EPISODE_1_SLIDES,
};
