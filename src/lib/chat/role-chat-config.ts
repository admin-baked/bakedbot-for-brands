/**
 * Role-based Agent Chat Configurations
 *
 * Each role has a large `promptSuggestions` pool (15-20 ideas).
 * Use `useRotatingPrompts(config.promptSuggestions, 4)` to pick
 * 4 fresh chips on every login/inbox refresh.
 */

export type UserRoleForChat = 'owner' | 'admin' | 'brand' | 'dispensary' | 'editor' | 'customer' | 'super_admin' | 'concierge';

export interface RoleChatConfig {
    role: UserRoleForChat;
    title: string;
    subtitle: string;
    welcomeMessage: string;
    placeholder: string;
    promptSuggestions: string[]; // Full pool — use useRotatingPrompts to pick a subset
    agentPersona: 'smokey' | 'craig' | 'deebo' | 'mrs_parker' | 'pops' | 'money_mike' | 'puff';
    themeColor: string;
    iconName: 'sparkles' | 'briefcase' | 'store' | 'edit' | 'shopping-cart' | 'shield';
    restrictedTools?: string[];
    enabledFeatures: {
        modelSelector: boolean;
        personaSelector: boolean;
        triggers: boolean;
        permissions: boolean;
    };
}

// ============================================================================
// EDITOR
// ============================================================================
export const EDITOR_CHAT_CONFIG: RoleChatConfig = {
    role: 'editor',
    title: 'Content Assistant',
    subtitle: 'AI-powered content editing and SEO optimization',
    welcomeMessage: "Hey! I'm here to help you create and optimize content. What would you like to work on?",
    placeholder: 'Ask about SEO, content optimization, or get writing help...',
    promptSuggestions: [
        // SEO
        'Review this brand page for SEO issues',
        'Optimize meta tags for this page',
        'Generate a keyword strategy for cannabis edibles',
        'Check my title tags and descriptions',
        'Find gaps in our content vs competitors',
        // Copywriting
        'Help me write a product description',
        'Rewrite this copy to sound more premium',
        'Generate 5 headline variations for this campaign',
        'Make this product page convert better',
        // Compliance
        'Check content for compliance issues',
        'Flag any health claims that could get us in trouble',
        'Review this Instagram caption for state regulations',
        // Images & Assets
        'Generate alt text for product images',
        'Help me improve this dispensary copy',
        'Write a compelling About Us section'
    ],
    agentPersona: 'deebo',
    themeColor: 'purple',
    iconName: 'edit',
    restrictedTools: ['pricing', 'revenue', 'financial'],
    enabledFeatures: {
        modelSelector: false,
        personaSelector: false,
        triggers: false,
        permissions: false
    }
};

// ============================================================================
// CUSTOMER
// ============================================================================
export const CUSTOMER_CHAT_CONFIG: RoleChatConfig = {
    role: 'customer',
    title: 'Cannabis Concierge',
    subtitle: 'Your personal budtender for finding the perfect products',
    welcomeMessage: "Hi there! I'm Smokey, your personal cannabis concierge. Let me help you find exactly what you're looking for.",
    placeholder: 'Ask for product recommendations, deals, or help with your order...',
    promptSuggestions: [
        // Effects
        'What should I try for sleep?',
        'Something energizing for a creative day',
        'Best option for anxiety relief',
        'Low-dose edibles for a beginner',
        'What helps with focus and productivity?',
        // Discovery
        'Something similar to Blue Dream',
        'Top-rated products near me',
        'What\'s new in this week\'s inventory?',
        'Show me your best flower under $40',
        // Deals & Cart
        'Find me the best deals today',
        'Build a cart under $50',
        'Edibles for relaxation',
        'Any daily specials or promos?',
        // Reorder
        'Reorder what I got last time',
        'What goes well with what I bought before?'
    ],
    agentPersona: 'smokey',
    themeColor: 'emerald',
    iconName: 'shopping-cart',
    restrictedTools: ['admin', 'settings', 'analytics', 'revenue'],
    enabledFeatures: {
        modelSelector: false,
        personaSelector: false,
        triggers: false,
        permissions: false
    }
};

