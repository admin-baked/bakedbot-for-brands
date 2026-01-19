/**
 * Quick Start Cards Configuration
 * Role-specific high-leverage actions for first-time users
 */

import { QuickStartCard } from '@/types/agent-workspace';

export const QUICK_START_CARDS: QuickStartCard[] = [
    // Dispensary Cards
    {
        id: 'dispensary_launch_menu',
        title: 'Launch Headless Menu',
        description: 'Get your menu live in 10 minutes with embed code',
        icon: 'menu',
        estimatedTime: '10 min',
        prompt: 'Launch my headless menu. My dispensary name is [NAME] and we\'re located in [CITY, STATE].',
        roles: ['dispensary']
    },
    {
        id: 'dispensary_install_smokey',
        title: 'Install Smokey Budtender',
        description: 'Add AI product recommendations to your site',
        icon: 'bot',
        estimatedTime: '5 min',
        prompt: 'Install Smokey budtender widget on my website.',
        roles: ['dispensary']
    },
    {
        id: 'dispensary_connect_pos',
        title: 'Connect Menu/POS',
        description: 'Sync your menu data automatically',
        icon: 'link',
        estimatedTime: '15 min',
        prompt: 'Connect my POS or menu data source.',
        roles: ['dispensary']
    },
    {
        id: 'dispensary_daily_intel',
        title: 'Enable Daily Intel Snapshot',
        description: 'Track competitors, pricing, and market trends',
        icon: 'chart',
        estimatedTime: '2 min',
        playbookId: 'pb_intel_daily_snapshot_v1',
        prompt: 'Set up daily intelligence snapshot and email it to me every morning.',
        roles: ['dispensary']
    },
    {
        id: 'dispensary_compliance_check',
        title: 'Run Compliance Check',
        description: 'Ensure your content meets state regulations',
        icon: 'shield',
        estimatedTime: '5 min',
        prompt: 'Run a compliance check on my menu and marketing materials.',
        roles: ['dispensary']
    },

    // Brand Cards
    {
        id: 'brand_launch_page',
        title: 'Launch Brand Page + Where-to-Buy',
        description: 'Create SEO-optimized brand presence',
        icon: 'globe',
        estimatedTime: '15 min',
        prompt: 'Launch my brand page with where-to-buy locator. Here\'s my website: [URL]',
        roles: ['brand']
    },
    {
        id: 'brand_footprint_audit',
        title: 'Run Footprint Audit',
        description: 'See where you\'re winning or missing placements',
        icon: 'map',
        estimatedTime: '10 min',
        playbookId: 'pb_intel_footprint_audit_v1',
        prompt: 'Run a footprint audit for my brand to show where we\'re placed and where we\'re missing.',
        roles: ['brand']
    },
    {
        id: 'brand_target_retailers',
        title: 'Find 50 Target Retailers',
        description: 'Build a list of high-potential retail partners',
        icon: 'target',
        estimatedTime: '5 min',
        prompt: 'Find 50 target retailers that carry my competitors but not my brand.',
        roles: ['brand']
    },
    {
        id: 'brand_daily_snapshot',
        title: 'Enable Daily Brand Snapshot',
        description: 'Track placements, pricing changes, and new stores',
        icon: 'notification',
        estimatedTime: '2 min',
        playbookId: 'pb_intel_daily_snapshot_v1',
        prompt: 'Set up daily brand intelligence snapshot tracking new stores, lost stores, pricing changes, and promos.',
        roles: ['brand']
    },
    {
        id: 'brand_connect_gmail',
        title: 'Connect Gmail for Outreach',
        description: 'Enable automated email campaigns to retailers',
        icon: 'mail',
        estimatedTime: '3 min',
        prompt: 'Connect my Gmail account so I can send retailer outreach emails.',
        roles: ['brand']
    },
    {
        id: 'owner_analytics',
        title: 'Platform Analytics',
        description: 'View aggregate data across all brands and dispensaries',
        icon: 'chart',
        estimatedTime: '2 min',
        prompt: 'Show me platform-wide analytics for the last 30 days.',
        roles: ['owner']
    },
    {
        id: 'owner_revenue',
        title: 'Generate Revenue Report',
        description: 'Calculate margins and payouts for this period',
        icon: 'dollar',
        estimatedTime: '5 min',
        prompt: 'Generate a revenue report for all active accounts.',
        roles: ['owner']
    },
    {
        id: 'owner_team',
        title: 'Manage Team Access',
        description: 'Configure permissions and add new admins',
        icon: 'users',
        estimatedTime: '3 min',
        prompt: 'Open user management console.',
        roles: ['owner']
    }
];

/**
 * Role-based prompt chips for chat interface
 */
