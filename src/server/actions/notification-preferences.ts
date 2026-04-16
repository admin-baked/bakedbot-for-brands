'use server';

/**
 * Server Actions — Notification Preferences
 *
 * Used by the Settings > Notifications UI to read/write org preferences
 * and fetch the org's Slack channel list.
 *
 * Auth:
 *   - dispensary_admin: full read/write on org preferences
 *   - budtender: read-only on org preferences; write-only on own user-scoped playbooks
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import type {
    OrgNotificationPreferences,
    OrgSlackPreferences,
    SlackChannelCache,
    SlackChannelInfo,
} from '@/types/notification-preferences';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notification-preferences';

const CHANNEL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getNotificationPreferences(
    orgId: string,
): Promise<OrgNotificationPreferences> {
    await requireUser();

    try {
        const db = getAdminFirestore();
        const snap = await db.doc(`tenants/${orgId}`).get();
        const data = snap.data() as Record<string, unknown> | undefined;
        const prefs = data?.notificationPreferences as OrgNotificationPreferences | undefined;
        return prefs ?? DEFAULT_NOTIFICATION_PREFERENCES;
    } catch (err) {
        logger.error('[NotificationPrefs] Failed to load preferences', { orgId, error: String(err) });
        return DEFAULT_NOTIFICATION_PREFERENCES;
    }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function updateNotificationPreferences(
    orgId: string,
    updates: Partial<OrgSlackPreferences>,
): Promise<{ success: boolean; error?: string }> {
    const session = await requireUser();

    // Budtenders cannot modify org-wide notification preferences
    if (session.role === 'budtender') {
        return { success: false, error: 'Insufficient permissions' };
    }

    try {
        const db = getAdminFirestore();
        const ref = db.doc(`tenants/${orgId}`);

        // Dot-notation update: only touches notificationPreferences.slack, preserving other prefs
        // Note: callers pass the complete OrgSlackPreferences object (not a partial subset)
        await ref.update({ 'notificationPreferences.slack': updates });

        logger.info('[NotificationPrefs] Updated', { orgId, updatedBy: session.uid });
        return { success: true };
    } catch (err) {
        logger.error('[NotificationPrefs] Failed to update', { orgId, error: String(err) });
        return { success: false, error: 'Failed to save preferences' };
    }
}

// ---------------------------------------------------------------------------
// Slack channel list (cached)
// ---------------------------------------------------------------------------

export async function listOrgSlackChannels(
    orgId: string,
): Promise<SlackChannelInfo[]> {
    await requireUser();

    try {
        const db = getAdminFirestore();
        const cacheRef = db.doc(`slack_channel_cache/${orgId}`);
        const cacheSnap = await cacheRef.get();

        if (cacheSnap.exists) {
            const cached = cacheSnap.data() as SlackChannelCache;
            const age = Date.now() - new Date(cached.cachedAt).getTime();
            if (age < CHANNEL_CACHE_TTL_MS) {
                return cached.channels;
            }
        }

        // Cache miss or expired — fetch from Slack API
        const channels = await slackService.listChannels() as SlackChannelInfo[];

        // Write back to cache
        const cacheDoc: SlackChannelCache = {
            orgId,
            channels,
            cachedAt: new Date().toISOString(),
        };
        await cacheRef.set(cacheDoc);

        return channels;
    } catch (err) {
        logger.error('[NotificationPrefs] Failed to list Slack channels', { orgId, error: String(err) });
        return [];
    }
}
