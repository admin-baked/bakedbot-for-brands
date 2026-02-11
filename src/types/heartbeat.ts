/**
 * Heartbeat System Types
 *
 * Inspired by OpenClaw's proactive agent architecture.
 * Enables agents to check in periodically and notify users of important events.
 */

import { AgentId } from '@/server/agents/agent-definitions';

// =============================================================================
// CORE TYPES
// =============================================================================

export type HeartbeatRole = 'super_user' | 'dispensary' | 'brand';

export type HeartbeatCheckId =
    // Super User Checks
    | 'system_errors'
    | 'deployment_status'
    | 'new_signups'
    | 'churn_risk'
    | 'academy_leads'
    | 'vibe_leads'
    | 'gmail_unread'
    | 'calendar_upcoming'
    | 'platform_health'
    // Dispensary Checks
    | 'low_stock_alerts'
    | 'expiring_batches'
    | 'margin_alerts'
    | 'pricing_opportunities'
    | 'competitor_price_changes'
    | 'competitor_stockouts'
    | 'at_risk_customers'
    | 'birthday_today'
    | 'license_expiry'
    | 'content_pending_review'
    | 'sales_velocity'
    | 'order_anomalies'
    | 'pos_sync_status'
    // Brand Checks
    | 'content_pending_approval'
    | 'campaign_performance'
    | 'competitor_launches'
    | 'pricing_trends'
    | 'partner_performance'
    | 'revenue_forecast'
    | 'ranking_changes'
    | 'seo_opportunities'
    | 'traffic_anomalies'
    | 'conversion_rates'
    // Playbook Checks (All Roles)
    | 'scheduled_playbooks_due'
    | 'failed_playbooks'
    | 'stalled_playbook_executions'
    | 'pending_playbook_approvals'
    | 'upcoming_playbooks';

export type HeartbeatPriority = 'low' | 'medium' | 'high' | 'urgent';

export type HeartbeatChannel = 'dashboard' | 'email' | 'sms' | 'whatsapp' | 'push';

// =============================================================================
// CHECK DEFINITIONS
// =============================================================================

export interface HeartbeatCheckDefinition {
    id: HeartbeatCheckId;
    name: string;
    description: string;
    agent: AgentId;
    category: 'operations' | 'revenue' | 'compliance' | 'customers' | 'marketing' | 'system';
    defaultEnabled: boolean;
    defaultPriority: HeartbeatPriority;
    /** Roles that can use this check */
    roles: HeartbeatRole[];
}

