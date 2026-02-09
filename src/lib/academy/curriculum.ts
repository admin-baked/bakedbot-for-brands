/**
 * Cannabis Marketing AI Academy - 12 Episode Curriculum
 *
 * This curriculum positions BakedBot as the category-defining authority in cannabis + AI marketing.
 * Each episode showcases agent capabilities while teaching strategic cannabis marketing concepts.
 */

import type { AcademyEpisode, AcademyResource, AgentTrack, AgentTrackInfo } from '@/types/academy';

/**
 * Agent Track Information
 * Each track represents one of the BakedBot agents and their domain expertise
 */
export const AGENT_TRACKS: Record<AgentTrack, AgentTrackInfo> = {
  smokey: {
    name: 'Smokey the Budtender',
    tagline: 'Master AI-Powered Product Recommendations',
    description: 'Learn how Smokey uses chemistry-first recommendations to help customers find perfect products based on terpenes, effects, and preferences',
    color: '#10b981', // Green
    icon: 'leaf',
    modules: 1,
  },
  craig: {
    name: 'Craig the Marketer',
    tagline: 'Automate Campaign Strategy & Execution',
    description: 'Discover how Craig orchestrates multi-channel campaigns across SMS, email, and social media with compliance-first automation',
    color: '#3b82f6', // Blue
    icon: 'megaphone',
    modules: 1,
  },
  pops: {
    name: 'Pops the Analyst',
    tagline: 'Turn Data Into Actionable Insights',
    description: 'See how Pops analyzes customer behavior, sales patterns, and inventory trends to optimize business decisions',
    color: '#8b5cf6', // Purple
    icon: 'chart-bar',
    modules: 1,
  },
  ezal: {
    name: 'Ezal the Lookout',
    tagline: 'Competitive Intelligence on Autopilot',
    description: 'Watch Ezal monitor competitor pricing, menu changes, and market trends to keep you ahead of the competition',
    color: '#f59e0b', // Amber
    icon: 'binoculars',
    modules: 1,
  },
  'money-mike': {
    name: 'Money Mike the Optimizer',
    tagline: 'Maximize Revenue with Dynamic Pricing',
    description: 'Learn how Money Mike uses AI to optimize pricing, margins, and promotions for maximum profitability',
    color: '#10b981', // Green (money)
    icon: 'dollar-sign',
    modules: 1,
  },
  'mrs-parker': {
    name: 'Mrs. Parker the Retention Specialist',
    tagline: 'Build Lasting Customer Relationships',
    description: 'Discover how Mrs. Parker personalizes customer experiences and drives loyalty through intelligent retention campaigns',
    color: '#ec4899', // Pink
    icon: 'heart',
    modules: 1,
  },
  deebo: {
    name: 'Deebo the Enforcer',
    tagline: 'Stay Compliant, Stay Safe',
    description: 'See how Deebo ensures all marketing, products, and operations stay within state and federal compliance requirements',
    color: '#ef4444', // Red
    icon: 'shield',
    modules: 1,
  },
};

/**
 * Full 12-Episode Curriculum
 *
 * Season 1 Structure:
 * - Episodes 1-4: Foundations (general cannabis + AI concepts)
 * - Episodes 5-11: Agent Deep Dives (one agent per episode)
 * - Episode 12: Integration (full-stack showcase)
 */
