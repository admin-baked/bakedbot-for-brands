/**
 * Role-based Agent Chat Configurations
 * 
 * Tailored prompts and suggestions for each user role.
 */

export type UserRoleForChat = 'owner' | 'admin' | 'brand' | 'dispensary' | 'editor' | 'customer' | 'super_admin';

export interface RoleChatConfig {
    role: UserRoleForChat;
    title: string;
    subtitle: string;
    welcomeMessage: string;
    placeholder: string;
    promptSuggestions: string[];
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

/**
 * Editor role configuration
 * Focus: Content moderation, SEO, copy editing
 */
export const EDITOR_CHAT_CONFIG: RoleChatConfig = {
    role: 'editor',
    title: 'Content Assistant',
    subtitle: 'AI-powered content editing and SEO optimization',
    welcomeMessage: "Hey! I'm here to help you create and optimize content. What would you like to work on?",
    placeholder: 'Ask about SEO, content optimization, or get writing help...',
    promptSuggestions: [
        'Review this brand page for SEO issues',
        'Help me write a product description',
        'Check content for compliance issues',
        'Optimize meta tags for this page',
        'Generate alt text for product images',
        'Help me improve this dispensary copy'
    ],
    agentPersona: 'deebo', // Deebo handles SEO/content
    themeColor: 'purple',
    iconName: 'edit',
    restrictedTools: ['pricing', 'revenue', 'financial'], // Editors don't need financial tools
    enabledFeatures: {
        modelSelector: false,
        personaSelector: false,
        triggers: false,
        permissions: false
    }
};

/**
 * Customer role configuration  
 * Focus: Product discovery, deals, reorders
 */
export const CUSTOMER_CHAT_CONFIG: RoleChatConfig = {
    role: 'customer',
    title: 'Cannabis Concierge',
    subtitle: 'Your personal budtender for finding the perfect products',
    welcomeMessage: "Hi there! 🌿 I'm Smokey, your personal cannabis concierge. Let me help you find exactly what you're looking for.",
    placeholder: 'Ask for product recommendations, deals, or help with your order...',
    promptSuggestions: [
        'What should I try for sleep?',
        'Find me the best deals today',
        'Something similar to Blue Dream',
        'Build a cart under $50',
        'Edibles for relaxation',
        'Top-rated products near me'
    ],
    agentPersona: 'smokey', // Smokey is the budtender
    themeColor: 'emerald',
    iconName: 'shopping-cart',
    restrictedTools: ['admin', 'settings', 'analytics', 'revenue'], // Customers don't need internal tools
    enabledFeatures: {
        modelSelector: false,
        personaSelector: false,
        triggers: false,
        permissions: false
    }
};

/**
 * Brand role configuration
 * Focus: Growth, analytics, campaigns
 */
export const BRAND_CHAT_CONFIG: RoleChatConfig = {
    role: 'brand',
    title: 'Brand Growth Assistant',
    subtitle: 'AI-powered insights for your brand',
    welcomeMessage: "Welcome! I'm here to help grow your brand presence. What would you like to explore?",
    placeholder: 'Ask about analytics, campaigns, or competitive insights...',
    promptSuggestions: [
        'How is my brand performing this week?',
        'Show me my top-performing products',
        'What are my competitors pricing?',
        'Help me create a marketing campaign',
        'Analyze my customer segments',
        'Optimize my brand page SEO'
    ],
    agentPersona: 'craig', // Craig handles business insights
    themeColor: 'blue',
    iconName: 'briefcase',
    enabledFeatures: {
        modelSelector: true,
        personaSelector: true,
        triggers: true,
        permissions: true
    }
};

/**
 * Dispensary role configuration
 * Focus: Operations, inventory, local marketing
 */
export const DISPENSARY_CHAT_CONFIG: RoleChatConfig = {
    role: 'dispensary',
    title: 'Dispensary Operations',
    subtitle: 'AI assistant for your dispensary',
    welcomeMessage: "Hey! Ready to help with your dispensary operations. What do you need?",
    placeholder: 'Ask about inventory, pricing, local marketing...',
    promptSuggestions: [
        'Check my inventory levels',
        'Compare my prices to competitors',
        'Create a promotion for this weekend',
        'Help me set up a deal',
        'Analyze my customer traffic',
        'Optimize my Google Business listing'
    ],
    agentPersona: 'money_mike', // Money Mike handles pricing/operations
    themeColor: 'orange',
    iconName: 'store',
    enabledFeatures: {
        modelSelector: true,
        personaSelector: true,
        triggers: true,
        permissions: true
    }
};

/**
 * Owner/Admin role configuration
 * Focus: Full platform oversight
 */
export const OWNER_CHAT_CONFIG: RoleChatConfig = {
    role: 'owner',
    title: 'Command Center',
    subtitle: 'Full platform control and insights',
    welcomeMessage: "Welcome back! Full agent capabilities at your service. What would you like to accomplish?",
    placeholder: 'Ask anything - full platform access available...',
    promptSuggestions: [
        'Give me a platform health report',
        'Show all active agents and their status',
        'Run a competitive analysis scan',
        'Check compliance across all listings',
        'Generate a revenue forecast',
        'Audit user permissions'
    ],
    agentPersona: 'smokey', // Default to Smokey, but can switch
    themeColor: 'primary',
    iconName: 'shield',
    enabledFeatures: {
        modelSelector: true,
        personaSelector: true,
        triggers: true,
        permissions: true
    }
};

/**
 * Super Admin role configuration
 */
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
        'Show platform health',
        'List pending verifications',
        'Generate system report'
    ],
    enabledFeatures: {
        modelSelector: true,
        personaSelector: true,
        triggers: true,
        permissions: true
    }
};

/**
 * Get chat configuration for a role
 */
export function getChatConfigForRole(role: UserRoleForChat): RoleChatConfig {
    switch (role) {
        case 'editor':
            return EDITOR_CHAT_CONFIG;
        case 'customer':
            return CUSTOMER_CHAT_CONFIG;
        case 'brand':
            return BRAND_CHAT_CONFIG;
        case 'dispensary':
            return DISPENSARY_CHAT_CONFIG;
        case 'super_admin':
            return SUPER_ADMIN_CHAT_CONFIG;
        case 'owner':
        case 'admin':
        default:
            return OWNER_CHAT_CONFIG;
    }
}

/**
 * Get all chat configurations
 */
export function getAllChatConfigs(): Record<UserRoleForChat, RoleChatConfig> {
    return {
        owner: OWNER_CHAT_CONFIG,
        admin: { ...OWNER_CHAT_CONFIG, role: 'admin' },
        brand: BRAND_CHAT_CONFIG,
        dispensary: DISPENSARY_CHAT_CONFIG,
        editor: EDITOR_CHAT_CONFIG,
        customer: CUSTOMER_CHAT_CONFIG
    };
}