export interface HeartbeatCheckResult {
    checkId: HeartbeatCheckId;
    agent: AgentId;
    status: 'ok' | 'warning' | 'alert' | 'error';
    priority: HeartbeatPriority;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    actionUrl?: string;
    actionLabel?: string;
    timestamp: Date;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface HeartbeatConfig {
    /** Interval in minutes */
    interval: number;
    /** Active hours (24h format) */
    activeHours: {
        start: number; // 0-23
        end: number;   // 0-23
    };
    /** Quiet hours - no notifications */
    quietHours?: {
        start: number;
        end: number;
    };
    /** Timezone for hour calculations */
    timezone: string;
    /** Enabled check IDs */
    enabledChecks: HeartbeatCheckId[];
    /** Priority overrides per check */
    priorityOverrides?: Record<HeartbeatCheckId, HeartbeatPriority>;
    /** Notification channels */
    channels: HeartbeatChannel[];
    /** Suppress "all clear" notifications */
    suppressAllClear: boolean;
}

export interface TenantHeartbeatConfig extends HeartbeatConfig {
    tenantId: string;
    role: HeartbeatRole;
    enabled: boolean;
    lastRun?: Date;
    lastResults?: HeartbeatCheckResult[];
    createdAt: Date;
    updatedAt: Date;
}

// =============================================================================
// EXECUTION
// =============================================================================

export interface HeartbeatExecutionRequest {
    tenantId: string;
    userId: string;
    role: HeartbeatRole;
    config: HeartbeatConfig;
    /** Force run even outside active hours (for testing) */
    force?: boolean;
}

export interface HeartbeatExecutionResult {
    executionId: string;
    tenantId: string;
    role: HeartbeatRole;
    startedAt: Date;
    completedAt: Date;
    checksRun: number;
    results: HeartbeatCheckResult[];
    /** Aggregated status */
    overallStatus: 'all_clear' | 'has_warnings' | 'has_alerts' | 'has_errors';
    /** Whether notifications were sent */
    notificationsSent: number;
    /** Was suppressed due to quiet hours or all-clear */
    suppressed: boolean;
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export interface HeartbeatNotification {
    id: string;
    tenantId: string;
    userId: string;
    executionId: string;
    channel: HeartbeatChannel;
    results: HeartbeatCheckResult[];
    sentAt: Date;
    status: 'pending' | 'sent' | 'failed';
    error?: string;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

export const DEFAULT_HEARTBEAT_CONFIGS: Record<HeartbeatRole, Omit<HeartbeatConfig, 'enabledChecks'>> = {
    super_user: {
        interval: 30,
        activeHours: { start: 7, end: 22 },
        quietHours: { start: 22, end: 7 },
        timezone: 'America/New_York',
        channels: ['dashboard', 'email'],
        suppressAllClear: true,
    },
    dispensary: {
        interval: 15,
        activeHours: { start: 9, end: 21 },
        timezone: 'America/New_York',
        channels: ['dashboard'],
        suppressAllClear: true,
    },
    brand: {
        interval: 60,
        activeHours: { start: 8, end: 20 },
        timezone: 'America/New_York',
        channels: ['dashboard', 'email'],
        suppressAllClear: true,
    },
};

// =============================================================================
// CHECK DEFINITIONS REGISTRY
// =============================================================================

export const HEARTBEAT_CHECKS: HeartbeatCheckDefinition[] = [
    // -------------------------------------------------------------------------
    // SUPER USER CHECKS
    // -------------------------------------------------------------------------
    {
        id: 'system_errors',
        name: 'System Errors',
        description: 'Monitor for new system errors and exceptions',
        agent: 'linus',
        category: 'system',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['super_user'],
    },
    {
        id: 'deployment_status',
        name: 'Deployment Status',
        description: 'Check for failed or pending deployments',
        agent: 'linus',
        category: 'system',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['super_user'],
    },
    {
        id: 'new_signups',
        name: 'New Signups',
        description: 'Notify on new paid customer signups',
        agent: 'jack',
        category: 'revenue',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['super_user'],
    },
    {
        id: 'churn_risk',
        name: 'Churn Risk',
        description: 'Identify accounts at risk of churning',
        agent: 'jack',
        category: 'revenue',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['super_user'],
    },
    {
        id: 'academy_leads',
        name: 'Academy Leads',
        description: 'New leads from Academy signup',
        agent: 'glenda',
        category: 'marketing',
        defaultEnabled: true,
        defaultPriority: 'low',
        roles: ['super_user'],
    },
    {
        id: 'vibe_leads',
        name: 'Vibe Studio Leads',
        description: 'New leads from Vibe Studio',
        agent: 'glenda',
        category: 'marketing',
        defaultEnabled: true,
        defaultPriority: 'low',
        roles: ['super_user'],
    },
    {
        id: 'gmail_unread',
        name: 'Unread Emails',
        description: 'Check for urgent unread emails',
        agent: 'openclaw',
        category: 'operations',
        defaultEnabled: false, // Requires Gmail OAuth
        defaultPriority: 'medium',
        roles: ['super_user'],
    },
    {
        id: 'calendar_upcoming',
        name: 'Upcoming Meetings',
        description: 'Meetings starting in the next 2 hours',
        agent: 'openclaw',
        category: 'operations',
        defaultEnabled: false, // Requires Calendar OAuth
        defaultPriority: 'medium',
        roles: ['super_user'],
    },
    {
        id: 'platform_health',
        name: 'Platform Health',
        description: 'Overall platform health metrics',
        agent: 'linus',
        category: 'system',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['super_user'],
    },

    // -------------------------------------------------------------------------
    // DISPENSARY CHECKS
    // -------------------------------------------------------------------------
    {
        id: 'low_stock_alerts',
        name: 'Low Stock Alerts',
        description: 'Products running low on inventory',
        agent: 'smokey',
        category: 'operations',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['dispensary'],
    },
    {
        id: 'expiring_batches',
        name: 'Expiring Batches',
        description: 'Inventory batches expiring soon',
        agent: 'smokey',
        category: 'operations',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['dispensary'],
    },
    {
        id: 'margin_alerts',
        name: 'Margin Alerts',
        description: 'Products with margins below threshold',
        agent: 'money_mike',
        category: 'revenue',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['dispensary'],
    },
    {
        id: 'pricing_opportunities',
        name: 'Pricing Opportunities',
        description: 'Opportunities to optimize pricing',
        agent: 'money_mike',
        category: 'revenue',
        defaultEnabled: true,
        defaultPriority: 'low',
        roles: ['dispensary'],
    },
    {
        id: 'competitor_price_changes',
        name: 'Competitor Price Changes',
        description: 'Significant competitor price changes',
        agent: 'ezal',
        category: 'marketing',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['dispensary', 'brand'],
    },
    {
        id: 'competitor_stockouts',
        name: 'Competitor Stockouts',
        description: 'Competitor products out of stock',
        agent: 'ezal',
        category: 'marketing',
        defaultEnabled: true,
        defaultPriority: 'low',
        roles: ['dispensary', 'brand'],
    },
    {
        id: 'at_risk_customers',
        name: 'At-Risk Customers',
        description: 'VIP customers not seen recently',
        agent: 'mrs_parker',
        category: 'customers',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['dispensary'],
    },
    {
        id: 'birthday_today',
        name: 'Customer Birthdays',
        description: 'VIP customer birthdays today',
        agent: 'mrs_parker',
        category: 'customers',
        defaultEnabled: true,
        defaultPriority: 'low',
        roles: ['dispensary'],
    },
    {
        id: 'license_expiry',
        name: 'License Expiry',
        description: 'Licenses expiring within 30 days',
        agent: 'deebo',
        category: 'compliance',
        defaultEnabled: true,
        defaultPriority: 'urgent',
        roles: ['dispensary'],
    },
    {
        id: 'content_pending_review',
        name: 'Content Pending Review',
        description: 'Marketing content awaiting compliance review',
        agent: 'deebo',
        category: 'compliance',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['dispensary'],
    },
    {
        id: 'sales_velocity',
        name: 'Sales Velocity',
        description: 'Unusual sales patterns detected',
        agent: 'pops',
        category: 'revenue',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['dispensary'],
    },
    {
        id: 'order_anomalies',
        name: 'Order Anomalies',
        description: 'Significant spikes or drops in orders',
        agent: 'pops',
        category: 'operations',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['dispensary'],
    },
    {
        id: 'pos_sync_status',
        name: 'POS Sync Status',
        description: 'Check if POS sync is working correctly',
        agent: 'smokey',
        category: 'system',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['dispensary'],
    },

    // -------------------------------------------------------------------------
    // BRAND CHECKS
    // -------------------------------------------------------------------------
    {
        id: 'content_pending_approval',
        name: 'Content Pending Approval',
        description: 'Content waiting for approval',
        agent: 'craig',
        category: 'marketing',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['brand'],
    },
    {
        id: 'campaign_performance',
        name: 'Campaign Performance',
        description: 'Campaigns with declining engagement',
        agent: 'craig',
        category: 'marketing',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['brand'],
    },
    {
        id: 'competitor_launches',
        name: 'Competitor Launches',
        description: 'New competitor products detected',
        agent: 'ezal',
        category: 'marketing',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['brand'],
    },
    {
        id: 'pricing_trends',
        name: 'Pricing Trends',
        description: 'Market-wide pricing shifts',
        agent: 'ezal',
        category: 'revenue',
        defaultEnabled: true,
        defaultPriority: 'low',
        roles: ['brand'],
    },
    {
        id: 'partner_performance',
        name: 'Partner Performance',
        description: 'Underperforming retail partners',
        agent: 'money_mike',
        category: 'revenue',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['brand'],
    },
    {
        id: 'revenue_forecast',
        name: 'Revenue Forecast',
        description: 'Revenue trending below target',
        agent: 'money_mike',
        category: 'revenue',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['brand'],
    },
    {
        id: 'ranking_changes',
        name: 'Ranking Changes',
        description: 'SEO ranking drops detected',
        agent: 'day_day',
        category: 'marketing',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['brand'],
    },
    {
        id: 'seo_opportunities',
        name: 'SEO Opportunities',
        description: 'New keyword opportunities found',
        agent: 'day_day',
        category: 'marketing',
        defaultEnabled: false,
        defaultPriority: 'low',
        roles: ['brand'],
    },
    {
        id: 'traffic_anomalies',
        name: 'Traffic Anomalies',
        description: 'Unusual traffic patterns',
        agent: 'pops',
        category: 'marketing',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['brand'],
    },
    {
        id: 'conversion_rates',
        name: 'Conversion Rates',
        description: 'Conversion rate drops detected',
        agent: 'pops',
        category: 'revenue',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['brand'],
    },

    // -------------------------------------------------------------------------
    // PLAYBOOK CHECKS (All Roles)
    // -------------------------------------------------------------------------
    {
        id: 'scheduled_playbooks_due',
        name: 'Overdue Playbooks',
        description: 'Scheduled playbooks that should have run',
        agent: 'leo',
        category: 'operations',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['super_user', 'dispensary', 'brand'],
    },
    {
        id: 'failed_playbooks',
        name: 'Failed Playbooks',
        description: 'Recent playbook execution failures',
        agent: 'leo',
        category: 'operations',
        defaultEnabled: true,
        defaultPriority: 'high',
        roles: ['super_user', 'dispensary', 'brand'],
    },
    {
        id: 'stalled_playbook_executions',
        name: 'Stalled Executions',
        description: 'Playbook executions stuck in running state',
        agent: 'linus',
        category: 'system',
        defaultEnabled: true,
        defaultPriority: 'urgent',
        roles: ['super_user', 'dispensary', 'brand'],
    },
    {
        id: 'pending_playbook_approvals',
        name: 'Playbook Approvals',
        description: 'Content from playbooks awaiting approval',
        agent: 'craig',
        category: 'marketing',
        defaultEnabled: true,
        defaultPriority: 'medium',
        roles: ['super_user', 'dispensary', 'brand'],
    },
    {
        id: 'upcoming_playbooks',
        name: 'Upcoming Playbooks',
        description: 'Playbooks scheduled to run in the next 2 hours',
        agent: 'leo',
        category: 'operations',
        defaultEnabled: false, // Informational, off by default
        defaultPriority: 'low',
        roles: ['super_user', 'dispensary', 'brand'],
    },
];

/**
 * Get checks available for a specific role
 */
export function getChecksForRole(role: HeartbeatRole): HeartbeatCheckDefinition[] {
    return HEARTBEAT_CHECKS.filter(check => check.roles.includes(role));
}

/**
 * Get default enabled checks for a role
 */
export function getDefaultEnabledChecks(role: HeartbeatRole): HeartbeatCheckId[] {
    return getChecksForRole(role)
        .filter(check => check.defaultEnabled)
        .map(check => check.id);
}

/**
 * Build default config for a role
 */
export function buildDefaultConfig(role: HeartbeatRole): HeartbeatConfig {
    return {
        ...DEFAULT_HEARTBEAT_CONFIGS[role],
        enabledChecks: getDefaultEnabledChecks(role),
    };
}
