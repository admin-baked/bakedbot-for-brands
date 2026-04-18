/**
 * Connection Health Service
 *
 * Checks all key integrations (Gmail, Google Calendar, Blackleaf SMS,
 * Mailjet Email, Letta Memory) and returns a structured health report.
 *
 * Used by:
 *   - /api/cron/connection-health (daily 8AM check → Slack #ceo alert)
 *   - Marty's check_connections tool (on-demand via Slack)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export type ConnectionStatus = 'connected' | 'broken' | 'not_configured';

export interface ConnectionCheck {
    name: string;
    id: string;
    status: ConnectionStatus;
    detail: string;
    reconnectUrl?: string;
}

/**
 * Runs all connection health checks in parallel.
 * Returns one entry per integration — never throws.
 */
export async function checkAllConnections(): Promise<ConnectionCheck[]> {
    const [gmail, gcal, blackleaf, mailjet, letta] = await Promise.all([
        checkGmail(),
        checkGoogleCalendar(),
        checkBlackleaf(),
        checkMailjet(),
        checkLetta(),
    ]);
    return [gmail, gcal, blackleaf, mailjet, letta];
}

/**
 * Returns only broken / not_configured connections.
 */
export function filterBrokenConnections(checks: ConnectionCheck[]): ConnectionCheck[] {
    return checks.filter(c => c.status !== 'connected');
}

// ─── Individual Checks ────────────────────────────────────────────────────────

async function checkGmail(): Promise<ConnectionCheck> {
    const base: Omit<ConnectionCheck, 'status' | 'detail'> = {
        name: 'Gmail (CEO Inbox)',
        id: 'gmail',
        reconnectUrl: '/dashboard/settings?tab=integrations',
    };

    const ceoUid = process.env.CEO_GMAIL_UID;
    if (!ceoUid) {
        return { ...base, status: 'not_configured', detail: 'CEO_GMAIL_UID env var not set — Gmail integration disabled' };
    }

    try {
        const { getGmailToken } = await import('@/server/integrations/gmail/token-storage');
        const credentials = await getGmailToken(ceoUid);

        if (!credentials?.refresh_token) {
            return { ...base, status: 'not_configured', detail: 'Gmail OAuth not connected — no refresh token stored' };
        }

        // Do a real API probe — getProfile is the lightest Gmail call
        const { google } = await import('googleapis');
        const { getOAuth2ClientAsync } = await import('@/server/integrations/gmail/oauth');
        const authClient = await getOAuth2ClientAsync();
        authClient.setCredentials(credentials);
        const gmail = google.gmail({ version: 'v1', auth: authClient });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        const email = profile.data.emailAddress ?? 'unknown';

        return { ...base, status: 'connected', detail: `Connected as ${email}` };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isAuthErr = /login required|invalid.?credentials|token.?expired|unauthorized/i.test(msg);
        logger.warn('[ConnectionHealth] Gmail check failed', { error: msg });
        return {
            ...base,
            status: 'broken',
            detail: isAuthErr
                ? 'Gmail token expired — re-connect at Dashboard → Settings → Integrations → Gmail'
                : `Check failed: ${msg}`,
        };
    }
}

async function checkGoogleCalendar(): Promise<ConnectionCheck> {
    const base: Omit<ConnectionCheck, 'status' | 'detail'> = {
        name: 'Google Calendar (Booking Sync)',
        id: 'google_calendar',
        reconnectUrl: '/dashboard/settings?tab=integrations',
    };

    try {
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('executive_profiles').doc('martez').get();
        const tokens = doc.exists ? (doc.data()?.googleCalendarTokens as { refresh_token?: string } | undefined) : null;

        if (!tokens?.refresh_token) {
            return {
                ...base,
                status: 'not_configured',
                detail: 'Google Calendar not connected — bookings will NOT sync to your calendar',
            };
        }

        return { ...base, status: 'connected', detail: 'OAuth tokens present — bookings auto-sync' };
    } catch (err) {
        logger.warn('[ConnectionHealth] Google Calendar check failed', { error: String(err) });
        return { ...base, status: 'broken', detail: `Check failed: ${err instanceof Error ? err.message : String(err)}` };
    }
}

async function checkBlackleaf(): Promise<ConnectionCheck> {
    const base: Omit<ConnectionCheck, 'status' | 'detail'> = {
        name: 'Blackleaf SMS',
        id: 'blackleaf',
        reconnectUrl: '/dashboard/settings?tab=integrations',
    };

    const apiKey = process.env.BLACKLEAF_API_KEY;
    if (!apiKey) {
        return { ...base, status: 'not_configured', detail: 'BLACKLEAF_API_KEY env var not set — SMS campaigns disabled' };
    }
    return { ...base, status: 'connected', detail: 'API key configured' };
}

async function checkMailjet(): Promise<ConnectionCheck> {
    const base: Omit<ConnectionCheck, 'status' | 'detail'> = {
        name: 'Mailjet Email',
        id: 'mailjet',
        reconnectUrl: '/dashboard/settings?tab=integrations',
    };

    const apiKey = process.env.MAILJET_API_KEY;
    const secretKey = process.env.MAILJET_SECRET_KEY;
    if (!apiKey || !secretKey) {
        return {
            ...base,
            status: 'not_configured',
            detail: `Missing: ${[!apiKey && 'MAILJET_API_KEY', !secretKey && 'MAILJET_SECRET_KEY'].filter(Boolean).join(', ')} — email campaigns disabled`,
        };
    }
    return { ...base, status: 'connected', detail: 'API keys configured' };
}

async function checkLetta(): Promise<ConnectionCheck> {
    const base: Omit<ConnectionCheck, 'status' | 'detail'> = {
        name: 'Letta Memory (Hive Mind)',
        id: 'letta',
        reconnectUrl: '/dashboard/settings?tab=integrations',
    };

    const apiKey = process.env.LETTA_API_KEY;
    if (!apiKey) {
        return { ...base, status: 'not_configured', detail: 'LETTA_API_KEY not set — agent long-term memory disabled' };
    }
    return { ...base, status: 'connected', detail: 'API key configured' };
}

// ─── Slack Formatting ─────────────────────────────────────────────────────────

/**
 * Builds a Slack mrkdwn block body summarising broken connections.
 */
export function buildConnectionAlertSlackText(broken: ConnectionCheck[]): string {
    if (broken.length === 0) return ':white_check_mark: All connections healthy.';

    const lines = broken.map(c => {
        const emoji = c.status === 'broken' ? ':rotating_light:' : ':warning:';
        const action = c.reconnectUrl ? `\n  _Fix: ${c.reconnectUrl}_` : '';
        return `${emoji} *${c.name}* — ${c.detail}${action}`;
    });

    return `:electric_plug: *${broken.length} connection${broken.length > 1 ? 's' : ''} need attention*\n\n${lines.join('\n\n')}`;
}
