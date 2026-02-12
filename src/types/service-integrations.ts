/**
 * Service Integration Types
 *
 * Unified types for third-party service integrations (POS, Marketing, Google Workspace, etc.)
 * Supports OAuth, API keys, JWT, and other auth methods.
 */

import { z } from 'zod';

// ============================================================================
// INTEGRATION PROVIDERS
// ============================================================================

/**
 * All supported integration providers
 */
export type IntegrationProvider =
    // Google Workspace
    | 'gmail'
    | 'google_calendar'
    | 'google_sheets'
    | 'google_drive'
    // POS Systems
    | 'alleaves'
    | 'dutchie'
    | 'jane'
    | 'treez'
    | 'blaze'
    | 'flowhub'
    // Marketing
    | 'mailchimp'
    | 'klaviyo'
    // Loyalty
    | 'springbig'
    // Payments
    | 'stripe'
    | 'square'
    // Communication
    | 'twilio'
    | 'whatsapp'
    // Analytics
    | 'google_analytics'
    | 'segment';

/**
 * Authentication method for the integration
 */
export type IntegrationAuthMethod =
    | 'oauth'           // OAuth 2.0 flow (Google, etc.)
    | 'api_key'         // API key + optional secret
    | 'jwt'             // JWT token (Alleaves)
    | 'webhook'         // Webhook-based (WhatsApp)
    | 'credentials';    // Username/password

/**
 * Integration category for grouping
 */
export type IntegrationCategory =
    | 'pos'
    | 'marketing'
    | 'loyalty'
    | 'payment'
    | 'communication'
    | 'analytics'
    | 'workspace';

/**
 * Integration status
 */
export type IntegrationStatus =
    | 'connected'       // Active and working
    | 'disconnected'    // Not connected
    | 'error'           // Connected but has errors
    | 'expired';        // Credentials expired (OAuth)

// ============================================================================
// INTEGRATION REQUEST (Artifact Data)
// ============================================================================

/**
 * Integration request artifact data
 * Rendered as an inline connection card in chat
 */
export interface IntegrationRequest {
    /** Provider to connect */
    provider: IntegrationProvider;

    /** Why the agent needs this integration */
    reason: string;

    /** Optional scopes for OAuth (e.g., ['gmail.send', 'gmail.readonly']) */
    scopes?: string[];

    /** Auth method for this provider */
    authMethod: IntegrationAuthMethod;

    /** Category for UI grouping */
    category: IntegrationCategory;

    /** Thread ID to return to after auth */
    threadId?: string;

    /** Optional: specific action to enable (e.g., 'send_email', 'sync_inventory') */
    enablesAction?: string;

    /** Estimated setup time (e.g., '2 minutes') */
    setupTime?: string;
}

export const IntegrationRequestSchema = z.object({
    provider: z.string(),
    reason: z.string(),
    scopes: z.array(z.string()).optional(),
    authMethod: z.enum(['oauth', 'api_key', 'jwt', 'webhook', 'credentials']),
    category: z.enum(['pos', 'marketing', 'loyalty', 'payment', 'communication', 'analytics', 'workspace']),
    threadId: z.string().optional(),
    enablesAction: z.string().optional(),
    setupTime: z.string().optional(),
});

// ============================================================================
// INTEGRATION METADATA
// ============================================================================

/**
 * Static metadata about each integration provider
 */
export interface IntegrationMetadata {
    id: IntegrationProvider;
    name: string;
    description: string;
    icon: string;
    category: IntegrationCategory;
    authMethod: IntegrationAuthMethod;
    docsUrl?: string;
    setupTime: string;
    featured?: boolean;
}

/**
 * All integration metadata
 */
