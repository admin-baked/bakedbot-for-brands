/**
 * Episode 6: Meet Craig - Multi-Channel Campaign Automation
 *
 * Learning Objectives:
 * - Learn the anatomy of a high-converting cannabis campaign
 * - Understand SMS vs. email timing and frequency best practices
 * - Discover how Craig personalizes messaging at scale
 * - See real campaign examples with conversion metrics
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_6_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep6-title',
    type: 'title',
    episodeNumber: 6,
    title: 'Meet Craig',
    subtitle: 'Multi-Channel Campaign Automation for Cannabis',
    trackColor: '#3b82f6',
    notes: 'Craig is the marketing powerhouse. He orchestrates all customer communications.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep6-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'The anatomy of a high-converting cannabis campaign',
      'SMS vs. email: when to use each channel',
      'How Craig personalizes at scale',
      'Real campaign examples with actual metrics',
    ],
    notes: 'Marketing-focused episode with practical takeaways.',
  },

  // ============================================================
  // SLIDE 3: The Marketing Challenge
  // ============================================================
  {
    id: 'ep6-challenge',
    type: 'content',
    title: 'The Cannabis Marketing Challenge',
    bullets: [
      'Can\'t use Google Ads or Meta (banned category)',
      'Limited to owned channels (email, SMS, in-store)',
      'Compliance restrictions on messaging content',
      'Customers drowning in promotional messages',
      'Generic blasts getting ignored',
    ],
    highlight: 'Every message has to earn attention.',
    notes: 'Set up the unique challenges cannabis marketers face.',
  },

  // ============================================================
  // SLIDE 4: Meet Craig
  // ============================================================
  {
    id: 'ep6-craig-intro',
    type: 'agent',
    agentId: 'craig',
    agentName: 'Craig the Marketer',
    tagline: 'Multi-Channel Campaign Automation',
    description: 'Craig orchestrates SMS, email, and social campaigns with perfect timing, personalization, and built-in compliance.',
    capabilities: [
      'Automated campaign scheduling',
      'Personalized messaging at scale',
      'A/B testing optimization',
      'Cross-channel coordination',
    ],
    color: '#3b82f6',
    icon: 'megaphone',
    notes: 'Full introduction to Craig.',
  },

  // ============================================================
  // SLIDE 5: SMS Stats
  // ============================================================
  {
    id: 'ep6-sms-stats',
    type: 'stat',
    stat: '98%',
    label: 'open rate for SMS messages',
    context: 'Compare that to 20% for email. SMS gets seen. The question is what you say.',
    source: 'Mobile Marketing Association 2025',
    notes: 'SMS is the killer channel - but use it wisely.',
  },

  // ============================================================
  // SLIDE 6: SMS vs Email
  // ============================================================
  {
    id: 'ep6-channel-comparison',
    type: 'split',
    title: 'When to Use Each Channel',
    leftTitle: 'SMS (Urgent, Personal)',
    leftBullets: [
      'Flash sales (hours, not days)',
      'Order status updates',
      'Loyalty point reminders',
      'Same-day promotions',
      'Low inventory alerts',
    ],
    rightTitle: 'Email (Rich, Educational)',
    rightBullets: [
      'Product launches',
      'Educational content',
      'Weekly newsletters',
      'Event announcements',
      'Longer promotions',
    ],
    notes: 'Help them understand channel strategy.',
  },

  // ============================================================
  // SLIDE 7: Campaign Anatomy
  // ============================================================
  {
    id: 'ep6-campaign-anatomy',
    type: 'content',
    title: 'Anatomy of a High-Converting Campaign',
    bullets: [
      'SEGMENT: Who needs to see this? (Don\'t blast everyone)',
      'TIMING: When are they most likely to engage?',
      'CHANNEL: SMS for urgency, email for depth',
      'MESSAGE: Value first, offer second',
      'CTA: One clear action (not five links)',
    ],
    highlight: 'Every campaign answers: Why should this person care RIGHT NOW?',
    notes: 'Framework for building effective campaigns.',
  },

  // ============================================================
  // SLIDE 8: Personalization at Scale
  // ============================================================
  {
    id: 'ep6-personalization',
    type: 'content',
    title: 'How Craig Personalizes at Scale',
    bullets: [
      'Dynamic product recommendations based on purchase history',
      'Merge fields: Name, last purchase, preferred category',
      'Send time optimization (individual user patterns)',
      'Category affinity: Flower lovers get flower deals',
      'Lifecycle stage: New customer vs. loyal regular',
    ],
    highlight: '"Hey [Name], your favorite [Category] is back in stock!"',
    notes: 'Show what real personalization looks like.',
  },

  // ============================================================
  // SLIDE 9: The Blast Problem
  // ============================================================
  {
    id: 'ep6-blast-problem',
    type: 'comparison',
    title: 'Generic Blast vs. Personalized Campaign',
    beforeTitle: 'Generic Blast (Lazy)',
    beforeItems: [
      '"20% off everything today!"',
      'Sent to: All 10,000 subscribers',
      'Open rate: 15%',
      'Click rate: 2%',
      'Revenue: $5,000',
    ],
    afterTitle: 'Personalized Campaign (Smart)',
    afterItems: [
      '"[Name], your favorite Blue Dream is 20% off today"',
      'Sent to: 2,500 relevant subscribers',
      'Open rate: 45%',
      'Click rate: 12%',
      'Revenue: $8,500',
    ],
    verdict: 'Same promotion. 4x fewer sends. 70% more revenue.',
    notes: 'Make the case for personalization with numbers.',
  },

  // ============================================================
  // SLIDE 10: Timing Matters
  // ============================================================
  {
    id: 'ep6-timing',
    type: 'content',
    title: 'The Science of Send Time',
    bullets: [
      'Craig analyzes when each customer typically engages',
      'Optimizes send time PER PERSON, not per campaign',
      'Respects TCPA hours (8am-9pm local time)',
      'Avoids oversaturation (frequency caps)',
      'Learns from opens, clicks, and conversions',
    ],
    highlight: 'The right message at the wrong time is the wrong message.',
    notes: 'Timing optimization is a huge lever.',
  },

  // ============================================================
  // SLIDE 11: Campaign Types
  // ============================================================
  {
    id: 'ep6-campaign-types',
    type: 'split',
    title: 'Craig\'s Campaign Playbook',
    leftTitle: 'Automated (Always Running)',
    leftBullets: [
      'Welcome series (new signups)',
      'Win-back (lapsed customers)',
      'Birthday/anniversary',
      'Review requests',
      'Loyalty milestone alerts',
    ],
    rightTitle: 'Promotional (One-Time)',
    rightBullets: [
      'Flash sales',
      'Product launches',
      'Holiday promotions',
      'Event invitations',
      'Inventory clearance',
    ],
    notes: 'Show the breadth of what Craig can automate.',
  },

  // ============================================================
  // SLIDE 12: A/B Testing
  // ============================================================
  {
    id: 'ep6-ab-testing',
    type: 'content',
    title: 'Always Be Testing',
    bullets: [
      'Craig automatically A/B tests subject lines',
      'Tests different offers on small segments first',
      'Measures: Opens, clicks, conversions, revenue',
      'Auto-selects winner and sends to remainder',
      'Builds a library of what works for YOUR audience',
    ],
    highlight: 'Every campaign makes the next one better.',
    notes: 'Continuous improvement through testing.',
  },

  // ============================================================
  // SLIDE 13: Real Campaign Example
  // ============================================================
  {
    id: 'ep6-real-example',
    type: 'content',
    title: 'Real Campaign: 4/20 Promotion',
    bullets: [
      'Segment: Customers who purchased in last 90 days',
      'Teaser email: 1 week before (build anticipation)',
      'Reminder SMS: Day before (drive urgency)',
      'Day-of SMS: "Doors open at 9am" (geo-targeted)',
      'Result: 40% of segment visited store',
    ],
    highlight: 'Multi-touch, multi-channel, fully automated.',
    notes: 'Walk through a real campaign sequence.',
  },

  // ============================================================
  // SLIDE 14: Demo
  // ============================================================
  {
    id: 'ep6-demo',
    type: 'demo',
    title: 'Build a Campaign with Craig',
    description: 'Let\'s create a simple promotion and see Craig in action.',
    instructions: [
      'Create a new campaign in the dashboard',
      'Select a segment (e.g., "Flower Lovers")',
      'Choose SMS + Email combo',
      'Watch Craig suggest copy and timing',
      'See the preview before sending',
    ],
    notes: 'Live demo of campaign creation.',
  },

  // ============================================================
  // SLIDE 15: Compliance Built-In
  // ============================================================
  {
    id: 'ep6-compliance',
    type: 'content',
    title: 'Compliance is Craig\'s Co-Pilot',
    bullets: [
      'Deebo reviews every campaign before send',
      'Automatic opt-out management',
      'TCPA timing enforcement',
      'State-specific content checks',
      'Audit trail for every message',
    ],
    highlight: 'Craig + Deebo = Bulletproof marketing.',
    notes: 'Reinforce the compliance angle.',
  },

  // ============================================================
  // SLIDE 16: Recap
  // ============================================================
  {
    id: 'ep6-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      'Personalized campaigns outperform blasts by 3-5x',
      'SMS for urgency, email for depth',
      'Timing optimization is per-person, not per-campaign',
      'Every campaign should be an A/B test',
      'Craig + Deebo ensure compliant, effective marketing',
    ],
    notes: 'Summarize the main points.',
  },

  // ============================================================
  // SLIDE 17: Resources
  // ============================================================
  {
    id: 'ep6-resources',
    type: 'content',
    title: 'Your Marketing Toolkit',
    bullets: [
      'Email Campaign Template Library (12 proven templates)',
      'Social Media Content Calendar (90 days of ideas)',
      'SMS Best Practices Checklist',
      'Campaign Performance Tracker',
      'Download them all in the Resources tab!',
    ],
    highlight: 'Stop starting from scratch. Use what works.',
    notes: 'Point to the downloadable resources.',
  },

  // ============================================================
  // SLIDE 18: CTA
  // ============================================================
  {
    id: 'ep6-cta',
    type: 'cta',
    title: 'Ready to Automate Your Marketing?',
    subtitle: 'Next up: Know what your competitors are doing...',
    primaryAction: 'Watch Episode 7',
    primaryUrl: '/academy?episode=ep7-ezal',
    secondaryAction: 'Download Templates',
    secondaryUrl: '/academy?resource=res6-campaign-template',
    nextEpisodeTitle: 'Meet Ezal: Competitive Intelligence That Never Sleeps',
    notes: 'Transition to Ezal - competitive intelligence.',
  },
];

export const EPISODE_6_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep6-craig',
  episodeNumber: 6,
  title: 'Meet Craig: Multi-Channel Campaign Automation',
  track: 'craig',
  trackColor: '#3b82f6',
  estimatedDuration: 15,
  slides: EPISODE_6_SLIDES,
};
