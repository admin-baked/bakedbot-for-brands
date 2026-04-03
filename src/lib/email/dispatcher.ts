
import { sendOrderConfirmationEmail as sendSG } from './sendgrid';
import { sendOrderConfirmationEmail as sendMJ } from './mailjet';
import { getAdminFirestore } from '@/firebase/admin';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import { getWorkspaceToken } from '@/server/integrations/google-workspace/token-storage';
import { sendGmail } from '@/server/integrations/gmail/send';
import { encrypt, decrypt } from '@/server/utils/encryption';
import { logger } from '@/lib/logger';
import Mailjet from 'node-mailjet';

// ─────────────────────────────────────────────────────────────
// Email type routing
// bulk   → org Mailjet (weekly newsletters, campaigns, win-back)
// personal → org Google Workspace (welcome, 1:1 follow-ups)
// ─────────────────────────────────────────────────────────────
const BULK_TYPES = new Set(['campaign', 'winback', 'birthday', 'loyalty']);

function isBulkEmail(type?: string): boolean {
    return BULK_TYPES.has(type ?? '');
}

// ─────────────────────────────────────────────────────────────
// Platform-level provider (SendGrid / Mailjet) — unchanged
// ─────────────────────────────────────────────────────────────

let cachedProvider: 'sendgrid' | 'mailjet' | null = null;
let lastFetch = 0;

async function getPlatformProvider(): Promise<'sendgrid' | 'mailjet'> {
    const now = Date.now();
    if (cachedProvider && (now - lastFetch < 60_000)) {
        return cachedProvider;
    }

    try {
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('settings').doc('system').get();
        const provider = doc.data()?.emailProvider as 'sendgrid' | 'mailjet';
        cachedProvider = provider === 'sendgrid' ? 'sendgrid' : 'mailjet';
        lastFetch = now;
        return cachedProvider;
    } catch {
        return 'mailjet';
    }
}

// ─────────────────────────────────────────────────────────────
// Org Mailjet config
// Stored at organizations/{orgId}/integrations/mailjet
// ─────────────────────────────────────────────────────────────

interface OrgMailjetConfig {
    apiKey: string;
    secretKey: string;
    fromEmail: string;
    fromName: string;
}

// Short-lived in-memory cache to avoid per-email Firestore reads
const orgMailjetCache = new Map<string, { config: OrgMailjetConfig | null; expiry: number }>();

async function getOrgMailjetConfig(orgId: string): Promise<OrgMailjetConfig | null> {
    const cached = orgMailjetCache.get(orgId);
    if (cached && cached.expiry > Date.now()) return cached.config;

    try {
        const firestore = getAdminFirestore();
        const doc = await firestore
            .collection('organizations')
            .doc(orgId)
            .collection('integrations')
            .doc('mailjet')
            .get();

        if (!doc.exists) {
            orgMailjetCache.set(orgId, { config: null, expiry: Date.now() + 60_000 });
            return null;
        }

        const data = doc.data()!;
        if (data.status !== 'active' || !data.apiKeyEncrypted || !data.secretKeyEncrypted) {
            orgMailjetCache.set(orgId, { config: null, expiry: Date.now() + 60_000 });
            return null;
        }

        const config: OrgMailjetConfig = {
            apiKey: decrypt(data.apiKeyEncrypted),
            secretKey: decrypt(data.secretKeyEncrypted),
            fromEmail: data.fromEmail,
            fromName: data.fromName,
        };
        orgMailjetCache.set(orgId, { config, expiry: Date.now() + 60_000 });
        return config;
    } catch (e) {
        logger.warn('[Dispatcher] Failed to load org Mailjet config', { orgId, error: e });
        return null;
    }
}

