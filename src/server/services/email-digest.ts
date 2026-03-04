/**
 * Email Digest Service
 *
 * Fetches a summary of recent unread Gmail messages for a user.
 * Used by the morning/midday/evening briefing to surface important emails.
 *
 * No auth check — callers are responsible for providing a valid userId.
 */

import { google } from 'googleapis';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

// =============================================================================
// Types
// =============================================================================

export interface EmailDigestItem {
    from: string;
    subject: string;
}

export interface EmailDigest {
    unreadCount: number;
    topEmails: EmailDigestItem[];
    checkedAt: string; // ISO timestamp
}

// =============================================================================
// Super User UID Lookup
// =============================================================================

/**
 * Find the first super_user's UID for Gmail access.
 * The morning briefing runs in cron context — no session available.
 */
export async function findSuperUserUid(): Promise<string | null> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection('users')
            .where('role', '==', 'super_user')
            .limit(1)
            .get();
        return snap.empty ? null : snap.docs[0].id;
    } catch {
        return null;
    }
}

// =============================================================================
// Core Email Digest Fetcher
// =============================================================================

/**
 * Fetch unread emails for a user since the given timestamp.
 * Returns null if Gmail is not connected or fetch fails.
 *
 * @param userId   Firebase UID of the user whose Gmail is connected
 * @param sinceMs  Only fetch emails received after this timestamp (ms since epoch)
 * @param maxResults  Max emails to surface (default: 5)
 */
export async function getEmailDigest(
    userId: string,
    sinceMs: number,
    maxResults = 5,
): Promise<EmailDigest | null> {
    try {
        const tokenCreds = await getGmailToken(userId);
        if (!tokenCreds?.refresh_token) {
            logger.info('[EmailDigest] No Gmail token for user', { userId });
            return null;
        }

        const oauth2Client = await getOAuth2ClientAsync();
        oauth2Client.setCredentials(tokenCreds);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Gmail query: unread messages after the given date
        const sinceDate = new Date(sinceMs);
        // Gmail `after:` uses Unix epoch seconds
        const epochSeconds = Math.floor(sinceMs / 1000);
        const q = `is:unread after:${epochSeconds}`;

        const listRes = await gmail.users.messages.list({
            userId: 'me',
            q,
            maxResults: 20, // Fetch more than we show, use estimate for count
        });

        const messages = listRes.data.messages ?? [];
        const unreadCount = listRes.data.resultSizeEstimate ?? messages.length;

        // Fetch metadata for top N emails in parallel
        const topEmails = await Promise.all(
            messages.slice(0, maxResults).map(async (msg) => {
                try {
                    const detail = await gmail.users.messages.get({
                        userId: 'me',
                        id: msg.id!,
                        format: 'metadata',
                        metadataHeaders: ['Subject', 'From'],
                    });
                    const headers = detail.data.payload?.headers ?? [];
                    const subject = headers.find(h => h.name === 'Subject')?.value ?? '(No subject)';
                    const from = headers.find(h => h.name === 'From')?.value ?? '(Unknown sender)';
                    // Simplify "Name <email@example.com>" → "Name"
                    const fromName = from.replace(/<[^>]+>/, '').trim() || from;
                    return { from: fromName, subject };
                } catch {
                    return null;
                }
            })
        );

        logger.info('[EmailDigest] Fetched email digest', {
            userId,
            unreadCount,
            topEmailsCount: topEmails.filter(Boolean).length,
        });

        return {
            unreadCount,
            topEmails: topEmails.filter((e): e is EmailDigestItem => e !== null),
            checkedAt: new Date().toISOString(),
        };
    } catch (error) {
        logger.warn('[EmailDigest] Failed to fetch email digest', { userId, error: String(error) });
        return null;
    }
}
