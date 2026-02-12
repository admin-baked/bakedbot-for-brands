/**
 * Agent Notification Types
 *
 * Multi-channel notification system where agents proactively push updates.
 * Syncs with heartbeat system — heartbeat checks can produce agent notifications,
 * and agent notifications use the same channel dispatch pattern.
 */

import type { InboxAgentPersona } from './inbox';
import type { HeartbeatCheckId, HeartbeatPriority, HeartbeatChannel } from './heartbeat';

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export type AgentNotificationType =
    // Campaign lifecycle
    | 'campaign_status'
    | 'campaign_sent'
    | 'campaign_performance'
    | 'campaign_compliance'
    // Anomaly / intelligence
    | 'anomaly_detection'
    | 'pricing_alert'
    | 'competitive_intel'
    | 'inventory_alert'
    // CRM events
    | 'crm_alert'
    | 'customer_milestone'
    | 'churn_warning'
    // Compliance
    | 'compliance_flag'
    // System
    | 'system_alert'
    | 'approval_required'
    | 'task_completed'
    // Insights
    | 'insight'
    | 'recommendation'
    // Heartbeat (notifications originating from heartbeat checks)
    | 'heartbeat_alert';

/**
 * Priority levels — aligned with HeartbeatPriority for consistency
 */
export type AgentNotificationPriority = HeartbeatPriority; // 'low' | 'medium' | 'high' | 'urgent'

/**
 * Channels — aligned with HeartbeatChannel for consistency
 */
export type AgentNotificationChannel = HeartbeatChannel; // 'dashboard' | 'email' | 'sms' | 'whatsapp' | 'push'

// =============================================================================
// MAIN NOTIFICATION DOCUMENT
// Stored at: users/{userId}/agent_notifications/{id}
// =============================================================================

export interface AgentNotification {
    id: string;
    orgId: string;
    userId: string;

    /** Which agent sent this notification */
    agent: InboxAgentPersona;

    /** Notification category */
    type: AgentNotificationType;
    priority: AgentNotificationPriority;

    /** Display content */
    title: string;
    message: string;

    /** Optional CTA */
    actionUrl?: string;
    actionLabel?: string;

    /** Cross-references */
    threadId?: string;
    campaignId?: string;

    /** Heartbeat integration — if this notification was produced by a heartbeat check */
    heartbeatCheckId?: HeartbeatCheckId;
    heartbeatExecutionId?: string;

    /** Read/dismiss state */
    status: 'unread' | 'read' | 'dismissed' | 'acted_on';

    /** Which channels this notification was dispatched to */
    channels: AgentNotificationChannel[];

    /** Arbitrary data payload */
    data?: Record<string, unknown>;

    createdAt: Date;
    updatedAt: Date;
}

// =============================================================================
// NOTIFICATION PREFERENCES (per user)
// Stored at: users/{userId}/settings/notifications
// =============================================================================

export interface NotificationPreferences {
    /** Global enable/disable */
    enabled: boolean;
    /** Default channels for each priority level */
    channelsByPriority: Record<AgentNotificationPriority, AgentNotificationChannel[]>;
    /** Quiet hours — no notifications sent */
    quietHours?: {
        start: number; // 0-23
        end: number;   // 0-23
    };
    /** Timezone */
    timezone: string;
    /** Per-type overrides */
    typeOverrides?: Partial<Record<AgentNotificationType, {
        enabled: boolean;
        channels?: AgentNotificationChannel[];
    }>>;
    /** Muted agents — stop notifications from specific agents */
    mutedAgents?: InboxAgentPersona[];
    /** Email digest instead of individual emails */
    emailDigest?: 'immediate' | 'hourly' | 'daily' | 'off';
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    enabled: true,
    channelsByPriority: {
        low: ['dashboard'],
        medium: ['dashboard'],
        high: ['dashboard', 'email'],
        urgent: ['dashboard', 'email', 'push'],
    },
    timezone: 'America/New_York',
    emailDigest: 'daily',
};

// =============================================================================
// NOTIFICATION DISPLAY HELPERS
// =============================================================================

export interface NotificationTypeInfo {
    label: string;
    icon: string;
    defaultPriority: AgentNotificationPriority;
}

export const NOTIFICATION_TYPE_INFO: Record<AgentNotificationType, NotificationTypeInfo> = {
    campaign_status: { label: 'Campaign Update', icon: 'Megaphone', defaultPriority: 'medium' },
    campaign_sent: { label: 'Campaign Sent', icon: 'Send', defaultPriority: 'medium' },
    campaign_performance: { label: 'Campaign Performance', icon: 'BarChart3', defaultPriority: 'low' },
    campaign_compliance: { label: 'Compliance Review', icon: 'Shield', defaultPriority: 'high' },
    anomaly_detection: { label: 'Anomaly Detected', icon: 'AlertTriangle', defaultPriority: 'high' },
    pricing_alert: { label: 'Pricing Alert', icon: 'DollarSign', defaultPriority: 'medium' },
    competitive_intel: { label: 'Competitive Intel', icon: 'Eye', defaultPriority: 'low' },
    inventory_alert: { label: 'Inventory Alert', icon: 'Package', defaultPriority: 'high' },
    crm_alert: { label: 'Customer Alert', icon: 'Users', defaultPriority: 'medium' },
    customer_milestone: { label: 'Customer Milestone', icon: 'Trophy', defaultPriority: 'low' },
    churn_warning: { label: 'Churn Warning', icon: 'UserMinus', defaultPriority: 'high' },
    compliance_flag: { label: 'Compliance Flag', icon: 'ShieldAlert', defaultPriority: 'urgent' },
    system_alert: { label: 'System Alert', icon: 'Server', defaultPriority: 'high' },
    approval_required: { label: 'Approval Required', icon: 'ClipboardCheck', defaultPriority: 'high' },
    task_completed: { label: 'Task Completed', icon: 'CheckCircle', defaultPriority: 'low' },
    insight: { label: 'Insight', icon: 'Lightbulb', defaultPriority: 'low' },
    recommendation: { label: 'Recommendation', icon: 'Sparkles', defaultPriority: 'medium' },
    heartbeat_alert: { label: 'Heartbeat Alert', icon: 'Activity', defaultPriority: 'medium' },
};

// =============================================================================
// PRIORITY DISPLAY HELPERS
// =============================================================================

export const NOTIFICATION_PRIORITY_INFO: Record<AgentNotificationPriority, { label: string; color: string }> = {
    low: { label: 'Low', color: 'text-gray-500' },
    medium: { label: 'Medium', color: 'text-blue-500' },
    high: { label: 'High', color: 'text-orange-500' },
    urgent: { label: 'Urgent', color: 'text-red-500' },
};
