
import { sendOrderConfirmationEmail as sendSG } from './sendgrid';
import { sendOrderConfirmationEmail as sendMJ } from './mailjet';
import { sendSesEmail } from './ses';
import { getAdminFirestore } from '@/firebase/admin';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import { getWorkspaceToken } from '@/server/integrations/google-workspace/token-storage';
import { sendGmail } from '@/server/integrations/gmail/send';
import { encrypt, decrypt } from '@/server/utils/encryption';
import { logger } from '@/lib/logger';
import Mailjet from 'node-mailjet';

// ─────────────────────────────────────────────────────────────
// Email type routing
// ALL types → Amazon SES (primary, company + tenant wide default)
// Fallbacks: Workspace (personal) · Mailjet (bulk) · Platform legacy
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

interface OrgWorkspaceConfig {
    sendAs: string;
}

const orgWorkspaceCache = new Map<string, { config: OrgWorkspaceConfig | null; expiry: number }>();

async function withOrgIntegrationCache<T>(
    cache: Map<string, { config: T | null; expiry: number }>,
    orgId: string,
    label: string,
    fetch: () => Promise<T | null>,
): Promise<T | null> {
    const cached = cache.get(orgId);
    if (cached && cached.expiry > Date.now()) return cached.config;
    try {
        const config = await fetch();
        cache.set(orgId, { config, expiry: Date.now() + 60_000 });
        return config;
    } catch (e) {
        logger.warn(`[Dispatcher] Failed to load org ${label} config`, { orgId, error: e });
        cache.set(orgId, { config: null, expiry: Date.now() + 60_000 });
        return null;
    }
}

async function getOrgMailjetConfig(orgId: string): Promise<OrgMailjetConfig | null> {
    return withOrgIntegrationCache(orgMailjetCache, orgId, 'Mailjet', async () => {
        const firestore = getAdminFirestore();
        const doc = await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('mailjet')
            .get();
        if (!doc.exists) return null;
        const data = doc.data()!;
        if (data.status !== 'active' || !data.apiKeyEncrypted || !data.secretKeyEncrypted) return null;
        return {
            apiKey: decrypt(data.apiKeyEncrypted),
            secretKey: decrypt(data.secretKeyEncrypted),
            fromEmail: data.fromEmail,
            fromName: data.fromName,
        };
    });
}