export const ACADEMY_EPISODES: AcademyEpisode[] = [
  // ========== EPISODE 1: INTRODUCTION ==========
  {
    id: 'ep1-intro',
    episodeNumber: 1,
    title: 'Welcome to the Cannabis Marketing AI Revolution',
    description: 'Discover how AI agents are transforming cannabis retail, why traditional dashboards are failing operators, and what autonomous commerce really means for your business.',
    track: 'general',
    youtubeId: 'PLACEHOLDER',
    duration: 600, // 10 minutes
    learningObjectives: [
      'Understand the 7 BakedBot agents and their roles',
      'See the difference between AI agents vs. traditional dashboards',
      'Identify your biggest cannabis marketing challenges',
      'Learn the 3 pillars of autonomous commerce',
    ],
    resources: [
      {
        id: 'res1-ai-readiness',
        title: 'AI Readiness Checklist for Cannabis Businesses',
        description: 'Evaluate your business readiness for AI implementation with this comprehensive 20-point checklist',
        type: 'checklist',
        downloadUrl: '/academy/checklists/ai-readiness-checklist.pdf',
        fileType: 'pdf',
        requiresEmail: false, // First 3 resources are free
      },
    ],
    requiresEmail: false, // First 3 videos are free
  },

  // ========== EPISODE 2: THE INVISIBLE MENU PROBLEM ==========
  {
    id: 'ep2-invisible-menu',
    episodeNumber: 2,
    title: 'The Invisible Menu Problem: Why Google Can\'t Find Your Products',
    description: 'Learn why iframe menus kill your SEO, how to make your products discoverable, and the technical architecture behind modern cannabis e-commerce.',
    track: 'general',
    youtubeId: 'PLACEHOLDER',
    duration: 720, // 12 minutes
    learningObjectives: [
      'Understand why iframe menus hurt SEO rankings',
      'Learn how search engines crawl and index cannabis sites',
      'Discover the difference between native menus and embedded widgets',
      'See real examples of invisible vs. optimized menus',
    ],
    resources: [
      {
        id: 'res2-seo-guide',
        title: 'Cannabis SEO Guide 2026',
        description: 'Complete guide to ranking your dispensary products on Google, including technical SEO, content strategy, and compliance considerations',
        type: 'guide',
        downloadUrl: '/academy/guides/cannabis-seo-guide-2026.pdf',
        fileType: 'pdf',
        requiresEmail: false,
      },
    ],
    requiresEmail: false,
  },

  // ========== EPISODE 3: INDICA VS SATIVA IS A LIE ==========
  {
    id: 'ep3-indica-sativa-lie',
    episodeNumber: 3,
    title: 'Indica vs. Sativa Is a Lie: Chemistry-First Cannabis Marketing',
    description: 'Discover why the indica/sativa classification is scientifically inaccurate, how terpenes drive effects, and how to educate customers using chemistry-first language.',
    track: 'general',
    youtubeId: 'PLACEHOLDER',
    duration: 780, // 13 minutes
    learningObjectives: [
      'Understand the science behind cannabis effects (terpenes, cannabinoids)',
      'Learn why indica/sativa labels are marketing, not science',
      'Discover how to educate customers about entourage effect',
      'See examples of chemistry-first product descriptions',
    ],
    resources: [
      {
        id: 'res3-terpene-guide',
        title: 'Terpene Education Template for Budtenders',
        description: 'Train your staff with this visual guide to the 10 most common terpenes, their effects, and how to recommend products based on chemistry',
        type: 'template',
        downloadUrl: '/academy/templates/terpene-education-template.pdf',
        fileType: 'pdf',
        requiresEmail: false,
      },
    ],
    requiresEmail: false,
  },

  // ========== EPISODE 4: COMPLIANCE AS COMPETITIVE MOAT ==========
  {
    id: 'ep4-compliance-moat',
    episodeNumber: 4,
    title: 'Compliance as Competitive Moat: Turn Regulations Into Advantages',
    description: 'Learn how state-by-state compliance requirements create barriers to entry, how automated compliance checking protects your brand, and why Deebo is your secret weapon.',
    track: 'deebo',
    youtubeId: 'PLACEHOLDER',
    duration: 660, // 11 minutes
    learningObjectives: [
      'Understand key compliance rules by state (TCPA, advertising restrictions)',
      'Learn how automated compliance checking prevents violations',
      'Discover how compliance creates competitive advantages',
      'See real examples of compliant vs. non-compliant marketing',
    ],
    resources: [
      {
        id: 'res4-compliance-checklist',
        title: 'Cannabis Marketing Compliance Checklist',
        description: 'State-by-state checklist covering SMS, email, social media, and advertising compliance requirements',
        type: 'checklist',
        downloadUrl: '/academy/checklists/compliance-checklist.pdf',
        fileType: 'pdf',
        requiresEmail: true, // Email gate starts after 3 free videos
      },
    ],
    requiresEmail: true, // Email required after 3 free episodes
  },

  // ========== EPISODE 5: SMOKEY - PRODUCT RECOMMENDATIONS ==========
  {
    id: 'ep5-smokey',
    episodeNumber: 5,
    title: 'Meet Smokey: AI-Powered Product Recommendations That Actually Work',
    description: 'See how Smokey uses terpene profiles, customer preferences, and purchase history to recommend products that customers actually love.',
    track: 'smokey',
    youtubeId: 'PLACEHOLDER',
    duration: 840, // 14 minutes
    learningObjectives: [
      'Understand how Smokey analyzes terpene profiles for recommendations',
      'Learn the difference between collaborative filtering and content-based filtering',
      'Discover how preference learning improves over time',
      'See live demos of Smokey in action',
    ],
    resources: [
      {
        id: 'res5-persona-worksheet',
        title: 'Customer Persona Worksheet',
        description: 'Map your customer segments by preferences, purchase behavior, and product affinities to optimize product recommendations',
        type: 'template',
        downloadUrl: '/academy/templates/customer-persona-worksheet.xlsx',
        fileType: 'xlsx',
        requiresEmail: true,
      },
    ],
    requiresEmail: true,
  },

  // ========== EPISODE 6: CRAIG - MARKETING AUTOMATION ==========
  {
    id: 'ep6-craig',
    episodeNumber: 6,
    title: 'Meet Craig: Multi-Channel Campaign Automation for Cannabis',
    description: 'Watch Craig orchestrate SMS, email, and social campaigns with perfect timing, personalization, and compliance.',
    track: 'craig',
    youtubeId: 'PLACEHOLDER',
    duration: 900, // 15 minutes
    learningObjectives: [
      'Learn the anatomy of a high-converting cannabis campaign',
      'Understand SMS vs. email timing and frequency best practices',
      'Discover how Craig personalizes messaging at scale',
      'See real campaign examples with conversion metrics',
    ],
    resources: [
      {
        id: 'res6-campaign-template',
        title: 'Email Campaign Template Library',
        description: 'Ready-to-use email templates for product launches, promotions, events, and loyalty campaigns',
        type: 'template',
        downloadUrl: '/academy/templates/email-campaign-template.xlsx',
        fileType: 'xlsx',
        requiresEmail: true,
      },
      {
        id: 'res7-social-calendar',
        title: 'Social Media Content Calendar',
        description: '90-day content calendar with post ideas, hashtags, and timing recommendations for Instagram, Facebook, and Twitter',
        type: 'template',
        downloadUrl: '/academy/templates/social-media-calendar.xlsx',
        fileType: 'xlsx',
        requiresEmail: true,
      },
    ],
    requiresEmail: true,
  },

  // ========== EPISODE 7: EZAL - COMPETITIVE INTELLIGENCE ==========
  {
    id: 'ep7-ezal',
    episodeNumber: 7,
    title: 'Meet Ezal: Competitive Intelligence That Never Sleeps',
    description: 'Discover how Ezal monitors competitor pricing, menu changes, and market trends 24/7 so you always stay ahead.',
    track: 'ezal',
    youtubeId: 'PLACEHOLDER',
    duration: 780, // 13 minutes
    learningObjectives: [
      'Understand what data points Ezal tracks for each competitor',
      'Learn how to set up price alerts and competitive triggers',
      'Discover how to analyze market share and positioning',
      'See real examples of competitive insights driving decisions',
    ],
    resources: [
      {
        id: 'res8-competitive-analysis',
        title: 'Competitive Analysis Worksheet',
        description: 'Framework for analyzing competitor positioning, pricing, product mix, and marketing strategies',
        type: 'template',
        downloadUrl: '/academy/templates/competitive-analysis-worksheet.xlsx',
        fileType: 'xlsx',
        requiresEmail: true,
      },
      {
        id: 'res9-intelligence-playbook',
        title: 'Competitive Intelligence Playbook',
        description: 'Complete guide to gathering, analyzing, and acting on competitive intelligence in cannabis markets',
        type: 'guide',
        downloadUrl: '/academy/guides/competitive-intelligence-playbook.pdf',
        fileType: 'pdf',
        requiresEmail: true,
      },
    ],
    requiresEmail: true,
  },

  // ========== EPISODE 8: POPS - ANALYTICS & INSIGHTS ==========
  {
    id: 'ep8-pops',
    episodeNumber: 8,
    title: 'Meet Pops: Turn Data Into Decisions That Drive Revenue',
    description: 'See how Pops analyzes customer behavior, sales patterns, and inventory trends to give you actionable insights.',
    track: 'pops',
    youtubeId: 'PLACEHOLDER',
    duration: 720, // 12 minutes
    learningObjectives: [
      'Learn which metrics actually matter for cannabis retail',
      'Understand cohort analysis and customer lifetime value',
      'Discover how to identify slow-moving inventory before it expires',
      'See how Pops generates automated insights and recommendations',
    ],
    resources: [
      {
        id: 'res10-metrics-dashboard',
        title: 'Cannabis Retail Metrics Dashboard Template',
        description: 'Track the 15 most important KPIs for dispensaries and brands with this Excel dashboard template',
        type: 'template',
        downloadUrl: '/academy/templates/metrics-dashboard.xlsx',
        fileType: 'xlsx',
        requiresEmail: true,
      },
    ],
    requiresEmail: true,
  },

  // ========== EPISODE 9: MONEY MIKE - REVENUE OPTIMIZATION ==========
  {
    id: 'ep9-money-mike',
    episodeNumber: 9,
    title: 'Meet Money Mike: Dynamic Pricing That Maximizes Margins',
    description: 'Learn how Money Mike uses AI to optimize pricing, promotions, and product mix for maximum profitability.',
    track: 'money-mike',
    youtubeId: 'PLACEHOLDER',
    duration: 840, // 14 minutes
    learningObjectives: [
      'Understand dynamic pricing strategies for cannabis',
      'Learn how to balance margin optimization with customer retention',
      'Discover how to price clearance and expiring inventory',
      'See real examples of pricing experiments and results',
    ],
    resources: [
      {
        id: 'res11-budget-calculator',
        title: 'Marketing Budget Calculator',
        description: 'Calculate ROI on campaigns, set budgets by channel, and forecast revenue impact',
        type: 'template',
        downloadUrl: '/academy/templates/budget-calculator.xlsx',
        fileType: 'xlsx',
        requiresEmail: true,
      },
    ],
    requiresEmail: true,
  },

  // ========== EPISODE 10: MRS. PARKER - CUSTOMER RETENTION ==========
  {
    id: 'ep10-mrs-parker',
    episodeNumber: 10,
    title: 'Meet Mrs. Parker: Build Loyalty That Lasts',
    description: 'Discover how Mrs. Parker personalizes customer experiences, drives repeat purchases, and turns buyers into brand advocates.',
    track: 'mrs-parker',
    youtubeId: 'PLACEHOLDER',
    duration: 660, // 11 minutes
    learningObjectives: [
      'Learn the difference between loyalty programs and retention strategies',
      'Understand how Mrs. Parker personalizes post-purchase experiences',
      'Discover the anatomy of a successful win-back campaign',
      'See real retention metrics and benchmarks',
    ],
    resources: [
      {
        id: 'res12-retention-playbook',
        title: 'Customer Retention Playbook',
        description: 'Comprehensive guide to building loyalty programs, win-back campaigns, and referral systems',
        type: 'guide',
        downloadUrl: '/academy/guides/retention-playbook.pdf',
        fileType: 'pdf',
        requiresEmail: true,
      },
    ],
    requiresEmail: true,
  },

  // ========== EPISODE 11: DEEBO - ADVANCED COMPLIANCE ==========
  {
    id: 'ep11-deebo-advanced',
    episodeNumber: 11,
    title: 'Deebo Deep Dive: Advanced Compliance Automation',
    description: 'Go deeper into how Deebo handles age verification, advertising restrictions, TCPA compliance, and state-specific regulations.',
    track: 'deebo',
    youtubeId: 'PLACEHOLDER',
    duration: 900, // 15 minutes
    learningObjectives: [
      'Understand TCPA compliance for SMS marketing',
      'Learn state-by-state advertising restrictions',
      'Discover how automated compliance checking works under the hood',
      'See how Deebo prevents violations before they happen',
    ],
    resources: [
      {
        id: 'res13-tcpa-guide',
        title: 'TCPA Compliance Guide for Cannabis SMS',
        description: 'Everything you need to know about consent, opt-out requirements, and penalties',
        type: 'guide',
        downloadUrl: '/academy/guides/tcpa-compliance-guide.pdf',
        fileType: 'pdf',
        requiresEmail: true,
      },
    ],
    requiresEmail: true,
  },

  // ========== EPISODE 12: THE FULL STACK ==========
  {
    id: 'ep12-full-stack',
    episodeNumber: 12,
    title: 'The Full Stack: How All 7 Agents Work Together',
    description: 'See the complete BakedBot ecosystem in action as all 7 agents collaborate to power an entire cannabis business.',
    track: 'general',
    youtubeId: 'PLACEHOLDER',
    duration: 1200, // 20 minutes
    learningObjectives: [
      'Understand how agents communicate and hand off tasks',
      'Learn the data flow between agents and systems',
      'Discover the orchestration layer that coordinates everything',
      'See a real-world case study of BakedBot in production',
    ],
    resources: [
      {
        id: 'res14-implementation-roadmap',
        title: 'BakedBot Implementation Roadmap',
        description: '90-day plan for rolling out BakedBot across your organization',
        type: 'template',
        downloadUrl: '/academy/templates/implementation-roadmap.xlsx',
        fileType: 'xlsx',
        requiresEmail: true,
      },
      {
        id: 'res15-roi-calculator',
        title: 'AI ROI Calculator',
        description: 'Calculate the expected ROI of implementing BakedBot based on your current metrics',
        type: 'template',
        downloadUrl: '/academy/templates/roi-calculator.xlsx',
        fileType: 'xlsx',
        requiresEmail: true,
      },
    ],
    requiresEmail: true,
  },
];