export const INTEGRATION_METADATA: Record<IntegrationProvider, IntegrationMetadata> = {
    // Google Workspace
    gmail: {
        id: 'gmail',
        name: 'Gmail',
        description: 'Send and read emails from your personal Gmail account',
        icon: '📧',
        category: 'workspace',
        authMethod: 'oauth',
        setupTime: '1 minute',
        featured: true,
    },
    google_calendar: {
        id: 'google_calendar',
        name: 'Google Calendar',
        description: 'Schedule events and manage your calendar',
        icon: '📅',
        category: 'workspace',
        authMethod: 'oauth',
        setupTime: '1 minute',
        featured: true,
    },
    google_sheets: {
        id: 'google_sheets',
        name: 'Google Sheets',
        description: 'Read and write data to spreadsheets',
        icon: '📊',
        category: 'workspace',
        authMethod: 'oauth',
        setupTime: '1 minute',
    },
    google_drive: {
        id: 'google_drive',
        name: 'Google Drive',
        description: 'Access and manage files in your Drive',
        icon: '📁',
        category: 'workspace',
        authMethod: 'oauth',
        setupTime: '1 minute',
    },

    // POS Systems
    alleaves: {
        id: 'alleaves',
        name: 'Alleaves',
        description: 'Sync inventory and orders from Alleaves POS',
        icon: '🌿',
        category: 'pos',
        authMethod: 'jwt',
        docsUrl: 'https://docs.alleaves.com',
        setupTime: '5 minutes',
        featured: true,
    },
    dutchie: {
        id: 'dutchie',
        name: 'Dutchie',
        description: 'Connect your Dutchie menu for product sync',
        icon: '🛒',
        category: 'pos',
        authMethod: 'api_key',
        docsUrl: 'https://docs.dutchie.com',
        setupTime: '3 minutes',
        featured: true,
    },
    jane: {
        id: 'jane',
        name: 'iHeartJane',
        description: 'Sync products and inventory from Jane',
        icon: '💚',
        category: 'pos',
        authMethod: 'api_key',
        docsUrl: 'https://docs.iheartjane.com',
        setupTime: '3 minutes',
        featured: true,
    },
    treez: {
        id: 'treez',
        name: 'Treez',
        description: 'Full inventory and order management with Treez',
        icon: '🌲',
        category: 'pos',
        authMethod: 'api_key',
        docsUrl: 'https://docs.treez.io',
        setupTime: '5 minutes',
    },
    blaze: {
        id: 'blaze',
        name: 'Blaze',
        description: 'Sync products and inventory from Blaze POS',
        icon: '🔥',
        category: 'pos',
        authMethod: 'api_key',
        setupTime: '3 minutes',
    },
    flowhub: {
        id: 'flowhub',
        name: 'Flowhub',
        description: 'Compliance-ready inventory sync with Flowhub',
        icon: '📦',
        category: 'pos',
        authMethod: 'api_key',
        setupTime: '5 minutes',
    },

    // Marketing
    mailchimp: {
        id: 'mailchimp',
        name: 'Mailchimp',
        description: 'Sync customer segments for email campaigns',
        icon: '🐵',
        category: 'marketing',
        authMethod: 'api_key',
        setupTime: '2 minutes',
    },
    klaviyo: {
        id: 'klaviyo',
        name: 'Klaviyo',
        description: 'Advanced email automation for cannabis brands',
        icon: '💌',
        category: 'marketing',
        authMethod: 'api_key',
        setupTime: '3 minutes',
    },

    // Loyalty
    springbig: {
        id: 'springbig',
        name: 'Springbig',
        description: 'Loyalty program integration for dispensaries',
        icon: '⭐',
        category: 'loyalty',
        authMethod: 'api_key',
        setupTime: '5 minutes',
    },

    // Payments
    stripe: {
        id: 'stripe',
        name: 'Stripe',
        description: 'Accept payments and manage subscriptions',
        icon: '💳',
        category: 'payment',
        authMethod: 'api_key',
        setupTime: '5 minutes',
    },
    square: {
        id: 'square',
        name: 'Square',
        description: 'Point of sale and payment processing',
        icon: '⬛',
        category: 'payment',
        authMethod: 'oauth',
        setupTime: '3 minutes',
    },

    // Communication
    twilio: {
        id: 'twilio',
        name: 'Twilio',
        description: 'SMS and voice communication platform',
        icon: '📱',
        category: 'communication',
        authMethod: 'api_key',
        setupTime: '3 minutes',
    },
    whatsapp: {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Send messages via WhatsApp Business API',
        icon: '💬',
        category: 'communication',
        authMethod: 'webhook',
        setupTime: '10 minutes',
    },

    // Analytics
    google_analytics: {
        id: 'google_analytics',
        name: 'Google Analytics',
        description: 'Track website traffic and user behavior',
        icon: '📈',
        category: 'analytics',
        authMethod: 'oauth',
        setupTime: '2 minutes',
    },
    segment: {
        id: 'segment',
        name: 'Segment',
        description: 'Customer data platform and analytics',
        icon: '📊',
        category: 'analytics',
        authMethod: 'api_key',
        setupTime: '5 minutes',
    },
};

// ============================================================================
// INTEGRATION CONFIG STORAGE
// ============================================================================

/**
 * Stored integration configuration in Firestore
 * Path: users/{userId}/integrations/{provider}
 */
export interface StoredIntegrationConfig {
    provider: IntegrationProvider;
    status: IntegrationStatus;
    connectedAt: string;
    lastUsedAt?: string;

    // OAuth-specific
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    scopes?: string[];

    // API Key-specific
    apiKey?: string;
    apiSecret?: string;

    // Provider-specific config
    config?: Record<string, any>;

    // Error tracking
    lastError?: string;
    lastErrorAt?: string;
}

export const StoredIntegrationConfigSchema = z.object({
    provider: z.string(),
    status: z.enum(['connected', 'disconnected', 'error', 'expired']),
    connectedAt: z.string(),
    lastUsedAt: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    expiresAt: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    config: z.record(z.any()).optional(),
    lastError: z.string().optional(),
    lastErrorAt: z.string().optional(),
});

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Integration status check result
 */
export interface IntegrationStatusCheck {
    provider: IntegrationProvider;
    connected: boolean;
    status: IntegrationStatus;
    connectedAt?: string;
    lastError?: string;
}

/**
 * Bulk integration status
 */
export type IntegrationStatusMap = Partial<Record<IntegrationProvider, IntegrationStatusCheck>>;
