
import { sendOrderConfirmationEmail as sendSG } from './sendgrid';
import { sendOrderConfirmationEmail as sendMJ } from './mailjet';
import { sendSesEmail } from './ses';
import { getAdminFirestore } from '@/firebase/admin';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import { getWorkspaceToken } from '@/server/integrations/google-workspace/token-storage';
import { sendGmail } from '@/server/integrations/gmail/send';
import { encrypt, decrypt } from '@/server/utils/encryption';
import { logger } from '@/lib/logger';
import { resolveEmailSenderName } from './sender-branding';
import Mailjet from 'node-mailjet';

// ─────────────────────────────────────────────────────────────
// Email type routing
// ALL types → BakedBot Mail (AWS SES primary, company + tenant wide default)
// Fallbacks: Workspace (personal) · Mailjet (bulk) · Platform legacy
// Orgs can override primary channel to 'workspace' (e.g. when domain DNS is pending)
// ─────────────────────────────────────────────────────────────
const BULK_TYPES = new Set(['campaign', 'winback', 'birthday', 'loyalty']);

function isBulkEmail(type?: string): boolean {
    return BULK_TYPES.has(type ?? '');
}

// ─────────────────────────────────────────────────────────────
// Per-org primary channel preference
// ─────────────────────────────────────────────────────────────
export type EmailPrimaryChannel = 'ses' | 'workspace';

const orgChannelCache = new Map<string, { channel: EmailPrimaryChannel; expiry: number }>();

