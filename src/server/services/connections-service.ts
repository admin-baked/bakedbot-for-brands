/**
 * Connections Service - Global Integration Management
 * 
 * Centralized management of all third-party integrations.
 * Inspired by Tasklet.ai's Connections tab pattern.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error' | 'pending';

export type ServiceCategory = 
    | 'google_workspace'
    | 'communication'
    | 'pos'
    | 'crm'
    | 'wholesale'
    | 'payments'
    | 'analytics'
    | 'other';

export interface ConnectionDefinition {
    id: string;
    name: string;
    category: ServiceCategory;
    icon: string;
    description: string;
    oauthProvider?: string;
    requiredScopes?: string[];
    isAvailable: boolean;
}

export interface UserConnection {
    id: string;
    serviceId: string;
    userId: string;
    tenantId: string;
    status: ConnectionStatus;
    connectedAt?: Date;
    lastSynced?: Date;
    expiresAt?: Date;
    scope: string[];
    accessToken?: string;  // Encrypted
    refreshToken?: string;  // Encrypted
    metadata?: Record<string, unknown>;
    usedByAgents: string[];
}

// =============================================================================
// AVAILABLE SERVICES
// =============================================================================

export const AVAILABLE_SERVICES: ConnectionDefinition[] = [
    // Google Workspace
    {
        id: 'gmail',
        name: 'Gmail',
        category: 'google_workspace',
        icon: '📧',
        description: 'Send and read emails',
        oauthProvider: 'google',
        requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
        isAvailable: true,
    },
    {
        id: 'google_drive',
        name: 'Google Drive',
        category: 'google_workspace',
        icon: '📁',
        description: 'Access and manage files',
        oauthProvider: 'google',
        requiredScopes: ['https://www.googleapis.com/auth/drive'],
        isAvailable: true,
    },
    {
        id: 'google_calendar',
        name: 'Google Calendar',
        category: 'google_workspace',
        icon: '📅',
        description: 'Manage calendar events',
        oauthProvider: 'google',
        requiredScopes: ['https://www.googleapis.com/auth/calendar'],
        isAvailable: true,
    },
    {
        id: 'google_analytics',
        name: 'Google Analytics',
        category: 'google_workspace',
        icon: '📊',
        description: 'Access analytics data',
        oauthProvider: 'google',
        requiredScopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        isAvailable: true,
    },
    {
        id: 'google_search_console',
        name: 'Google Search Console',
        category: 'analytics',
        icon: '🔍',
        description: 'SEO performance data - rankings, clicks, impressions',
        oauthProvider: 'google',
        requiredScopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
        isAvailable: true,
    },
    {
        id: 'google_sheets',
        name: 'Google Sheets',
        category: 'google_workspace',
        icon: '📑',
        description: 'Create and edit spreadsheets',
        oauthProvider: 'google',
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets'],
        isAvailable: true,
    },
    
    // Communication
    {
        id: 'slack',
        name: 'Slack',
        category: 'communication',
        icon: '💬',
        description: 'Send messages and notifications',
        oauthProvider: 'slack',
        isAvailable: true,
    },
    {
        id: 'twilio_sms',
        name: 'Twilio SMS',
        category: 'communication',
        icon: '📱',
        description: 'Send SMS messages',
        isAvailable: true,
    },
    
    // POS Systems
    {
        id: 'dutchie',
        name: 'Dutchie',
        category: 'pos',
        icon: '🛒',
        description: 'Sync menus, orders, and inventory',
        isAvailable: true,
    },
    {
        id: 'flowhub',
        name: 'Flowhub',
        category: 'pos',
        icon: '🌿',
        description: 'Access POS data and inventory',
        isAvailable: true,
    },
    {
        id: 'jane',
        name: 'Jane Technologies',
        category: 'pos',
        icon: '🏪',
        description: 'Sync e-commerce data',
        isAvailable: false,  // Coming soon
    },
    
    // CRM
    {
        id: 'springbig',
        name: 'SpringBig',
        category: 'crm',
        icon: '🎯',
        description: 'Sync customer and loyalty data',
        isAvailable: true,
    },
    {
        id: 'alpineiq',
        name: 'AlpineIQ',
        category: 'crm',
        icon: '🏔️',
        description: 'Access marketing and CRM data',
        isAvailable: true,
    },
    
    // Wholesale
    {
        id: 'leaflink',
        name: 'LeafLink',
        category: 'wholesale',
        icon: '📦',
        description: 'Manage wholesale orders',
        isAvailable: true,
    },
    
    // Payments
    {
        id: 'stripe',
        name: 'Stripe',
        category: 'payments',
        icon: '💳',
        description: 'Manage subscriptions and payments',
        isAvailable: true,
    },
    {
        id: 'authorize_net',
        name: 'Authorize.net',
        category: 'payments',
        icon: '🏦',
        description: 'Process payments',
        isAvailable: true,
    },
];

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Get all available services
 */
