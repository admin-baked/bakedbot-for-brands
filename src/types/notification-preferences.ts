/**
 * Org-level Slack Notification Preferences
 *
 * Stored at: tenants/{orgId}.notificationPreferences
 *
 * Controls which notifications fire, to which channel, and whether they
 * are batched into a daily digest or sent immediately.
 */

// ---------------------------------------------------------------------------
// Per-notification config
// ---------------------------------------------------------------------------

export interface SlackNotificationConfig {
    /** Whether this notification is enabled (default: true) */
    enabled: boolean;
    /** Override channel. Falls back to org-level defaultChannel if omitted. */
    channel?: string;
    /** Cron expression override. Uses system default schedule when omitted. */
    scheduleOverride?: string;
    /** Restrict firing to a subset of days (default: 'daily') */
    frequencyLimit?: 'daily' | 'weekdays' | 'weekly';
}

// ---------------------------------------------------------------------------
// System notification keys
// ---------------------------------------------------------------------------

export type SystemNotificationKey =
    | 'thrive_daily_briefing'
    | 'thrive_sales_summary'
    | 'thrive_competitive_intel'
    | 'revenue_pace_alert';

export type NotificationKey = SystemNotificationKey | string; // user playbook IDs too

// ---------------------------------------------------------------------------
// Org preferences root
// ---------------------------------------------------------------------------

export interface OrgSlackPreferences {
    /** Master kill-switch for all org Slack notifications */
    enabled: boolean;
    /** Default channel for all notifications. e.g. '#thrive-syracuse-pilot' */
    defaultChannel: string;
    /**
     * Digest mode: batch all daily notifications into a single message.
     * Default: true (1 message/day).
     * Revenue pace alerts always bypass digest (they are threshold-triggered).
     */
    digestMode: boolean;
    /** Time to send the daily digest. '09:00' format. Default: '09:00'. */
    digestTime: string;
    /** IANA timezone for digestTime and quietHours. Default: 'America/New_York'. */
    digestTimezone: string;
    /** Quiet hours: suppress non-urgent notifications during this window. */
    quietHours?: {
        start: string;   // '22:00'
        end: string;     // '08:00'
        timezone: string;
    };
    /** Per-notification overrides. Keyed by SystemNotificationKey or playbook ID. */
    notifications: Partial<Record<NotificationKey, SlackNotificationConfig>>;
}

export interface OrgNotificationPreferences {
    slack: OrgSlackPreferences;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SLACK_NOTIFICATION_CONFIG: SlackNotificationConfig = {
    enabled: true,
};

export const DEFAULT_NOTIFICATION_PREFERENCES: OrgNotificationPreferences = {
    slack: {
        enabled: true,
        defaultChannel: '#general',
        digestMode: true,
        digestTime: '09:00',
        digestTimezone: 'America/New_York',
        notifications: {
            thrive_daily_briefing:    { enabled: true },
            thrive_sales_summary:     { enabled: true },
            thrive_competitive_intel: { enabled: true },
            revenue_pace_alert:       { enabled: true },
        },
    },
};

// ---------------------------------------------------------------------------
// Gate result
// ---------------------------------------------------------------------------

export type GateBlockReason = 'master_disabled' | 'notification_disabled' | 'quiet_hours' | 'dedup';

export interface GateResult {
    /** true = ok to send (or buffer if digestMode is set) */
    allowed: boolean;
    /** When allowed && digestMode → caller should buffer instead of posting directly */
    digestMode?: boolean;
    /** Set when allowed === false */
    reason?: GateBlockReason;
}

// ---------------------------------------------------------------------------
// Digest buffer document (Firestore: slack_digest_buffer/{orgId}_{YYYY-MM-DD})
// ---------------------------------------------------------------------------

export interface DigestSection {
    key: NotificationKey;
    title: string;
    /** Slack Block Kit blocks for this section */
    blocks: Record<string, unknown>[];
    addedAt: string; // ISO string
}

export interface DigestBufferDoc {
    orgId: string;
    date: string;          // 'YYYY-MM-DD'
    channel: string;
    /** Map keyed by notification key — prevents duplicates on cron rerun */
    sections: Record<string, DigestSection>;
    flushed: boolean;
    flushedAt?: string;    // ISO string
    createdAt: string;
    updatedAt: string;
}

// ---------------------------------------------------------------------------
// Slack channel cache (Firestore: slack_channel_cache/{orgId})
// ---------------------------------------------------------------------------

export interface SlackChannelInfo {
    id: string;
    name: string;
    is_private: boolean;
}

export interface SlackChannelCache {
    orgId: string;
    channels: SlackChannelInfo[];
    cachedAt: string; // ISO string — TTL 1 hour
}