async function sendViaOrgMailjet(
    config: OrgMailjetConfig,
    data: GenericEmailData,
): Promise<{ success: boolean; error?: string }> {
    try {
        const client = new Mailjet({ apiKey: config.apiKey, apiSecret: config.secretKey });
        await client.post('send', { version: 'v3.1' }).request({
            Messages: [{
                From: { Email: config.fromEmail, Name: config.fromName },
                To: [{ Email: data.to, Name: data.name || data.to }],
                Subject: data.subject,
                HTMLPart: data.htmlBody,
                TextPart: data.textBody || '',
            }],
        });
        return { success: true };
    } catch (e: any) {
        logger.warn('[Dispatcher] Org Mailjet send failed', { orgId: 'unknown', error: e.message });
        return { success: false, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────
// Org Google Workspace send
// ─────────────────────────────────────────────────────────────

async function sendViaOrgWorkspace(
    orgId: string,
    sendAs: string,
    data: GenericEmailData,
): Promise<{ success: boolean; error?: string }> {
    try {
        const credentials = await getWorkspaceToken(orgId);
        if (!credentials?.refresh_token) return { success: false, error: 'Workspace not connected' };

        const { getOAuth2ClientAsync } = await import('@/server/integrations/gmail/oauth');
        const { saveWorkspaceToken } = await import('@/server/integrations/google-workspace/token-storage');
        const oauth2Client = await getOAuth2ClientAsync();
        oauth2Client.setCredentials(credentials);

        // Persist refreshed tokens
        oauth2Client.on('tokens', async (t) => {
            if (t.refresh_token || t.access_token) {
                await saveWorkspaceToken(orgId, 'system', {
                    refresh_token: t.refresh_token ?? undefined,
                    access_token: t.access_token ?? undefined,
                    expiry_date: t.expiry_date ?? undefined,
                });
            }
        });

        const accessTokenResponse = await oauth2Client.getAccessToken();
        const accessToken = typeof accessTokenResponse === 'string'
            ? accessTokenResponse
            : accessTokenResponse?.token;
        if (!accessToken) return { success: false, error: 'Failed to acquire Workspace access token' };

        const emailContent = [
            `From: ${sendAs}`,
            `To: ${data.to}`,
            `Subject: ${data.subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            data.htmlBody,
        ].join('\n');

        const raw = Buffer.from(emailContent)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw }),
        });

        if (!response.ok) {
            const body = await response.text();
            return { success: false, error: `Gmail API ${response.status}: ${body}` };
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────
// Public API — unchanged shape, new routing logic
// ─────────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(data: any): Promise<boolean> {
    const provider = await getPlatformProvider();
    return provider === 'mailjet' ? sendMJ(data) : sendSG(data);
}

export type GenericEmailData = {
    to: string;
    name?: string;
    fromEmail?: string;
    fromName?: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    orgId?: string;
    communicationType?: 'campaign' | 'transactional' | 'welcome' | 'winback' | 'birthday' | 'order_update' | 'loyalty' | 'manual';
    agentName?: string;
    campaignId?: string;
    userId?: string;
};

export async function sendGenericEmail(data: GenericEmailData): Promise<{ success: boolean; error?: string }> {
    let result: { success: boolean; error?: string };

    // ── Route 1: Bulk email → org Mailjet ──────────────────────────────
    if (data.orgId && isBulkEmail(data.communicationType)) {
        const orgMailjet = await getOrgMailjetConfig(data.orgId);
        if (orgMailjet) {
            result = await sendViaOrgMailjet(orgMailjet, data);
            if (result.success) {
                logCrm(result, data, 'mailjet_org');
                return result;
            }
            logger.warn('[Dispatcher] Org Mailjet failed, falling back to platform', { orgId: data.orgId });
        }
    }

    // ── Route 2: Personal email → org Google Workspace ────────────────
    if (data.orgId && !isBulkEmail(data.communicationType)) {
        try {
            const firestore = getAdminFirestore();
            const wsDoc = await firestore
                .collection('organizations').doc(data.orgId)
                .collection('integrations').doc('google_workspace')
                .get();
            const wsData = wsDoc.data();
            if (wsData?.status === 'connected' && wsData?.sendAs) {
                result = await sendViaOrgWorkspace(data.orgId, wsData.sendAs, data);
                if (result.success) {
                    logCrm(result, data, 'google_workspace');
                    return result;
                }
                logger.warn('[Dispatcher] Org Workspace failed, falling back', { orgId: data.orgId });
            }
        } catch (e) {
            logger.warn('[Dispatcher] Workspace lookup failed', { orgId: data.orgId, error: e });
        }
    }

    // ── Route 3: User-level Gmail (personal account connected) ─────────
    if (data.userId) {
        try {
            const gmailToken = await getGmailToken(data.userId);
            if (gmailToken?.refresh_token) {
                await sendGmail({ userId: data.userId, to: [data.to], subject: data.subject, html: data.htmlBody });
                result = { success: true };
                logCrm(result, data, 'gmail_user');
                return result;
            }
        } catch {
            // fall through to platform
        }
    }

    // ── Route 4: Platform Mailjet / SendGrid fallback ──────────────────
    const provider = await getPlatformProvider();

    const attemptSendGrid = async () => {
        try {
            const { sendGenericEmail: sendSGGeneric } = await import('./sendgrid');
            return await sendSGGeneric(data);
        } catch (e: any) {
            return { success: false, error: 'SendGrid failed: ' + e.message };
        }
    };

    if (provider === 'sendgrid') {
        result = await attemptSendGrid();
    } else {
        try {
            const { sendGenericEmail: sendMJGeneric } = await import('./mailjet');
            const mjResult = await sendMJGeneric(data);
            if (!mjResult.success) {
                const sgResult = await attemptSendGrid();
                result = sgResult.success ? sgResult : {
                    success: false,
                    error: `Mailjet: ${mjResult.error} | SendGrid: ${sgResult.error}`,
                };
            } else {
                result = mjResult;
            }
        } catch (e: any) {
            const sgResult = await attemptSendGrid();
            result = sgResult.success ? sgResult : {
                success: false,
                error: `Mailjet exception: ${e.message} | SendGrid: ${sgResult.error}`,
            };
        }
    }

    logCrm(result, data, provider);
    return result;
}

/** Fire-and-forget CRM logging — never blocks email send path */
function logCrm(
    result: { success: boolean },
    data: GenericEmailData,
    provider: string,
): void {
    if (!result.success || !data.orgId) return;
    import('@/server/actions/customer-communications').then(({ logCommunication }) =>
        logCommunication({
            customerEmail: data.to,
            orgId: data.orgId!,
            channel: 'email',
            type: data.communicationType || 'manual',
            subject: data.subject,
            preview: data.textBody?.slice(0, 200) || data.htmlBody?.replace(/<[^>]*>/g, '').slice(0, 200),
            agentName: data.agentName,
            campaignId: data.campaignId,
            provider,
        })
    ).catch(() => {});
}