export function getAvailableServices(): ConnectionDefinition[] {
    return AVAILABLE_SERVICES.filter(s => s.isAvailable);
}

/**
 * Get services by category
 */
export function getServicesByCategory(category: ServiceCategory): ConnectionDefinition[] {
    return AVAILABLE_SERVICES.filter(s => s.category === category && s.isAvailable);
}

/**
 * Get a specific service definition
 */
export function getServiceDefinition(serviceId: string): ConnectionDefinition | undefined {
    return AVAILABLE_SERVICES.find(s => s.id === serviceId);
}

// =============================================================================
// USER CONNECTION FUNCTIONS
// =============================================================================

/**
 * Get all connections for a user/tenant
 */
export async function getUserConnections(
    userId: string,
    tenantId: string
): Promise<UserConnection[]> {
    const db = getFirestore();
    const snapshot = await db
        .collection('connections')
        .where('userId', '==', userId)
        .where('tenantId', '==', tenantId)
        .get();
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        connectedAt: doc.data().connectedAt?.toDate(),
        lastSynced: doc.data().lastSynced?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
    })) as UserConnection[];
}

/**
 * Get a specific connection
 */
export async function getConnection(
    userId: string,
    tenantId: string,
    serviceId: string
): Promise<UserConnection | null> {
    const db = getFirestore();
    const snapshot = await db
        .collection('connections')
        .where('userId', '==', userId)
        .where('tenantId', '==', tenantId)
        .where('serviceId', '==', serviceId)
        .limit(1)
        .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return {
        id: doc.id,
        ...doc.data(),
        connectedAt: doc.data().connectedAt?.toDate(),
        lastSynced: doc.data().lastSynced?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
    } as UserConnection;
}

/**
 * Check if a service is connected
 */
export async function isServiceConnected(
    userId: string,
    tenantId: string,
    serviceId: string
): Promise<boolean> {
    const connection = await getConnection(userId, tenantId, serviceId);
    return connection?.status === 'connected';
}

/**
 * Update connection status
 */
export async function updateConnectionStatus(
    connectionId: string,
    status: ConnectionStatus,
    metadata?: Record<string, unknown>
): Promise<void> {
    const db = getFirestore();
    await db.collection('connections').doc(connectionId).update({
        status,
        lastSynced: FieldValue.serverTimestamp(),
        ...(metadata && { metadata }),
    });
}

/**
 * Add agent usage to connection
 */
export async function addAgentUsage(
    connectionId: string,
    agentId: string
): Promise<void> {
    const db = getFirestore();
    await db.collection('connections').doc(connectionId).update({
        usedByAgents: FieldValue.arrayUnion(agentId),
    });
}

/**
 * Get connection summary for UI
 */
export async function getConnectionSummary(
    userId: string,
    tenantId: string
): Promise<{
    total: number;
    connected: number;
    disconnected: number;
    byCategory: Record<ServiceCategory, number>;
}> {
    const connections = await getUserConnections(userId, tenantId);
    
    const summary = {
        total: connections.length,
        connected: connections.filter(c => c.status === 'connected').length,
        disconnected: connections.filter(c => c.status !== 'connected').length,
        byCategory: {} as Record<ServiceCategory, number>,
    };
    
    for (const conn of connections) {
        const service = getServiceDefinition(conn.serviceId);
        if (service) {
            summary.byCategory[service.category] = (summary.byCategory[service.category] || 0) + 1;
        }
    }
    
    return summary;
}

// =============================================================================
// UI HELPERS
// =============================================================================

/**
 * Get connection status display
 */
export function getStatusDisplay(status: ConnectionStatus): {
    label: string;
    color: string;
    icon: string;
} {
    const displays: Record<ConnectionStatus, { label: string; color: string; icon: string }> = {
        connected: { label: 'Connected', color: 'green', icon: '✅' },
        disconnected: { label: 'Disconnected', color: 'gray', icon: '⚪' },
        expired: { label: 'Expired', color: 'orange', icon: '⚠️' },
        error: { label: 'Error', color: 'red', icon: '❌' },
        pending: { label: 'Pending', color: 'blue', icon: '⏳' },
    };
    return displays[status];
}

/**
 * Get category display
 */
export function getCategoryDisplay(category: ServiceCategory): {
    label: string;
    icon: string;
} {
    const displays: Record<ServiceCategory, { label: string; icon: string }> = {
        google_workspace: { label: 'Google Workspace', icon: '🔷' },
        communication: { label: 'Communication', icon: '💬' },
        pos: { label: 'Point of Sale', icon: '🛒' },
        crm: { label: 'CRM & Loyalty', icon: '🎯' },
        wholesale: { label: 'Wholesale', icon: '📦' },
        payments: { label: 'Payments', icon: '💳' },
        analytics: { label: 'Analytics', icon: '📊' },
        other: { label: 'Other', icon: '🔧' },
    };
    return displays[category];
}