async function getOrgPrimaryChannel(orgId: string): Promise<EmailPrimaryChannel> {
    const cached = orgChannelCache.get(orgId);
    if (cached && cached.expiry > Date.now()) return cached.channel;
    try {
        const firestore = getAdminFirestore();
        const doc = await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('email_preferences')
            .get();
        const channel = (doc.data()?.primaryChannel as EmailPrimaryChannel) || 'ses';
        orgChannelCache.set(orgId, { channel, expiry: Date.now() + 120_000 });
        return channel;
    } catch {
        return 'ses';
    }
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
// Priority: verified custom domain → tenant subdomain → platform default
// Tenant subdomain pattern: hello@{slug}.bakedbot.ai
//   - Inherits SES verification + DKIM from parent bakedbot.ai
//   - Isolates domain reputation per tenant (spam reports don't affect root)
//   - No DNS setup required — works immediately
// ─────────────────────────────────────────────────────────────

/** Map brand IDs to clean subdomain slugs for tenant email isolation */
const TENANT_SLUG_MAP: Record<string, string> = {
    brand_thrive_syracuse: 'thrive',
    brand_ecstatic_edibles: 'ecstatic',
};

export function deriveTenantSlug(brandId: string): string {
    // Use explicit mapping if available, otherwise derive from brandId
    if (TENANT_SLUG_MAP[brandId]) return TENANT_SLUG_MAP[brandId];
    // Strip common prefixes and clean
    return brandId
        .toLowerCase()
        .replace(/^(brand|org|dispensary)_/, '')
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function deriveTenantSlugFromName(name: string): string {
    return name
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/** Known naked domains we want to migrate away from for org-mail */
const NAKED_DOMAINS = new Set([
    'hello@bakedbot.ai',
    'team@bakedbot.ai',
    'orders@bakedbot.ai',
]);

const orgSesFromCache = new Map<string, { from: { email: string; name: string }; expiry: number }>();

export async function resolveOrgSesFrom(
    orgId: string | undefined,
    explicitEmail?: string,
    explicitName?: string,
): Promise<{ email: string; name: string }> {
    const prefersOrgSender = !explicitEmail || NAKED_DOMAINS.has(explicitEmail);
    if (orgId && prefersOrgSender) {
        const cached = orgSesFromCache.get(orgId);
        if (cached && cached.expiry > Date.now()) {
            return {
                email: cached.from.email,
                name: explicitName ?? cached.from.name,
            };
        }
    }
    // Priority 1: Tenant subdomain (enforced migration) — hello@{slug}.bakedbot.ai
    // If we have an orgId, we ALWAYS prefer the subdomain over naked domains.
    if (orgId) {
        try {
            const firestore = getAdminFirestore();

            // Check for verified custom sending domain first
            if (!orgId.startsWith('brand_')) {
                const sesDoc = await firestore
                    .collection('organizations').doc(orgId)
                    .collection('integrations').doc('ses')
                    .get();
                const sesData = sesDoc.data();
                if (sesData?.status === 'verified' && sesData?.fromEmail) {
                    return { email: sesData.fromEmail, name: sesData.fromName ?? 'BakedBot' };
                }
            }

            // Fallback to tenant subdomain if using a naked domain or no explicit email
            if (prefersOrgSender) {
                if (orgId.startsWith('brand_')) {
                    const brandDoc = await firestore.collection('brands').doc(orgId).get();
                    const brandData = brandDoc.data();
                    const brandName = (brandData?.name as string) || orgId;
                    const from = {
                        email: `hello@${deriveTenantSlug(orgId)}.bakedbot.ai`,
                        name: brandName,
                    };
                    orgSesFromCache.set(orgId, { from, expiry: Date.now() + 60_000 });
                    return { email: from.email, name: explicitName ?? from.name };
                }

                const orgDoc = await firestore.collection('organizations').doc(orgId).get();
                const orgData = orgDoc.data();
                const brandId = orgData?.brandId as string | undefined;

                if (brandId) {
                    const brandDoc = await firestore.collection('brands').doc(brandId).get();
                    const brandData = brandDoc.data();
                    const brandName = (brandData?.name as string) || brandId;
                    const slug = deriveTenantSlug(brandId);
                    const from = { email: `hello@${slug}.bakedbot.ai`, name: brandName };
                    orgSesFromCache.set(orgId, { from, expiry: Date.now() + 60_000 });
                    return { email: from.email, name: explicitName ?? from.name };
                }

                const orgName = typeof orgData?.name === 'string' && orgData.name.trim()
                    ? orgData.name.trim()
                    : orgId;
                const from = {
                    email: `hello@${deriveTenantSlugFromName(orgName)}.bakedbot.ai`,
                    name: orgName,
                };
                orgSesFromCache.set(orgId, { from, expiry: Date.now() + 60_000 });
                return { email: from.email, name: explicitName ?? from.name };
            }
        } catch (e) {
            logger.warn('[Dispatcher] Org subdomain resolution failed (non-fatal)', { orgId, error: e });
        }
    }

    // Priority 2: Caller-specified from address (if not org-mail or not naked)
    if (explicitEmail) {
        return { email: explicitEmail, name: explicitName ?? 'BakedBot' };
    }

    // Priority 3: Platform default
    return { email: 'team@bakedbot.ai', name: 'BakedBot' };
}

// ─────────────────────────────────────────────────────────────
// Public API — unchanged shape, new routing logic
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Deprecated senders — orders@bakedbot.ai retired in favor of hello@bakedbot.ai
// All email now routes through hello@bakedbot.ai (SES verified).
// ─────────────────────────────────────────────────────────────
const DEPRECATED_SENDERS = new Set([
    'orders@bakedbot.ai',
]);

function isDeprecatedSender(fromEmail?: string): boolean {
    return DEPRECATED_SENDERS.has(fromEmail ?? '');
}

export async function sendOrderConfirmationEmail(data: any): Promise<boolean> {
    if (isDeprecatedSender(data.fromEmail)) {
        logger.info('[Dispatcher] Deprecated sender blocked', { from: data.fromEmail, to: data.customerEmail });
        return true;
    }
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
    communicationType?: 'campaign' | 'transactional' | 'welcome' | 'winback' | 'birthday' | 'order_update' | 'loyalty' | 'manual' | 'strategy';
    agentName?: string;
    campaignId?: string;
    userId?: string;
};

export async function sendGenericEmail(data: GenericEmailData): Promise<{ success: boolean; error?: string }> {
    // ── Deprecated sender check ──
    if (isDeprecatedSender(data.fromEmail)) {
        logger.info('[Dispatcher] Deprecated sender blocked', { from: data.fromEmail, to: data.to, subject: data.subject });
        return { success: true };
    }

    const normalizedData: GenericEmailData = {
        ...data,
        fromName: resolveEmailSenderName(data.communicationType, data.fromName),
    };

    let result: { success: boolean; error?: string };

    // ── Resolve plan tier: free orgs use Mailjet, paid orgs use SES ──
    const { isOrgOnFreePlan } = await import('@/lib/get-org-tier');
    const isFreeOrg = normalizedData.orgId ? await isOrgOnFreePlan(normalizedData.orgId) : true;

    // ══════════════════════════════════════════════════════════════════
    // FREE PLAN: Mailjet only (platform 6k/month free tier)
    // No SES, no Workspace, no Gmail — simple single-channel path.
    // ══════════════════════════════════════════════════════════════════
    if (isFreeOrg && normalizedData.communicationType !== 'welcome') {
        logger.info('[Dispatcher] Free org → Mailjet path', { orgId: normalizedData.orgId, type: normalizedData.communicationType });
        result = await sendViaPlatformMailjet(normalizedData);
        logCrm(result, normalizedData, 'mailjet_free');
        return result;
    }

    // ══════════════════════════════════════════════════════════════════
    // PAID PLANS: route based on org primary channel preference
    // Default ('ses'): SES → Workspace → Mailjet → Platform
    // Workspace-first: Workspace → SES → Mailjet → Platform
    //   (used when org has Workspace connected but SES domain DNS is pending)
    // ══════════════════════════════════════════════════════════════════

    const primaryChannel = normalizedData.orgId ? await getOrgPrimaryChannel(normalizedData.orgId) : 'ses';

    // ── Route 1: BakedBot Mail (Absolute Primary, All tiers) ───────────────
    if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
        try {
            const sesFrom = await resolveOrgSesFrom(normalizedData.orgId, normalizedData.fromEmail, normalizedData.fromName);
            await sendSesEmail({
                to: normalizedData.to,
                from: sesFrom.email,
                fromName: sesFrom.name,
                subject: normalizedData.subject,
                htmlBody: normalizedData.htmlBody,
                textBody: normalizedData.textBody,
            });
            result = { success: true };
            logCrm(result, normalizedData, 'bakedbot_mail');
            return result;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn('[Dispatcher] BakedBot Mail (SES) failed, trying fallbacks', { error: msg, orgId: normalizedData.orgId });
        }
    }

    // ── Route 2: Org Google Workspace (Paid legacy fallback) ─────────
    if (normalizedData.orgId && (primaryChannel === 'workspace' || !isFreeOrg)) {
        // Only try Workspace here if we didn't already try it above
        try {
            const wsConfig = await getOrgWorkspaceConfig(normalizedData.orgId);
            if (wsConfig) {
                result = await sendViaOrgWorkspace(normalizedData.orgId, wsConfig.sendAs, normalizedData);
                if (result.success) {
                    logCrm(result, normalizedData, 'google_workspace');
                    return result;
                }
                logger.warn('[Dispatcher] Org Workspace failed, falling back', { orgId: normalizedData.orgId });
            }
        } catch (e) {
            logger.warn('[Dispatcher] Workspace lookup failed', { orgId: normalizedData.orgId, error: e });
        }
    }

    // ── Route 3: Org Mailjet (bulk fallback, if configured) ──────────
    if (normalizedData.orgId && isBulkEmail(normalizedData.communicationType)) {
        const orgMailjet = await getOrgMailjetConfig(normalizedData.orgId);
        if (orgMailjet) {
            result = await sendViaOrgMailjet(orgMailjet, normalizedData);
            if (result.success) {
                logCrm(result, normalizedData, 'mailjet_org');
                return result;
            }
            logger.warn('[Dispatcher] Org Mailjet failed, falling back', { orgId: normalizedData.orgId });
        }
    }

    // ── Route 4: User-level Gmail (internal, personal account) ────────
    if (normalizedData.userId) {
        try {
            const gmailToken = await getGmailToken(normalizedData.userId);
            if (gmailToken?.refresh_token) {
                await sendGmail({
                    userId: normalizedData.userId,
                    to: [normalizedData.to],
                    subject: normalizedData.subject,
                    html: normalizedData.htmlBody,
                });
                result = { success: true };
                logCrm(result, normalizedData, 'gmail_user');
                return result;
            }
        } catch {
            // fall through
        }
    }

    // ── Route 5: Platform Mailjet / SendGrid (last resort) ────────────
    // For paid orgs (orgId present + SES available), surface the failure instead of silently
    // routing to Mailjet with a tenant subdomain that Mailjet won't accept as a sender.
    if (!isFreeOrg && normalizedData.orgId && process.env.AWS_SES_ACCESS_KEY_ID) {
        logger.error('[Dispatcher] SES failed for paid org — refusing Mailjet fallback to prevent invalid sender rejection', {
            orgId: normalizedData.orgId,
            subject: normalizedData.subject,
        });
        return { success: false, error: 'SES unavailable for paid org — check SES credentials and verified domain' };
    }
    // Strip tenant subdomain fromEmail before platform Mailjet send — platform account only validates hello@bakedbot.ai
    const platformData: GenericEmailData = {
        ...normalizedData,
        fromEmail: normalizedData.fromEmail?.endsWith('.bakedbot.ai') ? undefined : normalizedData.fromEmail,
    };
    result = await sendViaPlatformMailjet(platformData);
    logCrm(result, normalizedData, 'mailjet_platform');
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
