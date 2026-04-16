/**
 * Slack Notification Gate
 *
 * Checks org-level NotificationPreferences before any Slack message is sent.
 * All cron jobs and playbook handlers call checkNotificationGate() first.
 *
 * Fail-open: if preferences cannot be loaded, allows the send and logs a warning.
 * Revenue pace alerts bypass quiet hours (threshold-triggered, always urgent).
 */

import type { Firestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type {
    GateResult,
    NotificationKey,
    OrgNotificationPreferences,
    OrgSlackPreferences,
} from '@/types/notification-preferences';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notification-preferences';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse 'HH:MM' into { hours, minutes }.
 */
function parseTime(t: string): { hours: number; minutes: number } {
    const [h, m] = t.split(':').map(Number);
    return { hours: h ?? 0, minutes: m ?? 0 };
}

/**
 * Return current time in minutes-since-midnight for a given IANA timezone.
 */
function minutesSinceMidnight(timezone: string): number {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
    return hour * 60 + minute;
}

/**
 * Returns true if the current local time is within the quiet window.
 * Handles windows that wrap midnight (e.g. 22:00 → 08:00).
 */
function isInQuietHours(
    start: string,
    end: string,
    timezone: string,
): boolean {
    const current = minutesSinceMidnight(timezone);
    const s = parseTime(start);
    const e = parseTime(end);
    const startMin = s.hours * 60 + s.minutes;
    const endMin = e.hours * 60 + e.minutes;

    if (startMin <= endMin) {
        // Same-day window (e.g. 01:00 → 06:00)
        return current >= startMin && current < endMin;
    }
    // Wraps midnight (e.g. 22:00 → 08:00)
    return current >= startMin || current < endMin;
}

// ---------------------------------------------------------------------------
// Preference loader (with fail-open)
// ---------------------------------------------------------------------------

export async function loadOrgSlackPrefs(
    orgId: string,
    firestore: Firestore,
): Promise<OrgSlackPreferences> {
    try {
        const snap = await firestore.doc(`tenants/${orgId}`).get();
        const data = snap.data() as Record<string, unknown> | undefined;
        const prefs = data?.notificationPreferences as OrgNotificationPreferences | undefined;
        if (prefs?.slack) return prefs.slack;
    } catch (err) {
        logger.warn('[SlackGate] Failed to load notification preferences — fail open', {
            orgId,
            error: String(err),
        });
    }
    return DEFAULT_NOTIFICATION_PREFERENCES.slack;
}

// ---------------------------------------------------------------------------
// Main gate
// ---------------------------------------------------------------------------

const REALTIME_KEYS: NotificationKey[] = ['revenue_pace_alert'];

/**
 * Check whether a Slack notification should be sent.
 *
 * Returns:
 *   { allowed: true, digestMode: false } → post immediately
 *   { allowed: true, digestMode: true }  → buffer into today's digest
 *   { allowed: false, reason }           → suppress
 */
export async function checkNotificationGate(
    orgId: string,
    notificationKey: NotificationKey,
    firestore: Firestore,
): Promise<GateResult> {
    const prefs = await loadOrgSlackPrefs(orgId, firestore);

    // 1 — Master kill-switch
    if (!prefs.enabled) {
        logger.info('[SlackGate] Suppressed — master disabled', { orgId, notificationKey });
        return { allowed: false, reason: 'master_disabled' };
    }

    // 2 — Per-notification toggle
    const notifConfig = prefs.notifications[notificationKey];
    if (notifConfig && !notifConfig.enabled) {
        logger.info('[SlackGate] Suppressed — notification disabled', { orgId, notificationKey });
        return { allowed: false, reason: 'notification_disabled' };
    }

    // 3 — Quiet hours (real-time keys like revenue_pace_alert bypass this)
    const isRealtime = REALTIME_KEYS.includes(notificationKey);
    if (!isRealtime && prefs.quietHours) {
        const { start, end, timezone } = prefs.quietHours;
        if (isInQuietHours(start, end, timezone)) {
            logger.info('[SlackGate] Suppressed — quiet hours', { orgId, notificationKey });
            return { allowed: false, reason: 'quiet_hours' };
        }
    }

    // 4 — Digest mode (real-time keys always bypass)
    if (!isRealtime && prefs.digestMode) {
        return { allowed: true, digestMode: true };
    }

    return { allowed: true, digestMode: false };
}

/**
 * Resolve the effective Slack channel for a notification.
 * Priority: per-notification override → org default → fallback string.
 */
export function resolveNotificationChannel(
    prefs: OrgSlackPreferences,
    notificationKey: NotificationKey,
    fallback: string,
): string {
    return (
        prefs.notifications[notificationKey]?.channel ??
        prefs.defaultChannel ??
        fallback
    );
}
