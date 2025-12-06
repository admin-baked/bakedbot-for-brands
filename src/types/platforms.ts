/**
 * Platform Integration Configurations
 * Support for Shopify, WordPress, WooCommerce, and other e-commerce platforms
 */

export type PlatformType = 'shopify' | 'wordpress' | 'woocommerce' | 'squarespace' | 'webflow' | 'custom';
export type IntegrationStatus = 'not_installed' | 'pending' | 'active' | 'error' | 'disabled';

export interface ShopifyIntegration {
    id: string;
    platform: 'shopify';
    status: IntegrationStatus;

    // Shopify-specific
    shopDomain: string; // e.g., "my-store.myshopify.com"
    accessToken?: string; // Encrypted
    shopId?: string;

    // Features enabled
    features: {
        embedChatbot: boolean;
        embedLocator: boolean;
        syncProducts: boolean;
        syncOrders: boolean;
        syncCustomers: boolean;
    };

    // App Block settings
    appBlockId?: string;
    themeId?: string;

    // Webhooks
    webhooks: {
        ordersCreate: boolean;
        ordersUpdated: boolean;
        productsCreate: boolean;
        customersCreate: boolean;
    };

    installedAt?: Date;
    lastSyncAt?: Date;
    orgId: string;
}

export interface WordPressIntegration {
    id: string;
    platform: 'wordpress';
    status: IntegrationStatus;

    // WP-specific
    siteUrl: string;
    apiKey: string; // For REST API auth
    pluginVersion?: string;

    // Features
    features: {
        embedChatbot: boolean;
        embedLocator: boolean;
        gutenbergBlocks: boolean;
        shortcodes: boolean;
        widgetAreas: boolean;
    };

    // Shortcodes available
    shortcodes: {
        chatbot: string; // e.g., [bakedbot_chat]
        locator: string; // e.g., [bakedbot_locator]
        menu: string; // e.g., [bakedbot_menu brand="xyz"]
    };

    installedAt?: Date;
    orgId: string;
}

export interface EmbedConfiguration {
    id: string;
    name: string;
    type: 'chatbot' | 'locator' | 'menu' | 'product_card';

    // Appearance
    primaryColor: string;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    theme?: 'light' | 'dark' | 'auto';

    // Content
    brandId: string;
    welcomeMessage?: string;

    // Behavior
    autoOpen?: boolean;
    openDelay?: number; // ms

    // Tracking
    utmParams?: Record<string, string>;

    // Generated code
    embedCode: string;

    createdAt: Date;
    updatedAt: Date;
    orgId: string;
}

export interface PlatformInstallGuide {
    platform: PlatformType;
    title: string;
    description: string;
    steps: {
        title: string;
        description: string;
        code?: string;
        imageUrl?: string;
    }[];
    docsUrl?: string;
    videoUrl?: string;
}

// Shopify App Store listing info
export const SHOPIFY_APP_INFO = {
    name: 'BakedBot AI Budtender',
    tagline: 'AI-powered product recommendations for cannabis retailers',
    appStoreUrl: 'https://apps.shopify.com/bakedbot',
    scopes: [
        'read_products',
        'read_orders',
        'read_customers',
        'write_script_tags',
        'read_themes',
        'write_themes'
    ],
    features: [
        'AI Chatbot for product recommendations',
        'Dispensary locator widget',
        'Order analytics integration',
        'Customer insights sync'
    ]
};

// WordPress Plugin info
export const WORDPRESS_PLUGIN_INFO = {
    name: 'BakedBot for WordPress',
    slug: 'bakedbot-ai-budtender',
    downloadUrl: 'https://bakedbot.ai/downloads/bakedbot-wp-plugin.zip',
    wpOrgUrl: 'https://wordpress.org/plugins/bakedbot-ai-budtender',
    features: [
        'Gutenberg blocks for easy embedding',
        'Shortcodes for legacy themes',
        'Widget areas support',
        'WooCommerce integration'
    ]
};
