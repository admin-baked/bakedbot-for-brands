import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Moltbook Heartbeat Cron
 *
 * Checks Marty's Moltbook dashboard every 4 hours:
 * - Unread notifications (replies, mentions)
 * - Unread DMs from other agents
 * - Karma changes
 * - Suggested actions
 *
 * Posts summary to Slack #social-intel if there's activity.
 * Schedule: every 4 hours (Cloud Scheduler)
 */

function getAuthToken(req: NextRequest): string | null {
    const header = req.headers.get('authorization') || '';
    if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
    return req.nextUrl.searchParams.get('token');
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || getAuthToken(req) !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { getHome, getAgentProfile, getInbox, isMoltbookConfigured } = await import(
            '@/server/services/moltbook/client'
        );

        if (!isMoltbookConfigured()) {
            return NextResponse.json({ skipped: true, reason: 'MOLTBOOK_API_KEY not configured' });
        }

        // Fetch dashboard + profile + inbox in parallel
        const [homeResult, profileResult, inboxResult] = await Promise.all([
            getHome(),
            getAgentProfile(),
            getInbox(10),
        ]);

        const home = homeResult.data;
        const profile = profileResult.data;
        const inbox = inboxResult.data;

        const hasActivity =
            (home?.unread_notifications ?? 0) > 0 ||
            (home?.unread_dms ?? 0) > 0;

        // Store heartbeat in Firestore
        const { getAdminFirestore } = await import('@/firebase/admin');
        const db = getAdminFirestore();
        await db.collection('moltbook_heartbeats').add({
            timestamp: Date.now(),
            karma: profile?.karma ?? home?.karma ?? 0,
            followers: profile?.follower_count ?? 0,
            posts: profile?.posts_count ?? 0,
            unreadNotifications: home?.unread_notifications ?? 0,
            unreadDms: home?.unread_dms ?? 0,
            suggestedActions: home?.suggested_actions ?? [],
            hasActivity,
        });

        // Notify Slack if there's activity
        if (hasActivity) {
            try {
                const { slackService } = await import('@/server/services/communications/slack');

                const lines: string[] = [
                    `🦞 *Moltbook Heartbeat — Marty Benjamins*`,
                    `Karma: ${profile?.karma ?? 0} | Followers: ${profile?.follower_count ?? 0} | Posts: ${profile?.posts_count ?? 0}`,
                ];

                if ((home?.unread_notifications ?? 0) > 0) {
                    lines.push(`📬 ${home!.unread_notifications} unread notification(s)`);
                }
                if ((home?.unread_dms ?? 0) > 0) {
                    lines.push(`💬 ${home!.unread_dms} unread DM(s)`);
                }
                if (inbox && Array.isArray(inbox) && inbox.length > 0) {
                    const recentDm = inbox[0];
                    lines.push(`Latest DM from *${recentDm.from?.name ?? 'unknown'}*: "${(recentDm.content ?? '').slice(0, 100)}"`);
                }
                if (home?.suggested_actions?.length) {
                    lines.push(`Suggested: ${home.suggested_actions.slice(0, 3).join(', ')}`);
                }

                await slackService.postMessage('social-intel', lines.join('\n'));
            } catch {
                // Slack notification is best-effort
            }
        }

        logger.info('[MoltbookHeartbeat] Check complete', {
            karma: profile?.karma ?? 0,
            hasActivity,
            unreadNotifications: home?.unread_notifications ?? 0,
            unreadDms: home?.unread_dms ?? 0,
        });

        return NextResponse.json({
            success: true,
            karma: profile?.karma ?? 0,
            followers: profile?.follower_count ?? 0,
            posts: profile?.posts_count ?? 0,
            unreadNotifications: home?.unread_notifications ?? 0,
            unreadDms: home?.unread_dms ?? 0,
            hasActivity,
        });
    } catch (e) {
        logger.error('[MoltbookHeartbeat] Failed', {
            error: e instanceof Error ? e.message : String(e),
        });
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    return GET(req);
}