/**
 * Helper function to get episodes by track
 */
export function getEpisodesByTrack(track: AgentTrack | 'general'): AcademyEpisode[] {
  return ACADEMY_EPISODES.filter((episode) => episode.track === track);
}

/**
 * Helper function to get episode by ID
 */
export function getEpisodeById(id: string): AcademyEpisode | undefined {
  return ACADEMY_EPISODES.find((episode) => episode.id === id);
}

/**
 * Helper function to get free episodes (no email required)
 */
export function getFreeEpisodes(): AcademyEpisode[] {
  return ACADEMY_EPISODES.filter((episode) => !episode.requiresEmail);
}

/**
 * Helper function to get all resources
 */
export function getAllResources(): AcademyResource[] {
  return ACADEMY_EPISODES.flatMap((episode) => episode.resources);
}

/**
 * Helper function to get free resources
 */
export function getFreeResources(): AcademyResource[] {
  return getAllResources().filter((resource) => !resource.requiresEmail);
}

/**
 * Program metadata
 */
export const ACADEMY_PROGRAM = {
  id: 'cannabis-marketing-ai-academy-s1',
  name: 'Cannabis Marketing AI Academy',
  subtitle: 'Master AI-Powered Cannabis Marketing',
  description: 'Learn how to leverage AI agents for competitive advantage in cannabis retail. 12 episodes covering everything from SEO to compliance, featuring the 7 BakedBot agents.',
  totalEpisodes: 12,
  totalDuration: ACADEMY_EPISODES.reduce((sum, ep) => sum + ep.duration, 0),
  freeEpisodes: 3,
  launchDate: '2026-03-01',
  status: 'active',
} as const;