export const PROMPT_CHIPS = {
    dispensary: [
        "Launch my headless menu",
        "Install Smokey on my site",
        "Enable daily competitive intel",
        "Generate 25 SEO pages for Illinois",
        "Draft a compliant text campaign",
        "Run a pricing snapshot vs local competitors",
        "Generate a loyalty win-back email template"
    ],
    dispensary_admin: [
        "Launch my headless menu",
        "Install Smokey on my site",
        "Enable daily competitive intel",
        "Manage team access",
        "Configure billing settings",
        "Run a pricing snapshot vs local competitors"
    ],
    dispensary_staff: [
        "Check inventory levels",
        "View today's orders",
        "Run customer lookup",
        "Check product availability"
    ],
    brand: [
        "Launch my brand page + where-to-buy",
        "Run a footprint audit",
        "Find retailers that carry competitors, not us",
        "Enable daily brand snapshot",
        "Draft compliant outreach emails",
        "Analyze pricing trends across all retailers",
        "Generate a social media image for our new drop"
    ],
    brand_admin: [
        "Launch my brand page + where-to-buy",
        "Run a footprint audit",
        "Manage team access",
        "Configure billing settings",
        "Enable daily brand snapshot",
        "Generate revenue report"
    ],
    brand_member: [
        "Run a footprint audit",
        "Find retailers that carry competitors, not us",
        "Draft compliant outreach emails",
        "Analyze pricing trends across all retailers",
        "Enable daily brand snapshot"
    ],
    owner: [
        "Show me platform analytics",
        "Generate revenue report",
        "Review pending approvals",
        "Configure compliance settings",
        "Manage team access",
        "Analyze tenant growth trends",
        "Draft a platform-wide announcement"
    ],
    customer: [
        "Find products near me",
        "Recommend products for sleep",
        "Show me deals nearby",
        "Find high-CBD strains",
        "Get product recommendations",
        "Where can I find [BRAND NAME]?",
        "What are the best-rated dispensaries in [CITY]?"
    ],
    super_admin: [
        "Competitive snapshot: AIQ vs Terpli",
        "Analyze Dutchie and Springbig integration opportunities",
        "Generate platform-wide health report",
        "Review cross-tenant revenue attribution",
        "Draft BizDev outreach for National Rollout",
        "Show me codebase for [FILE PATH]",
        "Research competitor pricing models for 'Claim Pro'",
        "Compare Springbig loyalty features vs Mrs. Parker",
        "Analyze Dutchie's market share in Illinois",
        "Generate a report on Terpli's recommendation accuracy",
        "Explain the pricing model"
    ],
    super_user: [
        "Check system health",
        "Monitor active agents",
        "Review error logs"
    ],
    budtender: [
        "Find products for sleep",
        "What are the specials today?",
        "Recommend a hybrid for creativity"
    ]
};

/**
 * Get a randomized subset of prompts for a specific role
 */
export function getRandomPromptsForRole(role: string, count: number = 3): string[] {
    const roleKey = role as keyof typeof PROMPT_CHIPS;
    const allPrompts = PROMPT_CHIPS[roleKey] || [];
    if (allPrompts.length === 0) return [];
    
    // Simple shuffle
    return [...allPrompts]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
}

/**
 * First-login welcome messages by role
 */
export const WELCOME_MESSAGES: Record<string, string> = {
    dispensary: "Welcome! I can get you live today. Choose one: launch your headless menu, install Smokey, connect your menu/POS, or turn on daily intel. Paste your menu link or tell me your dispensary name + city.",

    dispensary_admin: "Welcome! As an admin, you have full access to your dispensary operations including billing, team management, and analytics. What would you like to set up first?",

    dispensary_staff: "Welcome! I'm here to help you with day-to-day operations — checking orders, inventory, and serving customers better.",

    brand: "Welcome! I can set up your brand presence and show where you're winning or missing. Paste your website or a listing link (Leafly/Weedmaps) to match your products.",

    brand_admin: "Welcome! As a brand admin, you have full access including billing, team management, and brand settings. Let's set up your brand presence.",

    brand_member: "Welcome! I'm here to help you grow your brand. Run footprint audits, analyze pricing, and draft outreach campaigns.",

    owner: "Welcome to Baked HQ. I can help you manage the platform, review analytics, configure compliance, or generate reports. What would you like to focus on?",

    customer: "Welcome! I'm Smokey, your AI budtender. I can help you find products, get recommendations, discover deals nearby, and learn about strains. What are you looking for today?",

    super_admin: "Welcome to Super Admin mode. You have full platform access including system configuration, user management, compliance settings, and analytics across all tenants.",
    
    super_user: "Welcome Super User. Access restricted to monitoring and basic administration.",

    budtender: "Welcome! I'm here to help you serve customers better, improve product knowledge, and find the right recommendations."
};
