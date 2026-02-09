/**
 * Episode 12: The Full Stack - How All 7 Agents Work Together
 *
 * Learning Objectives:
 * - Understand how agents communicate and hand off tasks
 * - Learn the data flow between agents and systems
 * - Discover the orchestration layer that coordinates everything
 * - See a real-world case study of BakedBot in production
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_12_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep12-title',
    type: 'title',
    episodeNumber: 12,
    title: 'The Full Stack',
    subtitle: 'How All 7 Agents Work Together',
    trackColor: '#10b981',
    notes: 'The finale. Show the full power of the platform working together.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep12-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'How agents communicate and hand off tasks',
      'The data flow between agents and systems',
      'The orchestration layer that coordinates everything',
      'A real-world case study of BakedBot in production',
    ],
    notes: 'This ties everything together.',
  },

  // ============================================================
  // SLIDE 3: The Vision
  // ============================================================
  {
    id: 'ep12-vision',
    type: 'quote',
    quote: 'The magic isn\'t any single agent. It\'s what happens when they all work together.',
    attribution: 'BakedBot Philosophy',
    context: 'Autonomous commerce isn\'t a feature. It\'s an ecosystem.',
    notes: 'Set the stage for the integrated view.',
  },

  // ============================================================
  // SLIDE 4: The Squad Recap
  // ============================================================
  {
    id: 'ep12-squad-recap',
    type: 'content',
    title: 'The 7 Agents: A Quick Recap',
    bullets: [
      'SMOKEY: Product recommendations & customer chat',
      'CRAIG: Multi-channel marketing campaigns',
      'EZAL: Competitive intelligence monitoring',
      'POPS: Data analysis & insights',
      'MONEY MIKE: Pricing & margin optimization',
      'MRS. PARKER: Customer retention & relationships',
      'DEEBO: Compliance enforcement',
    ],
    highlight: '7 specialists. 1 unified intelligence.',
    notes: 'Quick reminder of who does what.',
  },

  // ============================================================
  // SLIDE 5: Communication Layer
  // ============================================================
  {
    id: 'ep12-communication',
    type: 'content',
    title: 'How Agents Communicate',
    bullets: [
      'Shared context: All agents access the same customer data',
      'Event triggers: Actions by one agent trigger others',
      'Handoffs: "Ezal found something for Money Mike"',
      'Memory: Letta stores insights shared across agents',
      'Orchestration: Leo coordinates who does what',
    ],
    highlight: 'They collaborate automatically, not manually.',
    notes: 'Show the communication architecture.',
  },

  // ============================================================
  // SLIDE 6: A Day in the Life
  // ============================================================
  {
    id: 'ep12-day-in-life',
    type: 'content',
    title: 'A Day in the Life of BakedBot',
    bullets: [
      '6:00am - Ezal completes overnight competitor scan',
      '7:00am - Pops generates daily briefing with insights',
      '9:00am - Craig sends morning SMS to opted-in customers',
      '10:00am - Smokey handles 50+ chat conversations',
      '11:00am - Money Mike adjusts prices on expiring inventory',
      '2:00pm - Mrs. Parker triggers win-back to lapsed customer',
      '6:00pm - Deebo blocks after-hours marketing attempt',
    ],
    highlight: 'All of this happens without you lifting a finger.',
    notes: 'Paint the picture of daily automation.',
  },

  // ============================================================
  // SLIDE 7: Workflow Example 1
  // ============================================================
  {
    id: 'ep12-workflow-1',
    type: 'content',
    title: 'Workflow: Competitive Price Response',
    bullets: [
      '1. EZAL: Detects competitor dropped flower prices 15%',
      '2. MONEY MIKE: Analyzes margin impact of matching',
      '3. MONEY MIKE: Recommends matching on top 5 SKUs only',
      '4. CRAIG: Drafts "Price Match" SMS campaign',
      '5. DEEBO: Reviews and approves campaign compliance',
      '6. CRAIG: Sends to segment of price-sensitive customers',
      '7. POPS: Tracks results, feeds back for next time',
    ],
    highlight: 'From detection to action in under 2 hours.',
    notes: 'Walk through a real multi-agent workflow.',
  },

  // ============================================================
  // SLIDE 8: Workflow Example 2
  // ============================================================
  {
    id: 'ep12-workflow-2',
    type: 'content',
    title: 'Workflow: New Customer Journey',
    bullets: [
      '1. Customer visits website, chats with SMOKEY',
      '2. SMOKEY recommends products based on stated needs',
      '3. Customer signs up for SMS (consent captured)',
      '4. MRS. PARKER: Triggers welcome sequence',
      '5. CRAIG: Sends welcome email with first-time offer',
      '6. Customer returns, SMOKEY remembers preferences',
      '7. POPS: Tracks conversion from new → repeat',
    ],
    highlight: 'Seamless journey across all touchpoints.',
    notes: 'Customer experience workflow.',
  },

  // ============================================================
  // SLIDE 9: Workflow Example 3
  // ============================================================
  {
    id: 'ep12-workflow-3',
    type: 'content',
    title: 'Workflow: Inventory Optimization',
    bullets: [
      '1. POPS: Identifies slow-moving edibles approaching expiration',
      '2. MONEY MIKE: Creates clearance pricing schedule',
      '3. SMOKEY: Prioritizes edibles in recommendations',
      '4. CRAIG: Sends "Edibles Event" SMS to segment',
      '5. DEEBO: Verifies all messaging is compliant',
      '6. POPS: Tracks sell-through, adjusts next campaign',
      '7. Result: $0 expired product, revenue recovered',
    ],
    highlight: 'Inventory intelligence drives coordinated action.',
    notes: 'Inventory → marketing → sales loop.',
  },

  // ============================================================
  // SLIDE 10: The Orchestration Layer
  // ============================================================
  {
    id: 'ep12-orchestration',
    type: 'content',
    title: 'The Orchestration Layer',
    bullets: [
      'LEO (AI COO) coordinates all agent activities',
      'Prioritizes tasks based on urgency and impact',
      'Prevents conflicts (no duplicate messages)',
      'Escalates to humans when needed',
      'Learns optimal sequencing over time',
    ],
    highlight: 'One conductor. Seven instruments. One symphony.',
    notes: 'Introduce Leo as the coordinator.',
  },

  // ============================================================
  // SLIDE 11: Shared Memory
  // ============================================================
  {
    id: 'ep12-shared-memory',
    type: 'content',
    title: 'Shared Memory: The Connective Tissue',
    bullets: [
      'Letta: Long-term memory for customer insights',
      'Every agent can read and write to shared memory',
      'Smokey learns → Mrs. Parker remembers',
      'Pops analyzes → Money Mike acts on insights',
      'Knowledge compounds over time',
    ],
    highlight: 'The more you use it, the smarter it gets.',
    notes: 'Memory as competitive advantage.',
  },

  // ============================================================
  // SLIDE 12: Case Study Intro
  // ============================================================
  {
    id: 'ep12-case-study-intro',
    type: 'content',
    title: 'Case Study: Thrive Syracuse',
    bullets: [
      'Single-location dispensary in Syracuse, NY',
      'Went live with BakedBot in Q4 2025',
      'POS integration: Alleaves',
      '404 products synced and managed',
      'Full agent suite deployed',
    ],
    highlight: 'Real dispensary. Real results.',
    notes: 'Introduce the case study.',
  },

  // ============================================================
  // SLIDE 13: Case Study Results
  // ============================================================
  {
    id: 'ep12-case-study-results',
    type: 'split',
    title: 'Thrive Syracuse: 90-Day Results',
    leftTitle: 'Operational Wins',
    leftBullets: [
      '100% pricing coverage (was 48%)',
      'Zero expired inventory',
      '24/7 chat support (no staffing cost)',
      'Automated compliance checking',
      'Daily competitive intelligence',
    ],
    rightTitle: 'Business Impact',
    rightBullets: [
      '+23% average order value',
      '+35% repeat customer rate',
      '-15% marketing spend (same revenue)',
      '+4 hours/week saved on manual tasks',
      'First page Google rankings for local searches',
    ],
    notes: 'Show concrete results.',
  },

  // ============================================================
  // SLIDE 14: Demo
  // ============================================================
  {
    id: 'ep12-demo',
    type: 'demo',
    title: 'See It All Working Together',
    description: 'Let\'s walk through the Thrive Syracuse dashboard and see all agents in action.',
    demoUrl: 'https://bakedbot.ai/thrivesyracuse',
    instructions: [
      'Navigate to the menu and chat with Smokey',
      'Review the competitive intelligence dashboard',
      'Check the analytics overview',
      'See the marketing campaign calendar',
      'View the compliance audit log',
    ],
    notes: 'Full platform walkthrough.',
  },

  // ============================================================
  // SLIDE 15: Implementation Path
  // ============================================================
  {
    id: 'ep12-implementation',
    type: 'content',
    title: 'Your Implementation Roadmap',
    bullets: [
      'WEEK 1: POS integration + product catalog sync',
      'WEEK 2: Menu live + Smokey activated',
      'WEEK 3: SMS/Email setup + consent capture',
      'WEEK 4: Craig campaigns + Deebo compliance',
      'WEEK 5+: Full agent suite + optimization',
    ],
    highlight: 'Go live in 30 days. Full value in 90.',
    notes: 'Make implementation feel achievable.',
  },

  // ============================================================
  // SLIDE 16: What\'s Next
  // ============================================================
  {
    id: 'ep12-whats-next',
    type: 'content',
    title: 'What\'s Coming to BakedBot',
    bullets: [
      'Voice agents: Smokey on the phone',
      'Delivery optimization: Route planning AI',
      'Predictive ordering: Know what customers want before they do',
      'Multi-location intelligence: Compare stores, share learnings',
      'Wholesale/B2B agents: Brand-to-retailer automation',
    ],
    highlight: 'This is just the beginning.',
    notes: 'Tease the roadmap.',
  },

  // ============================================================
  // SLIDE 17: Final Recap
  // ============================================================
  {
    id: 'ep12-final-recap',
    type: 'recap',
    title: 'Key Takeaways from the Academy',
    takeaways: [
      '7 specialized agents working as one unified system',
      'Automation that respects compliance at every step',
      'Chemistry-first product marketing beats outdated labels',
      'Data-driven decisions across all operations',
      'The businesses that embrace AI will win',
    ],
    notes: 'Summarize the entire curriculum.',
  },

  // ============================================================
  // SLIDE 18: Final CTA
  // ============================================================
  {
    id: 'ep12-final-cta',
    type: 'cta',
    title: 'Ready to Join the Revolution?',
    subtitle: 'Thank you for completing the Cannabis Marketing AI Academy!',
    primaryAction: 'Book Your Demo',
    primaryUrl: 'https://bakedbot.ai/demo?source=academy-graduate',
    secondaryAction: 'Download Implementation Roadmap',
    secondaryUrl: '/academy?resource=res14-implementation-roadmap',
    nextEpisodeTitle: 'Congratulations! You\'ve completed Season 1.',
    notes: 'Strong final CTA. Celebrate their completion.',
  },
];

export const EPISODE_12_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep12-full-stack',
  episodeNumber: 12,
  title: 'The Full Stack: How All 7 Agents Work Together',
  track: 'general',
  trackColor: '#10b981',
  estimatedDuration: 20,
  slides: EPISODE_12_SLIDES,
};