async function getOrgWorkspaceConfig(orgId: string): Promise<OrgWorkspaceConfig | null> {
    return withOrgIntegrationCache(orgWorkspaceCache, orgId, 'Workspace', async () => {
        const firestore = getAdminFirestore();
        const doc = await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('google_workspace')
            .get();
        const data = doc.data();
        return (data?.status === 'connected' && data?.sendAs)
            ? { sendAs: data.sendAs as string }
            : null;
    });
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
// Per-org SES from-address resolution
// Maps orgId → branded {slug}@bakedbot.ai sender identity
// ─────────────────────────────────────────────────────────────

const orgSesFromCache = new Map<string, { from: { email: string; name: string }; expiry: number }>();

async function resolveOrgSesFrom(
    orgId: string | undefined,
    explicitEmail?: string,
    explicitName?: string,
): Promise<{ email: string; name: string }> {
    // Caller-specified from address takes priority
    if (explicitEmail) {
        return { email: explicitEmail, name: explicitName ?? 'BakedBot' };
    }

    // No org → platform default
    if (!orgId) {
        return { email: 'team@bakedbot.ai', name: 'BakedBot' };
    }

    // Check cache
    const cached = orgSesFromCache.get(orgId);
    if (cached && cached.expiry > Date.now()) return cached.from;

    try {
        const firestore = getAdminFirestore();

        // Priority 1: Org has a verified custom sending domain via SES
        const sesDoc = await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('ses')
            .get();
        const sesData = sesDoc.data();
        if (sesData?.status === 'verified' && sesData?.fromEmail) {
            const from = { email: sesData.fromEmail, name: sesData.fromName ?? 'BakedBot' };
            orgSesFromCache.set(orgId, { from, expiry: Date.now() + 300_000 });
            return from;
        }

        // Priority 2: Derive from brand slug → slug@bakedbot.ai
        const orgDoc = await firestore.collection('organizations').doc(orgId).get();
        const orgData = orgDoc.data();
        const brandId = orgData?.brandId as string | undefined;

        if (brandId) {
            const brandDoc = await firestore.collection('brands').doc(brandId).get();
            const brandData = brandDoc.data();
            const brandName = (brandData?.name as string) || brandId;
            const slug = brandId.replace(/[^a-z0-9]/g, '');
            const from = { email: `${slug}@bakedbot.ai`, name: brandName };
            orgSesFromCache.set(orgId, { from, expiry: Date.now() + 300_000 });
            return from;
        }
    } catch (e) {
        logger.warn('[Dispatcher] Failed to resolve org SES from address', { orgId, error: e });
    }

    const fallback = { email: 'team@bakedbot.ai', name: 'BakedBot' };
    orgSesFromCache.set(orgId, { from: fallback, expiry: Date.now() + 60_000 });
    return fallback;
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

    // ── Resolve plan tier: free orgs use Mailjet, paid orgs use SES ──
    const { isOrgOnFreePlan } = await import('@/lib/get-org-tier');
    const isFreeOrg = data.orgId ? await isOrgOnFreePlan(data.orgId) : true;

    // ══════════════════════════════════════════════════════════════════
    // FREE PLAN: Mailjet only (platform 6k/month free tier)
    // No SES, no Workspace, no Gmail — simple single-channel path.
    // ══════════════════════════════════════════════════════════════════
    if (isFreeOrg) {
        logger.info('[Dispatcher] Free org → Mailjet path', { orgId: data.orgId, type: data.communicationType });
        result = await sendViaPlatformMailjet(data);
        logCrm(result, data, 'mailjet_free');
        return result;
    }

    // ══════════════════════════════════════════════════════════════════
    // PAID PLANS: SES primary, Workspace/Mailjet/Gmail as fallbacks
    // SES = customer-facing (campaigns, welcome, receipts, loyalty)
    // Workspace = internal-facing (competitive intel, staff digests)
    // ══════════════════════════════════════════════════════════════════

    // ── Route 1: Amazon SES (customer-facing, primary) ───────────────
    if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
        try {
            const sesFrom = await resolveOrgSesFrom(data.orgId, data.fromEmail, data.fromName);
            await sendSesEmail({
                to: data.to,
                from: sesFrom.email,
                fromName: sesFrom.name,
                subject: data.subject,
                htmlBody: data.htmlBody,
                textBody: data.textBody,
            });
            result = { success: true };
            logCrm(result, data, 'ses');
            return result;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn('[Dispatcher] SES failed, trying fallbacks', { error: msg, orgId: data.orgId });
        }
    }

    // ── Route 2: Org Google Workspace (internal notifications) ────────
    if (data.orgId && !isBulkEmail(data.communicationType)) {
        try {
            const wsConfig = await getOrgWorkspaceConfig(data.orgId);
            if (wsConfig) {
                result = await sendViaOrgWorkspace(data.orgId, wsConfig.sendAs, data);
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

    // ── Route 3: Org Mailjet (bulk fallback, if configured) ──────────
    if (data.orgId && isBulkEmail(data.communicationType)) {
        const orgMailjet = await getOrgMailjetConfig(data.orgId);
        if (orgMailjet) {
            result = await sendViaOrgMailjet(orgMailjet, data);
            if (result.success) {
                logCrm(result, data, 'mailjet_org');
                return result;
            }
            logger.warn('[Dispatcher] Org Mailjet failed, falling back', { orgId: data.orgId });
        }
    }

    // ── Route 4: User-level Gmail (internal, personal account) ────────
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
            // fall through
        }
    }

    // ── Route 5: Platform Mailjet / SendGrid (last resort) ────────────
    result = await sendViaPlatformMailjet(data);
    logCrm(result, data, 'mailjet_platform');
    return result;
}

/** Platform-level Mailjet/SendGrid send — used by free orgs and as final fallback */
async function sendViaPlatformMailjet(data: GenericEmailData): Promise<{ success: boolean; error?: string }> {
    const provider = await getPlatformProvider();

    const attemptSendGrid = async () => {
        try {
            const { sendGenericEmail: sendSGGeneric } = await import('./sendgrid');
            return await sendSGGeneric(data);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            return { success: false, error: 'SendGrid failed: ' + msg };
        }
    };

    if (provider === 'sendgrid') {
        return attemptSendGrid();
    }

    try {
        const { sendGenericEmail: sendMJGeneric } = await import('./mailjet');
        const mjResult = await sendMJGeneric(data);
        if (!mjResult.success) {
            const sgResult = await attemptSendGrid();
            return sgResult.success ? sgResult : {
                success: false,
                error: `Mailjet: ${mjResult.error} | SendGrid: ${sgResult.error}`,
            };
        }
        return mjResult;
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const sgResult = await attemptSendGrid();
        return sgResult.success ? sgResult : {
            success: false,
            error: `Mailjet exception: ${msg} | SendGrid: ${sgResult.error}`,
        };
    }
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
