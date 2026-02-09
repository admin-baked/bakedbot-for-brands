/**
 * Episode 2: The Invisible Menu Problem
 *
 * Learning Objectives:
 * - Understand why iframe menus hurt SEO rankings
 * - Learn how search engines crawl and index cannabis sites
 * - Discover the difference between native menus and embedded widgets
 * - See real examples of invisible vs. optimized menus
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_2_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep2-title',
    type: 'title',
    episodeNumber: 2,
    title: 'The Invisible Menu Problem',
    subtitle: 'Why Google Can\'t Find Your Products',
    trackColor: '#3b82f6',
    notes: 'This episode reveals a major problem most dispensaries don\'t even know they have.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep2-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'Why iframe menus are killing your SEO',
      'How search engines actually crawl cannabis websites',
      'The difference between native menus and embedded widgets',
      'Real examples of invisible vs. optimized menus',
    ],
    notes: 'Set up the problem we\'re going to solve.',
  },

  // ============================================================
  // SLIDE 3: The Question
  // ============================================================
  {
    id: 'ep2-question',
    type: 'quote',
    quote: 'When was the last time someone found your dispensary by searching for a specific product?',
    attribution: 'The question every cannabis retailer should ask',
    context: 'If you can\'t remember... you have an invisible menu problem.',
    notes: 'Get them thinking. Most will realize they can\'t answer this.',
  },

  // ============================================================
  // SLIDE 4: The Hidden Problem
  // ============================================================
  {
    id: 'ep2-hidden-problem',
    type: 'content',
    title: 'The Problem Hiding in Plain Sight',
    bullets: [
      'You paid for a beautiful menu from a major platform',
      'Customers can see your products... if they\'re already on your site',
      'But Google? Google sees NOTHING.',
      'Your products are invisible to search engines',
      'You\'re missing 60-80% of potential organic traffic',
    ],
    highlight: 'Your menu exists, but it doesn\'t exist to Google.',
    notes: 'This is the "aha" moment. Build tension.',
  },

  // ============================================================
  // SLIDE 5: How Iframes Work
  // ============================================================
  {
    id: 'ep2-iframe-explained',
    type: 'split',
    title: 'What Is an Iframe Menu?',
    leftTitle: 'What You See',
    leftBullets: [
      'Your website loads',
      'Menu appears seamlessly',
      'Products display beautifully',
      'Customers can browse & buy',
      'Everything looks perfect!',
    ],
    rightTitle: 'What Google Sees',
    rightBullets: [
      'Your website HTML loads',
      'A single <iframe> tag appears',
      'The content is on another domain',
      'Google can\'t index it',
      'Your products don\'t exist to search',
    ],
    notes: 'Explain the technical reality simply.',
  },

  // ============================================================
  // SLIDE 6: Big Stat
  // ============================================================
  {
    id: 'ep2-stat-1',
    type: 'stat',
    stat: '90%+',
    label: 'of dispensary menus are iframes',
    context: 'Dutchie, Jane, Weedmaps widgets - all iframes that Google cannot crawl',
    source: 'BakedBot SEO Audit 2025',
    notes: 'Let the stat sink in. This affects almost everyone.',
  },

  // ============================================================
  // SLIDE 7: Real Example Comparison
  // ============================================================
  {
    id: 'ep2-comparison',
    type: 'comparison',
    title: 'View Source: The Truth Test',
    beforeTitle: 'Iframe Menu (What Google Sees)',
    beforeItems: [
      '<iframe src="menu.dutchie.com/xyz">',
      '<!-- That\'s it. Nothing else. -->',
      'No product names',
      'No prices',
      'No descriptions',
    ],
    afterTitle: 'Native Menu (What Google Sees)',
    afterItems: [
      '<h1>Blue Dream - 3.5g</h1>',
      '<p>Sativa-dominant hybrid...</p>',
      '<span class="price">$45</span>',
      '<meta name="product:price">',
      'Full rich data for indexing',
    ],
    verdict: 'Try it yourself: Right-click → View Page Source',
    notes: 'Encourage them to actually check their own site.',
  },

  // ============================================================
  // SLIDE 8: What Google Actually Does
  // ============================================================
  {
    id: 'ep2-googlebot',
    type: 'content',
    title: 'How Googlebot Crawls Your Site',
    bullets: [
      '1. Googlebot visits your homepage',
      '2. It reads your HTML looking for content',
      '3. When it hits an iframe, it stops',
      '4. Content on other domains = not your content',
      '5. Your products never get indexed',
    ],
    highlight: 'Googlebot doesn\'t browse your menu like a customer.',
    notes: 'Demystify how search crawling actually works.',
  },

  // ============================================================
  // SLIDE 9: The SEO Impact
  // ============================================================
  {
    id: 'ep2-seo-impact',
    type: 'content',
    title: 'The Real Cost of Invisible Menus',
    bullets: [
      'Zero product pages in Google index',
      'No organic traffic for product searches',
      '"Blue Dream near me" → your competitor shows up',
      'Paying for ads that could be free organic traffic',
      'No product schema = no rich results',
    ],
    highlight: 'You\'re paying to be invisible.',
    notes: 'Connect to their wallet - missed traffic = missed revenue.',
  },

  // ============================================================
  // SLIDE 10: Search Intent
  // ============================================================
  {
    id: 'ep2-search-intent',
    type: 'stat',
    stat: '46%',
    label: 'of all Google searches have local intent',
    context: '"Dispensary near me", "edibles in [city]", "[strain] in stock" - these searches happen daily',
    source: 'Google Search Statistics 2025',
    notes: 'People are searching for exactly what you sell.',
  },

  // ============================================================
  // SLIDE 11: What Customers Search For
  // ============================================================
  {
    id: 'ep2-customer-searches',
    type: 'content',
    title: 'What Your Customers Are Searching',
    bullets: [
      '"best dispensary near me"',
      '"Blue Dream 3.5g [your city]"',
      '"edibles for sleep near me"',
      '"[competitor name] vs [your name]"',
      '"dispensary open late [your city]"',
    ],
    highlight: 'Are you showing up for these searches?',
    notes: 'Make it concrete with real search examples.',
  },

  // ============================================================
  // SLIDE 12: The Solution
  // ============================================================
  {
    id: 'ep2-solution',
    type: 'content',
    title: 'The Native Menu Solution',
    bullets: [
      'Products live on YOUR domain, not a third-party',
      'Every product gets its own SEO-optimized page',
      'Full product schema markup for rich results',
      'Category pages that rank for broader terms',
      'Your content = your traffic = your customers',
    ],
    highlight: 'Own your menu. Own your traffic.',
    notes: 'Introduce the solution - native menus.',
  },

  // ============================================================
  // SLIDE 13: BakedBot Approach
  // ============================================================
  {
    id: 'ep2-bakedbot',
    type: 'split',
    title: 'How BakedBot Solves This',
    leftTitle: 'Technical SEO',
    leftBullets: [
      'Products sync from your POS',
      'Native pages on your domain',
      'Full schema.org markup',
      'Server-side rendering',
      'Automatic sitemap generation',
    ],
    rightTitle: 'Content SEO',
    rightBullets: [
      'AI-generated product descriptions',
      'Terpene & effect content',
      'Category landing pages',
      'Local SEO optimization',
      'Blog integration',
    ],
    notes: 'Show the comprehensive solution.',
  },

  // ============================================================
  // SLIDE 14: Demo Preview
  // ============================================================
  {
    id: 'ep2-demo',
    type: 'demo',
    title: 'See It In Action',
    description: 'Let me show you a real dispensary menu on BakedBot vs. a typical iframe menu.',
    demoUrl: 'https://bakedbot.ai/thrivesyracuse',
    instructions: [
      'Visit the BakedBot-powered menu',
      'Right-click → View Page Source',
      'Search for a product name in the HTML',
      'Compare to an iframe menu',
    ],
    notes: 'This is where you show the live demo. Navigate to the menu and show the source.',
  },

  // ============================================================
  // SLIDE 15: The Numbers
  // ============================================================
  {
    id: 'ep2-results',
    type: 'content',
    title: 'What Happens When You Fix It',
    bullets: [
      '200-500+ product pages indexed within 30 days',
      '3-5x increase in organic traffic',
      'Appearing in "near me" local pack results',
      'Rich results with prices and availability',
      'Reduced dependency on paid ads',
    ],
    highlight: 'Real dispensaries. Real results.',
    notes: 'Paint the picture of success.',
  },

  // ============================================================
  // SLIDE 16: Recap
  // ============================================================
  {
    id: 'ep2-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      'Most dispensary menus are invisible to Google',
      'Iframes block search engines from indexing your products',
      'You\'re missing organic traffic you could be capturing',
      'Native menus solve the problem completely',
      'View Page Source is your truth detector',
    ],
    notes: 'Summarize and reinforce the main points.',
  },

  // ============================================================
  // SLIDE 17: Action Item
  // ============================================================
  {
    id: 'ep2-action',
    type: 'content',
    title: 'Your Homework',
    bullets: [
      '1. Go to your dispensary website',
      '2. Right-click → View Page Source',
      '3. Ctrl+F and search for a product name',
      '4. Can you find it in the HTML?',
      '5. If not... you have an invisible menu.',
    ],
    highlight: 'Do this TODAY. Know your SEO reality.',
    notes: 'Give them a concrete action to take.',
  },

  // ============================================================
  // SLIDE 18: CTA
  // ============================================================
  {
    id: 'ep2-cta',
    type: 'cta',
    title: 'Want to Fix Your Invisible Menu?',
    subtitle: 'In Episode 3, we debunk another industry myth...',
    primaryAction: 'Watch Episode 3',
    primaryUrl: '/academy?episode=ep3-indica-sativa-lie',
    secondaryAction: 'Get a Free SEO Audit',
    secondaryUrl: 'https://bakedbot.ai/demo',
    nextEpisodeTitle: 'Indica vs. Sativa Is a Lie: Chemistry-First Cannabis Marketing',
    notes: 'Strong hook for the next episode. Tease the controversy.',
  },
];

export const EPISODE_2_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep2-invisible-menu',
  episodeNumber: 2,
  title: 'The Invisible Menu Problem',
  track: 'general',
  trackColor: '#3b82f6',
  estimatedDuration: 12,
  slides: EPISODE_2_SLIDES,
};
