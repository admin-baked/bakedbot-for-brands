/**
 * Episode 5: Meet Smokey - AI-Powered Product Recommendations
 *
 * Learning Objectives:
 * - Understand how Smokey analyzes terpene profiles for recommendations
 * - Learn the difference between collaborative filtering and content-based filtering
 * - Discover how preference learning improves over time
 * - See live demos of Smokey in action
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_5_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep5-title',
    type: 'title',
    episodeNumber: 5,
    title: 'Meet Smokey',
    subtitle: 'AI-Powered Product Recommendations That Actually Work',
    trackColor: '#10b981',
    notes: 'This is the first agent deep dive. Smokey is often the first agent customers interact with.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep5-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'How Smokey analyzes terpene profiles for recommendations',
      'The science behind preference learning',
      'Why traditional budtender approaches fall short',
      'Live demos of Smokey recommending products',
    ],
    notes: 'Set up for a deep technical dive into recommendation systems.',
  },

  // ============================================================
  // SLIDE 3: The Budtender Problem
  // ============================================================
  {
    id: 'ep5-budtender-problem',
    type: 'content',
    title: 'The Traditional Budtender Problem',
    bullets: [
      'New budtenders take 6+ months to learn the catalog',
      'Knowledge walks out the door with every resignation',
      'Inconsistent recommendations based on personal bias',
      'Can\'t remember every customer\'s preferences',
      'Limited by what they\'ve personally tried',
    ],
    highlight: 'Your best budtender can\'t scale. Smokey can.',
    notes: 'Establish the pain point Smokey solves.',
  },

  // ============================================================
  // SLIDE 4: Meet Smokey
  // ============================================================
  {
    id: 'ep5-smokey-intro',
    type: 'agent',
    agentId: 'smokey',
    agentName: 'Smokey the Budtender',
    tagline: 'Chemistry-First Product Recommendations',
    description: 'Smokey knows your entire catalog and recommends products based on terpene profiles, effects, and customer preferences - not outdated indica/sativa labels.',
    capabilities: [
      'Instant knowledge of 100s of products',
      'Terpene-based effect matching',
      'Customer preference memory',
      'Real-time inventory awareness',
    ],
    color: '#10b981',
    icon: 'leaf',
    notes: 'Full introduction to Smokey.',
  },

  // ============================================================
  // SLIDE 5: How Smokey Thinks
  // ============================================================
  {
    id: 'ep5-how-smokey-thinks',
    type: 'content',
    title: 'How Smokey Makes Recommendations',
    bullets: [
      '1. UNDERSTAND: What effect is the customer seeking?',
      '2. ANALYZE: What terpene profiles match that effect?',
      '3. FILTER: What\'s in stock at the right price point?',
      '4. PERSONALIZE: What has this customer liked before?',
      '5. RECOMMEND: Present top 3 options with explanations',
    ],
    highlight: 'Every recommendation has a reason behind it.',
    notes: 'Show the logic flow.',
  },

  // ============================================================
  // SLIDE 6: Chemistry-First Approach
  // ============================================================
  {
    id: 'ep5-chemistry-first',
    type: 'split',
    title: 'Traditional vs. Chemistry-First',
    leftTitle: 'Traditional Budtender',
    leftBullets: [
      '"Want indica or sativa?"',
      'Recommends by THC percentage',
      'Personal favorites dominate',
      'Same 5 products to everyone',
      'No data on what works',
    ],
    rightTitle: 'Smokey',
    rightBullets: [
      '"What experience are you looking for?"',
      'Matches by terpene profile',
      'Data-driven recommendations',
      'Personalized to each customer',
      'Learns what actually works',
    ],
    notes: 'Contrast the approaches clearly.',
  },

  // ============================================================
  // SLIDE 7: Terpene Matching
  // ============================================================
  {
    id: 'ep5-terpene-matching',
    type: 'content',
    title: 'Terpene-Based Effect Matching',
    bullets: [
      '"I want to relax" → High myrcene, linalool products',
      '"I need energy" → Limonene, pinene dominant strains',
      '"Help me sleep" → Myrcene + CBN combinations',
      '"Reduce anxiety" → Caryophyllene, linalool blends',
      '"I want creativity" → Terpinolene, pinene profiles',
    ],
    highlight: 'Smokey speaks chemistry, not marketing labels.',
    notes: 'Concrete examples of the matching logic.',
  },

  // ============================================================
  // SLIDE 8: The Data Advantage
  // ============================================================
  {
    id: 'ep5-data-advantage',
    type: 'stat',
    stat: '100%',
    label: 'catalog knowledge from day one',
    context: 'Smokey knows every product, every terpene profile, every review, every price point. Instantly.',
    notes: 'Emphasize the immediate value.',
  },

  // ============================================================
  // SLIDE 9: Preference Learning
  // ============================================================
  {
    id: 'ep5-preference-learning',
    type: 'content',
    title: 'Preference Learning Over Time',
    bullets: [
      'Smokey remembers what each customer has purchased',
      'Tracks which recommendations led to sales',
      'Notes when customers return products or complain',
      'Builds a "taste profile" for frequent buyers',
      'Gets better with every interaction',
    ],
    highlight: 'The more you use Smokey, the smarter Smokey gets.',
    notes: 'Explain the learning loop.',
  },

  // ============================================================
  // SLIDE 10: Customer Journey
  // ============================================================
  {
    id: 'ep5-customer-journey',
    type: 'content',
    title: 'A Customer\'s Journey with Smokey',
    bullets: [
      'FIRST VISIT: Smokey asks about experience level and goals',
      'FIRST REC: Based on stated preferences + popular products',
      'FOLLOW-UP: "How was the Blue Dream? Looking for more?"',
      'REPEAT VISIT: "Welcome back! Based on what you liked..."',
      'VIP STATUS: Proactive alerts on products matching their profile',
    ],
    highlight: 'From stranger to regular in 3 visits.',
    notes: 'Tell the story of relationship building.',
  },

  // ============================================================
  // SLIDE 11: Inventory Awareness
  // ============================================================
  {
    id: 'ep5-inventory-aware',
    type: 'content',
    title: 'Real-Time Inventory Intelligence',
    bullets: [
      'Smokey only recommends what\'s actually in stock',
      'Automatically adjusts when products sell out',
      'Prioritizes products that need to move (approaching expiration)',
      'Balances customer satisfaction with business needs',
      'Updates instantly when new products arrive',
    ],
    highlight: 'No more "sorry, we\'re out of that."',
    notes: 'Connect Smokey to inventory management.',
  },

  // ============================================================
  // SLIDE 12: Where Smokey Lives
  // ============================================================
  {
    id: 'ep5-where-smokey-lives',
    type: 'split',
    title: 'Where Customers Find Smokey',
    leftTitle: 'Online Touchpoints',
    leftBullets: [
      'Website chat widget',
      'SMS conversations',
      'WhatsApp messages',
      'Instagram DMs (coming)',
      'Email responses',
    ],
    rightTitle: 'In-Store Support',
    rightBullets: [
      'Budtender assistance tool',
      'Kiosk recommendations',
      'QR code product info',
      'Tablet-based consultations',
      'Drive-thru ordering',
    ],
    notes: 'Show the omnichannel presence.',
  },

  // ============================================================
  // SLIDE 13: Demo Time
  // ============================================================
  {
    id: 'ep5-demo',
    type: 'demo',
    title: 'Watch Smokey in Action',
    description: 'Let\'s see how Smokey handles different customer requests.',
    demoUrl: 'https://bakedbot.ai/thrivesyracuse',
    instructions: [
      'Open the chat widget',
      'Try: "I want something relaxing but not sleepy"',
      'Try: "What\'s good for a beginner?"',
      'Try: "Show me something similar to Blue Dream"',
      'Notice the terpene-based explanations',
    ],
    notes: 'Live demo showing various recommendation scenarios.',
  },

  // ============================================================
  // SLIDE 14: Results
  // ============================================================
  {
    id: 'ep5-results',
    type: 'content',
    title: 'Real Results from Smokey',
    bullets: [
      '23% increase in average order value',
      '15% reduction in return rates',
      '40% of customers say they tried something new',
      '3x faster than training new budtenders',
      '24/7 availability (no sick days)',
    ],
    highlight: 'Smokey pays for itself in the first month.',
    notes: 'Business impact metrics.',
  },

  // ============================================================
  // SLIDE 15: The Handoff
  // ============================================================
  {
    id: 'ep5-handoff',
    type: 'content',
    title: 'Smokey + Human Budtenders',
    bullets: [
      'Smokey handles routine questions instantly',
      'Complex cases get escalated to humans',
      'Budtenders see Smokey\'s notes and recommendations',
      'Human insight feeds back into Smokey\'s learning',
      'Best of both worlds: AI speed + human warmth',
    ],
    highlight: 'Smokey augments your team, doesn\'t replace them.',
    notes: 'Address the "AI replacing jobs" concern.',
  },

  // ============================================================
  // SLIDE 16: Recap
  // ============================================================
  {
    id: 'ep5-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      'Smokey uses chemistry (terpenes), not labels (indica/sativa)',
      'Recommendations improve with every customer interaction',
      'Real-time inventory awareness prevents disappointment',
      'Available everywhere your customers are',
      'Augments human budtenders, doesn\'t replace them',
    ],
    notes: 'Reinforce the main points.',
  },

  // ============================================================
  // SLIDE 17: Resource
  // ============================================================
  {
    id: 'ep5-resource',
    type: 'content',
    title: 'Your Homework',
    bullets: [
      'Map your top 10 products by dominant terpenes',
      'Create a "customer persona" for each terpene profile',
      'Identify 3 products that could use better descriptions',
      'Train your team on effect-based language',
      'Download the Customer Persona Worksheet!',
    ],
    highlight: 'Start thinking chemistry-first today.',
    notes: 'Actionable next steps.',
  },

  // ============================================================
  // SLIDE 18: CTA
  // ============================================================
  {
    id: 'ep5-cta',
    type: 'cta',
    title: 'Ready to Scale Your Best Budtender?',
    subtitle: 'Next up: The marketing powerhouse...',
    primaryAction: 'Watch Episode 6',
    primaryUrl: '/academy?episode=ep6-craig',
    secondaryAction: 'Download Persona Worksheet',
    secondaryUrl: '/academy?resource=res5-persona-worksheet',
    nextEpisodeTitle: 'Meet Craig: Multi-Channel Campaign Automation for Cannabis',
    notes: 'Transition to Craig - the marketing agent.',
  },
];

export const EPISODE_5_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep5-smokey',
  episodeNumber: 5,
  title: 'Meet Smokey: AI-Powered Product Recommendations',
  track: 'smokey',
  trackColor: '#10b981',
  estimatedDuration: 14,
  slides: EPISODE_5_SLIDES,
};