// ============================================================================
// BRAND
// ============================================================================
export const BRAND_CHAT_CONFIG: RoleChatConfig = {
    role: 'brand',
    title: 'Brand Growth Assistant',
    subtitle: 'AI-powered insights for your brand',
    welcomeMessage: "Welcome! I'm Craig, your brand's marketing partner. I can research competitors, extract brand voice, draft campaigns, and scrape any website for inspiration — all powered by AI. What would you like to explore?",
    placeholder: 'Ask about campaigns, competitor research, or extract brand data from any URL...',
    promptSuggestions: [
        // Brand Discovery (Firecrawl + RTRVR)
        'Extract brand data from a competitor website',
        'Search for top cannabis brands in my market',
        'Read and analyze this competitor page: [paste URL]',
        'What is their brand voice compared to ours?',
        'Find brands with a similar aesthetic to ours',
        // Campaigns
        'Draft a campaign in 30 seconds',
        'Write 3 email subject lines for a flash sale',
        'Create a loyalty re-engagement SMS sequence',
        'Build a campaign targeting sleep customers',
        'Generate a post-purchase thank-you sequence',
        // Growth & Distribution
        'Find dispensaries to carry my products',
        'Spy on competitor pricing',
        'Which markets should I expand into next?',
        // Insights
        'See this week\'s wins & opportunities',
        'Get my SEO visibility report',
        'See where my brand appears online',
        'Show me which products are trending',
        'What campaigns drove the most revenue last month?'
    ],
    agentPersona: 'craig',
    themeColor: 'blue',
    iconName: 'briefcase',
    enabledFeatures: {
        modelSelector: true,
        personaSelector: true,
        triggers: true,
        permissions: true
    }
};

// ============================================================================
// DISPENSARY
// ============================================================================
export const DISPENSARY_CHAT_CONFIG: RoleChatConfig = {
    role: 'dispensary',
    title: 'Dispensary Operations',
    subtitle: 'AI assistant for your dispensary',
    welcomeMessage: "Hey! Ready to help with your dispensary operations. What do you need?",
    placeholder: 'Ask about pricing, competitors, or marketing...',
    promptSuggestions: [
        // Competitive
        'Spy on competitor pricing near me',
        'Who is running deals this weekend?',
        'Compare our flower prices vs the market',
        'Alert me when a competitor drops below our price',
        // Operations
        'Find slow movers I can bundle',
        'Show me today\'s opportunities',
        'Which products have the highest margin?',
        'What inventory is about to expire?',
        // Marketing
        'Draft a campaign in 30 seconds',
        'Create a weekend flash sale message',
        'Write a loyalty reward email for VIP customers',
        'Build a re-engagement SMS for dormant customers',
        // Compliance & Health
        'Scan my site for compliance risks',
        'Get my SEO visibility score',
        'Flag any out-of-compliance menu listings'
    ],
    agentPersona: 'money_mike',
    themeColor: 'orange',
    iconName: 'store',
    enabledFeatures: {
        modelSelector: true,
        personaSelector: true,
        triggers: true,
        permissions: true
    }
};

// ============================================================================
// OWNER / ADMIN
// ============================================================================
export const OWNER_CHAT_CONFIG: RoleChatConfig = {
    role: 'owner',
    title: 'Command Center',
    subtitle: 'Full platform control and insights',
    welcomeMessage: "Welcome back! Full agent capabilities at your service. What would you like to accomplish?",
    placeholder: 'Ask anything - full platform access available...',
    promptSuggestions: [
        // Platform Health
        'Give me a platform health report',
        'Show all active agents and their status',
        'Are any heartbeat tasks failing?',
        'Check our uptime and system alerts',
        // Revenue & Growth
        'Generate a revenue forecast',
        'Show MRR, ARR, and churn this month',
        'Which customers are at risk of churning?',
        'Top 5 highest-value accounts right now',
        // Operations
        'Run a competitive analysis scan',
        'Check compliance across all listings',
        'Audit user permissions',
        'Show pending approvals and invitations',
        // Intelligence
        'What opportunities are we missing this week?',
        'Summarize agent activity from the past 24 hours',
        'List new signups and their plan mix'
    ],
    agentPersona: 'smokey',
    themeColor: 'primary',
    iconName: 'shield',
    enabledFeatures: {
        modelSelector: true,
        personaSelector: true,
        triggers: true,
        permissions: true
    }
};

