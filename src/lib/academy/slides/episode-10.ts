/**
 * Episode 10: Meet Mrs. Parker - Customer Retention
 *
 * Learning Objectives:
 * - Learn the difference between loyalty programs and retention strategies
 * - Understand how Mrs. Parker personalizes post-purchase experiences
 * - Discover the anatomy of a successful win-back campaign
 * - See real retention metrics and benchmarks
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_10_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep10-title',
    type: 'title',
    episodeNumber: 10,
    title: 'Meet Mrs. Parker',
    subtitle: 'Build Loyalty That Lasts',
    trackColor: '#ec4899',
    notes: 'Mrs. Parker has that Southern hospitality vibe. She makes customers feel special.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep10-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'Loyalty programs vs. retention strategies (not the same!)',
      'How Mrs. Parker personalizes post-purchase experiences',
      'Anatomy of a successful win-back campaign',
      'Real retention metrics and benchmarks',
    ],
    notes: 'Focus on long-term customer relationships.',
  },

  // ============================================================
  // SLIDE 3: The Retention Reality
  // ============================================================
  {
    id: 'ep10-retention-reality',
    type: 'stat',
    stat: '5x',
    label: 'cheaper to retain a customer than acquire a new one',
    context: 'Yet most cannabis businesses spend 90% of marketing budget on acquisition.',
    notes: 'The fundamental retention insight.',
  },

  // ============================================================
  // SLIDE 4: Loyalty vs. Retention
  // ============================================================
  {
    id: 'ep10-loyalty-vs-retention',
    type: 'comparison',
    title: 'Loyalty Programs vs. Retention Strategies',
    beforeTitle: 'Loyalty Programs (Transactional)',
    beforeItems: [
      'Points-based rewards',
      'Discounts for purchases',
      'Everyone gets same treatment',
      'Easy to replicate',
      '"I\'ll go wherever points are best"',
    ],
    afterTitle: 'Retention Strategy (Relational)',
    afterItems: [
      'Personalized experiences',
      'Emotional connection to brand',
      'VIP treatment for best customers',
      'Hard to replicate',
      '"I\'m loyal to THIS dispensary"',
    ],
    verdict: 'Both matter. But relationships beat points.',
    notes: 'Frame the difference clearly.',
  },

  // ============================================================
  // SLIDE 5: Meet Mrs. Parker
  // ============================================================
  {
    id: 'ep10-mrs-parker-intro',
    type: 'agent',
    agentId: 'mrs-parker',
    agentName: 'Mrs. Parker',
    tagline: 'Build Lasting Customer Relationships',
    description: 'Mrs. Parker remembers every customer, nurtures relationships, and brings lapsed buyers back with personal touches that feel like home.',
    capabilities: [
      'Personalized welcome sequences',
      'Win-back campaigns for lapsed customers',
      'Birthday/anniversary recognition',
      'VIP customer identification and treatment',
    ],
    color: '#ec4899',
    icon: 'heart',
    notes: 'Full introduction to Mrs. Parker.',
  },

  // ============================================================
  // SLIDE 6: Customer Journey
  // ============================================================
  {
    id: 'ep10-customer-journey',
    type: 'content',
    title: 'The Customer Lifecycle',
    bullets: [
      'NEW: First-time visitor, needs onboarding',
      'ENGAGED: Made 2-3 purchases, building habit',
      'LOYAL: Regular customer, high LTV potential',
      'AT-RISK: Purchase frequency declining',
      'LAPSED: Haven\'t visited in 60+ days',
    ],
    highlight: 'Mrs. Parker treats each stage differently.',
    notes: 'Introduce the lifecycle framework.',
  },

  // ============================================================
  // SLIDE 7: Welcome Sequence
  // ============================================================
  {
    id: 'ep10-welcome',
    type: 'content',
    title: 'The Welcome Sequence',
    bullets: [
      'Day 0: Welcome email + "Here\'s what we\'re about"',
      'Day 3: "How was your first visit?" + product education',
      'Day 7: Personalized recommendation based on first purchase',
      'Day 14: "Come back" incentive if no second visit',
      'Day 30: Check-in regardless of status',
    ],
    highlight: 'Turn first-timers into regulars in 30 days.',
    notes: 'The welcome sequence is critical.',
  },

  // ============================================================
  // SLIDE 8: Mrs. Parker Style
  // ============================================================
  {
    id: 'ep10-personality',
    type: 'quote',
    quote: 'Hey Sugar! I noticed you haven\'t been by in a while. Your favorite Blue Dream just came back in stock - thought you\'d want to know! 💜',
    attribution: 'Mrs. Parker, to a lapsed customer',
    context: 'Warm, personal, relevant. Not "20% OFF EVERYTHING!!!"',
    notes: 'Show the personality and warmth.',
  },

  // ============================================================
  // SLIDE 9: Win-Back Campaign
  // ============================================================
  {
    id: 'ep10-winback',
    type: 'content',
    title: 'Anatomy of a Win-Back Campaign',
    bullets: [
      'Trigger: Customer hasn\'t visited in 45+ days',
      'Email 1: "We miss you" + personalized product reminder',
      'Wait 7 days. If no response...',
      'SMS: "Here\'s a little something to welcome you back" + offer',
      'Wait 7 days. If still no response... mail physical postcard',
    ],
    highlight: 'Multi-touch, multi-channel, increasingly personal.',
    notes: 'The win-back escalation ladder.',
  },

  // ============================================================
  // SLIDE 10: VIP Treatment
  // ============================================================
  {
    id: 'ep10-vip',
    type: 'content',
    title: 'VIP Customer Recognition',
    bullets: [
      'Pops identifies: "These 200 customers = 50% of revenue"',
      'Mrs. Parker flags them for special treatment',
      'Early access to new products',
      'Personal birthday messages (not generic blasts)',
      'Exclusive events and experiences',
    ],
    highlight: 'Your best customers should FEEL like VIPs.',
    notes: 'Connect to Pops for customer identification.',
  },

  // ============================================================
  // SLIDE 11: Special Occasions
  // ============================================================
  {
    id: 'ep10-occasions',
    type: 'split',
    title: 'Moments That Matter',
    leftTitle: 'Personal Milestones',
    leftBullets: [
      'Birthday (actual day, not week)',
      'Account anniversary',
      '10th purchase celebration',
      'First year as customer',
      'VIP tier achievement',
    ],
    rightTitle: 'Purchase Moments',
    rightBullets: [
      'Thank you after large order',
      'Product recommendation follow-up',
      '"How was it?" after trying new brand',
      'Restock reminder for regular purchases',
      'Category exploration suggestion',
    ],
    notes: 'Show the triggers for personalized outreach.',
  },

  // ============================================================
  // SLIDE 12: Memory System
  // ============================================================
  {
    id: 'ep10-memory',
    type: 'content',
    title: 'Mrs. Parker Remembers Everything',
    bullets: [
      'Every product purchased, when, how often',
      'Preferences expressed in chat conversations',
      'Feedback given on previous purchases',
      'Special occasions and dates',
      'Communication preferences (SMS vs. email)',
    ],
    highlight: 'Powered by Letta memory - long-term, persistent, searchable.',
    notes: 'The memory system behind the personalization.',
  },

  // ============================================================
  // SLIDE 13: Demo
  // ============================================================
  {
    id: 'ep10-demo',
    type: 'demo',
    title: 'See Customer Retention in Action',
    description: 'Let\'s explore how Mrs. Parker manages customer relationships.',
    instructions: [
      'Navigate to the customer retention dashboard',
      'Review customer lifecycle segments',
      'See win-back campaign performance',
      'Check VIP customer list',
      'Preview a welcome sequence',
    ],
    notes: 'Live demo of retention tools.',
  },

  // ============================================================
  // SLIDE 14: Metrics
  // ============================================================
  {
    id: 'ep10-metrics',
    type: 'content',
    title: 'Retention Metrics to Track',
    bullets: [
      'Repeat purchase rate (% who buy again)',
      'Customer retention rate (month over month)',
      'Win-back success rate (lapsed → active)',
      'VIP customer growth',
      'Net Promoter Score (would you recommend?)',
    ],
    highlight: 'What gets measured gets improved.',
    notes: 'Key retention KPIs.',
  },

  // ============================================================
  // SLIDE 15: Results
  // ============================================================
  {
    id: 'ep10-results',
    type: 'stat',
    stat: '35%',
    label: 'win-back success rate with personalized campaigns',
    context: 'vs. 5-10% with generic "We miss you" blasts. Personalization works.',
    notes: 'Show the impact of personalization.',
  },

  // ============================================================
  // SLIDE 16: Recap
  // ============================================================
  {
    id: 'ep10-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      'Retention is 5x cheaper than acquisition',
      'Loyalty programs are transactional; retention is relational',
      'Welcome sequences turn first-timers into regulars',
      'Win-back campaigns should escalate across channels',
      'VIP customers deserve VIP treatment',
    ],
    notes: 'Reinforce the retention mindset.',
  },

  // ============================================================
  // SLIDE 17: Resources
  // ============================================================
  {
    id: 'ep10-resources',
    type: 'content',
    title: 'Your Retention Toolkit',
    bullets: [
      'Customer Retention Playbook',
      'Win-Back Campaign Templates',
      'VIP Program Framework',
      'Welcome Sequence Examples',
      'Download from the Resources tab!',
    ],
    highlight: 'Start building relationships that last.',
    notes: 'Point to resources.',
  },

  // ============================================================
  // SLIDE 18: CTA
  // ============================================================
  {
    id: 'ep10-cta',
    type: 'cta',
    title: 'Ready to Keep Customers Coming Back?',
    subtitle: 'Next up: Deep dive into compliance automation...',
    primaryAction: 'Watch Episode 11',
    primaryUrl: '/academy?episode=ep11-deebo-advanced',
    secondaryAction: 'Download Retention Playbook',
    secondaryUrl: '/academy?resource=res12-retention-playbook',
    nextEpisodeTitle: 'Deebo Deep Dive: Advanced Compliance Automation',
    notes: 'Transition to Deebo advanced episode.',
  },
];

export const EPISODE_10_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep10-mrs-parker',
  episodeNumber: 10,
  title: 'Meet Mrs. Parker: Build Loyalty That Lasts',
  track: 'mrs-parker',
  trackColor: '#ec4899',
  estimatedDuration: 11,
  slides: EPISODE_10_SLIDES,
};
