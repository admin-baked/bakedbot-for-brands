/**
 * Episode 3: Indica vs. Sativa Is a Lie
 *
 * Learning Objectives:
 * - Understand the science behind cannabis effects (terpenes, cannabinoids)
 * - Learn why indica/sativa labels are marketing, not science
 * - Discover how to educate customers about entourage effect
 * - See examples of chemistry-first product descriptions
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_3_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep3-title',
    type: 'title',
    episodeNumber: 3,
    title: 'Indica vs. Sativa Is a Lie',
    subtitle: 'Chemistry-First Cannabis Marketing',
    trackColor: '#10b981',
    notes: 'This is a controversial take that will get attention. Own it.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep3-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'The real science behind cannabis effects',
      'Why indica/sativa labels fail customers',
      'How terpenes actually determine experience',
      'How to market products with chemistry-first language',
    ],
    notes: 'Set up the science-backed approach.',
  },

  // ============================================================
  // SLIDE 3: The Controversy
  // ============================================================
  {
    id: 'ep3-controversy',
    type: 'quote',
    quote: 'The terms sativa and indica are essentially meaningless. Breeding has made them irrelevant.',
    attribution: 'Dr. Ethan Russo, Neurologist & Cannabis Researcher',
    context: 'One of the world\'s leading cannabis scientists',
    notes: 'Lead with scientific authority.',
  },

  // ============================================================
  // SLIDE 4: The Traditional Story
  // ============================================================
  {
    id: 'ep3-traditional',
    type: 'split',
    title: 'The Story We\'ve All Been Told',
    leftTitle: 'Indica',
    leftBullets: [
      '"In da couch"',
      'Relaxing, sedating',
      'Body high',
      'Good for sleep',
      'Short, bushy plants',
    ],
    rightTitle: 'Sativa',
    rightBullets: [
      'Energizing, uplifting',
      'Head high',
      'Creative, social',
      'Good for daytime',
      'Tall, thin plants',
    ],
    notes: 'Acknowledge what everyone thinks they know.',
  },

  // ============================================================
  // SLIDE 5: The Problem
  // ============================================================
  {
    id: 'ep3-problem',
    type: 'content',
    title: 'Here\'s Why It\'s Wrong',
    bullets: [
      'After decades of cross-breeding, "pure" strains barely exist',
      'Plant shape has nothing to do with chemical effects',
      'Same "indica" can affect two people completely differently',
      'Customers choose based on labels that don\'t predict effects',
      'Budtenders perpetuate myths instead of educating',
    ],
    highlight: 'We\'ve been using botanical terms to describe pharmacological effects.',
    notes: 'Challenge the conventional wisdom directly.',
  },

  // ============================================================
  // SLIDE 6: The Real Science
  // ============================================================
  {
    id: 'ep3-science',
    type: 'content',
    title: 'What Actually Determines Your Experience',
    bullets: [
      'CANNABINOIDS: THC, CBD, CBN, CBG, and 100+ others',
      'TERPENES: Aromatic compounds that shape effects',
      'YOUR BIOLOGY: Endocannabinoid system differences',
      'DOSAGE: Same product, different amounts = different effects',
      'CONSUMPTION METHOD: Smoking vs. edibles vs. vaping',
    ],
    highlight: 'It\'s chemistry, not categories.',
    notes: 'Introduce the real factors that matter.',
  },

  // ============================================================
  // SLIDE 7: Terpenes 101
  // ============================================================
  {
    id: 'ep3-terpenes-intro',
    type: 'content',
    title: 'Terpenes: The Hidden Controllers',
    bullets: [
      'Found in all plants (lavender, citrus, pine, hops)',
      'Over 200 different terpenes in cannabis',
      'They determine smell AND effects',
      'They modulate how THC affects you',
      'Same THC % + different terpenes = completely different high',
    ],
    highlight: 'Terpenes are the secret ingredient.',
    notes: 'Set up terpene education.',
  },

  // ============================================================
  // SLIDE 8: Key Terpenes
  // ============================================================
  {
    id: 'ep3-terpene-chart',
    type: 'split',
    title: 'The Big 6 Terpenes',
    leftTitle: 'Relaxing Terpenes',
    leftBullets: [
      'MYRCENE: Earthy, musky. Sedating.',
      'LINALOOL: Floral (lavender). Calming.',
      'BETA-CARYOPHYLLENE: Spicy. Anti-anxiety.',
    ],
    rightTitle: 'Energizing Terpenes',
    rightBullets: [
      'LIMONENE: Citrus. Mood boost.',
      'PINENE: Pine. Alert, memory.',
      'TERPINOLENE: Fruity. Uplifting.',
    ],
    notes: 'Simplify to the most important terpenes.',
  },

  // ============================================================
  // SLIDE 9: The Entourage Effect
  // ============================================================
  {
    id: 'ep3-entourage',
    type: 'content',
    title: 'The Entourage Effect',
    bullets: [
      'Cannabinoids + terpenes work together synergistically',
      'Full-spectrum products have different effects than isolates',
      'Myrcene + THC = enhanced sedation',
      'Pinene + THC = counteracts some memory impairment',
      'It\'s the ensemble, not the soloists',
    ],
    highlight: 'The whole plant is greater than the sum of its parts.',
    notes: 'Explain why terpenes matter alongside THC.',
  },

  // ============================================================
  // SLIDE 10: Stat
  // ============================================================
  {
    id: 'ep3-stat',
    type: 'stat',
    stat: '5%',
    label: 'of budtenders can explain terpenes to customers',
    context: 'Meanwhile, customers are making purchase decisions based on outdated labels',
    source: 'Headset Retail Survey 2025',
    notes: 'Highlight the education gap in the industry.',
  },

  // ============================================================
  // SLIDE 11: The Marketing Opportunity
  // ============================================================
  {
    id: 'ep3-opportunity',
    type: 'content',
    title: 'The Dispensary Opportunity',
    bullets: [
      'Most competitors still use indica/sativa labels',
      'Customers WANT better information',
      'Chemistry-first marketing builds trust',
      'Higher-margin products (full-spectrum) sell better',
      'Positions you as the expert in your market',
    ],
    highlight: 'Education = differentiation = loyalty.',
    notes: 'Connect science to business opportunity.',
  },

  // ============================================================
  // SLIDE 12: Old vs New Descriptions
  // ============================================================
  {
    id: 'ep3-descriptions',
    type: 'comparison',
    title: 'Rewriting Product Descriptions',
    beforeTitle: 'Traditional (Vague)',
    beforeItems: [
      '"Blue Dream - Sativa"',
      '"Great for daytime use"',
      '"Uplifting and creative"',
      '"THC: 22%"',
      '',
    ],
    afterTitle: 'Chemistry-First (Specific)',
    afterItems: [
      '"Blue Dream - Balanced Hybrid"',
      '"Dominant terpenes: Myrcene, Pinene, Caryophyllene"',
      '"Expect: Relaxed body, clear-headed focus"',
      '"Best for: Stress relief without sedation"',
      '"THC: 22% | CBD: 0.1% | Myrcene: 0.8%"',
    ],
    verdict: 'Which description helps the customer more?',
    notes: 'Show concrete before/after examples.',
  },

  // ============================================================
  // SLIDE 13: How Smokey Does It
  // ============================================================
  {
    id: 'ep3-smokey',
    type: 'agent',
    agentId: 'smokey',
    agentName: 'Smokey the Budtender',
    tagline: 'Chemistry-First Recommendations',
    description: 'Smokey recommends products based on terpene profiles and desired effects, not outdated indica/sativa labels.',
    capabilities: [
      '"I want something relaxing" → High-myrcene options',
      '"I need focus for work" → Pinene-dominant strains',
      '"Help me sleep" → Myrcene + Linalool combinations',
      'Learns your preferences over time',
    ],
    color: '#10b981',
    icon: 'leaf',
    notes: 'Connect to Smokey\'s chemistry-first approach.',
  },

  // ============================================================
  // SLIDE 14: Demo
  // ============================================================
  {
    id: 'ep3-demo',
    type: 'demo',
    title: 'See Smokey in Action',
    description: 'Let me show you how Smokey recommends products using terpene science.',
    demoUrl: 'https://bakedbot.ai/thrivesyracuse',
    instructions: [
      'Open the chat with Smokey',
      'Ask: "I want something relaxing but not sleepy"',
      'Notice the terpene-based recommendations',
      'Ask: "Why did you recommend that?"',
    ],
    notes: 'Live demo of Smokey making chemistry-first recommendations.',
  },

  // ============================================================
  // SLIDE 15: Customer Education
  // ============================================================
  {
    id: 'ep3-education',
    type: 'content',
    title: 'Educating Your Customers',
    bullets: [
      'Include terpene profiles on product pages',
      'Train budtenders to ask about desired EFFECTS, not "indica or sativa"',
      'Create "effect guides" instead of strain type charts',
      'Use comparisons: "This is like lavender + citrus"',
      'Let them smell products when possible',
    ],
    highlight: 'Help customers understand their own preferences.',
    notes: 'Practical steps dispensaries can take.',
  },

  // ============================================================
  // SLIDE 16: Quick Reference
  // ============================================================
  {
    id: 'ep3-reference',
    type: 'content',
    title: 'Terpene Quick Reference',
    bullets: [
      'WANT RELAXATION? Look for Myrcene, Linalool',
      'WANT ENERGY? Look for Limonene, Pinene',
      'WANT FOCUS? Look for Pinene, Terpinolene',
      'WANT PAIN RELIEF? Look for Caryophyllene, Myrcene',
      'WANT MOOD BOOST? Look for Limonene, Linalool',
    ],
    highlight: 'Download our Terpene Education Template below!',
    notes: 'Give them a practical cheat sheet.',
  },

  // ============================================================
  // SLIDE 17: Recap
  // ============================================================
  {
    id: 'ep3-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      'Indica/sativa labels are botanically, not pharmacologically, meaningful',
      'Terpenes are the real drivers of cannabis effects',
      'The entourage effect means the whole plant matters',
      'Chemistry-first marketing differentiates you from competitors',
      'Customers want education, not outdated categories',
    ],
    notes: 'Summarize the paradigm shift.',
  },

  // ============================================================
  // SLIDE 18: CTA
  // ============================================================
  {
    id: 'ep3-cta',
    type: 'cta',
    title: 'Ready to Go Chemistry-First?',
    subtitle: 'Episode 4 tackles another competitive advantage...',
    primaryAction: 'Watch Episode 4',
    primaryUrl: '/academy?episode=ep4-compliance-moat',
    secondaryAction: 'Download Terpene Guide',
    secondaryUrl: '/academy?resource=res3-terpene-guide',
    nextEpisodeTitle: 'Compliance as Competitive Moat: Turn Regulations Into Advantages',
    notes: 'Strong hook for compliance episode. Download the resource.',
  },
];

export const EPISODE_3_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep3-indica-sativa-lie',
  episodeNumber: 3,
  title: 'Indica vs. Sativa Is a Lie',
  track: 'general',
  trackColor: '#10b981',
  estimatedDuration: 13,
  slides: EPISODE_3_SLIDES,
};