// ============================================================================
// SUPER ADMIN
// ============================================================================
export const SUPER_ADMIN_CHAT_CONFIG: RoleChatConfig = {
    role: 'super_admin',
    title: 'Super Admin HQ',
    subtitle: 'Platform-wide control and intelligence',
    welcomeMessage: 'Command center active. All systems nominal.',
    placeholder: 'Query system stats or manage tenants...',
    iconName: 'shield',
    themeColor: 'purple',
    agentPersona: 'puff',
    promptSuggestions: [
        // System
        'Show platform health',
        'Are any cron jobs failing?',
        'Check heartbeat recovery status',
        'Show Firebase build status',
        // Tenants & Users
        'List pending verifications',
        'Show all Super Users',
        'Who signed up in the last 7 days?',
        'List orgs without a completed onboarding',
        // Reports
        'Generate system report',
        'Show audit log for the past 24 hours',
        'List all active playbooks across tenants',
        // Intelligence
        'Run a platform-wide compliance check',
        'Which tenants have the most agent activity?',
        'Show Slack agent response times'
    ],
    enabledFeatures: {
        modelSelector: true,
        personaSelector: true,
        triggers: true,
        permissions: true
    }
};

// ============================================================================
// CONCIERGE (Agentic Shopping)
// ============================================================================
export const CONCIERGE_CHAT_CONFIG: RoleChatConfig = {
    role: 'concierge',
    title: 'BakedBot Concierge',
    subtitle: 'Autonomous shopping and fulfillment',
    welcomeMessage: "Hi! I'm your cannabis concierge. I can browse every menu in your area and prepare a multi-cart for you. How can I help?",
    placeholder: 'Ask me to find products, compare prices, or build a cart...',
    iconName: 'sparkles',
    themeColor: 'blue',
    agentPersona: 'smokey',
    promptSuggestions: [
        'Find the cheapest vape near me',
        'I need flower for sleep under $40',
        'Who has Blue Dream in stock?',
        'Build me a diverse $100 sampler',
        'Compare prices on OG Kush across dispensaries',
        'Find the best deal on edibles today',
        'What\'s the highest-rated concentrate near me?',
        'Build a cart for a beginner starting pack'
    ],
    enabledFeatures: {
        modelSelector: false,
        personaSelector: false,
        triggers: false,
        permissions: false
    }
};

// ============================================================================
// HELPERS
// ============================================================================

export function getChatConfigForRole(role: UserRoleForChat): RoleChatConfig {
    switch (role) {
        case 'editor':      return EDITOR_CHAT_CONFIG;
        case 'customer':    return CUSTOMER_CHAT_CONFIG;
        case 'brand':       return BRAND_CHAT_CONFIG;
        case 'dispensary':  return DISPENSARY_CHAT_CONFIG;
        case 'super_admin': return SUPER_ADMIN_CHAT_CONFIG;
        case 'concierge':   return CONCIERGE_CHAT_CONFIG;
        case 'owner':
        case 'admin':
        default:            return OWNER_CHAT_CONFIG;
    }
}

export function getAllChatConfigs(): Record<UserRoleForChat, RoleChatConfig> {
    return {
        owner:       OWNER_CHAT_CONFIG,
        admin:       { ...OWNER_CHAT_CONFIG, role: 'admin' },
        brand:       BRAND_CHAT_CONFIG,
        dispensary:  DISPENSARY_CHAT_CONFIG,
        editor:      EDITOR_CHAT_CONFIG,
        customer:    CUSTOMER_CHAT_CONFIG,
        super_admin: SUPER_ADMIN_CHAT_CONFIG,
        concierge:   CONCIERGE_CHAT_CONFIG
    };
}
