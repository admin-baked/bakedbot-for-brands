'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { encrypt } from '@/server/utils/encryption';
import { getWorkspaceIntegration, disconnectWorkspace, updateWorkspaceSendAs } from '@/server/integrations/google-workspace/token-storage';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';
import { logger } from '@/lib/logger';

async function resolveOrgId(): Promise<string> {
    const user = await requireUser();
    const orgId = (user as any).currentOrgId || (user as any).orgId || (user as any).locationId || (user as any).brandId;
    if (!orgId) throw new Error('No org associated with this account');
    return orgId;
}

// ─────────────────────────────────────────────────────────────
// Google Workspace
// ─────────────────────────────────────────────────────────────

export async function getWorkspaceStatus() {
    await requireUser();
    const orgId = await resolveOrgId();
    const integration = await getWorkspaceIntegration(orgId);
    return {
        connected: integration?.status === 'connected',
        sendAs: integration?.sendAs ?? null,
        sendAsAliases: integration?.sendAsAliases ?? [],
        connectedAt: integration?.connectedAt ?? null,
    };
}

/** Switch which address outbound emails are sent from */
export async function selectSendAs(email: string): Promise<{ success: boolean; error?: string }> {
    try {
        const orgId = await resolveOrgId();
        const integration = await getWorkspaceIntegration(orgId);

        // Must be a known alias or the primary address
        const isKnown = integration?.sendAsAliases?.some(a => a.email === email);
        if (!isKnown) {
            return { success: false, error: 'Address not found in your verified Send As list' };
        }

        await updateWorkspaceSendAs(orgId, email);
        return { success: true };
    } catch (e: any) {
        logger.error('[OrgEmailSettings] selectSendAs failed', { error: e.message });
        return { success: false, error: e.message };
    }
}

/** Returns the OAuth URL with orgId embedded in state */
export async function getWorkspaceOAuthUrl(redirectPath: string): Promise<string> {
    const user = await requireUser();
    const orgId = await resolveOrgId();

    const oauth2Client = await getOAuth2ClientAsync();
    const { GOOGLE_SERVICE_SCOPES } = await import('@/server/integrations/google/service-definitions');

    const state = JSON.stringify({
        service: 'google_workspace',
        redirect: redirectPath,
        uid: user.uid,
        orgId,
    });

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SERVICE_SCOPES.google_workspace,
        prompt: 'consent',
        state,
        include_granted_scopes: true,
    });
}

export async function saveWorkspaceSendAs(sendAs: string): Promise<{ success: boolean; error?: string }> {
    try {
        const orgId = await resolveOrgId();
        if (!sendAs || !sendAs.includes('@')) return { success: false, error: 'Invalid email address' };
        await updateWorkspaceSendAs(orgId, sendAs.trim().toLowerCase());
        return { success: true };
    } catch (e: any) {
        logger.error('[OrgEmailSettings] saveWorkspaceSendAs failed', { error: e.message });
        return { success: false, error: e.message };
    }
}

export async function disconnectWorkspaceAction(): Promise<{ success: boolean }> {
    try {
        const orgId = await resolveOrgId();
        await disconnectWorkspace(orgId);
        return { success: true };
    } catch (e: any) {
        logger.error('[OrgEmailSettings] disconnectWorkspace failed', { error: e.message });
        return { success: false };
    }
}

// ─────────────────────────────────────────────────────────────
// MailJet org credentials
// ─────────────────────────────────────────────────────────────

export interface MailjetConfig {
    apiKey: string;
    secretKey: string;
    fromEmail: string;
    fromName: string;
}

export async function getMailjetStatus(): Promise<{
    connected: boolean;
    fromEmail: string | null;
    fromName: string | null;
}> {
    try {
        const orgId = await resolveOrgId();
        const firestore = getAdminFirestore();
        const doc = await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('mailjet')
            .get();

        if (!doc.exists) return { connected: false, fromEmail: null, fromName: null };
        const data = doc.data()!;
        return {
            connected: data.status === 'active',
            fromEmail: data.fromEmail ?? null,
            fromName: data.fromName ?? null,
        };
    } catch {
        return { connected: false, fromEmail: null, fromName: null };
    }
}

export async function saveMailjetConfig(config: MailjetConfig): Promise<{ success: boolean; error?: string }> {
    try {
        await requireUser();
        const orgId = await resolveOrgId();

        if (!config.apiKey || !config.secretKey) {
            return { success: false, error: 'API key and secret are required' };
        }
        if (!config.fromEmail || !config.fromEmail.includes('@')) {
            return { success: false, error: 'Valid from email is required' };
        }

        // Verify credentials work before saving
        const { default: Mailjet } = await import('node-mailjet');
        const client = new Mailjet({ apiKey: config.apiKey, apiSecret: config.secretKey });
        try {
            await client.get('sender', { version: 'v3' }).request();
        } catch (e: any) {
            if (e.statusCode === 401) {
                return { success: false, error: 'Invalid API credentials — check your Mailjet API key and secret' };
            }
            // Other errors (rate limit, etc.) — save anyway
        }

        const firestore = getAdminFirestore();
        await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('mailjet')
            .set({
                status: 'active',
                apiKeyEncrypted: encrypt(config.apiKey),
                secretKeyEncrypted: encrypt(config.secretKey),
                fromEmail: config.fromEmail.trim().toLowerCase(),
                fromName: config.fromName.trim(),
                updatedAt: new Date().toISOString(),
            }, { merge: true });

        return { success: true };
    } catch (e: any) {
        logger.error('[OrgEmailSettings] saveMailjetConfig failed', { error: e.message });
        return { success: false, error: e.message };
    }
}

export async function disconnectMailjet(): Promise<{ success: boolean }> {
    try {
        const orgId = await resolveOrgId();
        const firestore = getAdminFirestore();
        await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('mailjet')
            .set({ status: 'inactive', updatedAt: new Date().toISOString() }, { merge: true });
        return { success: true };
    } catch {
        return { success: false };
    }
}

// ─────────────────────────────────────────────────────────────
// Amazon SES — tenant custom sending domain
// ─────────────────────────────────────────────────────────────

export interface SesDomainStatus {
    configured: boolean;
    domain: string | null;
    fromEmail: string | null;
    fromName: string | null;
    verificationStatus: string | null;
    dkimStatus: string | null;
    dnsRecords: Array<{ type: string; name: string; value: string; purpose: string }>;
}

export async function getSesStatus(): Promise<SesDomainStatus> {
    try {
        const orgId = await resolveOrgId();
        const firestore = getAdminFirestore();
        const doc = await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('ses')
            .get();

        if (!doc.exists) return { configured: false, domain: null, fromEmail: null, fromName: null, verificationStatus: null, dkimStatus: null, dnsRecords: [] };
        const data = doc.data()!;

        // If domain is configured, check live SES status
        if (data.domain && process.env.AWS_SES_ACCESS_KEY_ID) {
            const { getSesDomainStatus } = await import('@/lib/email/ses');
            const status = await getSesDomainStatus(data.domain);
            return {
                configured: true,
                domain: data.domain,
                fromEmail: data.fromEmail ?? null,
                fromName: data.fromName ?? null,
                verificationStatus: status.verificationStatus,
                dkimStatus: status.dkimStatus,
                dnsRecords: data.dnsRecords ?? [],
            };
        }

        return {
            configured: true,
            domain: data.domain ?? null,
            fromEmail: data.fromEmail ?? null,
            fromName: data.fromName ?? null,
            verificationStatus: data.verificationStatus ?? null,
            dkimStatus: data.dkimStatus ?? null,
            dnsRecords: data.dnsRecords ?? [],
        };
    } catch {
        return { configured: false, domain: null, fromEmail: null, fromName: null, verificationStatus: null, dkimStatus: null, dnsRecords: [] };
    }
}

/** Start SES domain verification — generates DNS records the tenant must add */
export async function initiateSesVerification(
    domain: string,
    fromEmail: string,
    fromName: string,
): Promise<{ success: boolean; error?: string; dnsRecords?: SesDomainStatus['dnsRecords'] }> {
    try {
        await requireUser();
        const orgId = await resolveOrgId();

        if (!domain || !domain.includes('.')) return { success: false, error: 'Valid domain required' };
        if (!fromEmail || !fromEmail.includes('@')) return { success: false, error: 'Valid from email required' };
        if (!process.env.AWS_SES_ACCESS_KEY_ID) return { success: false, error: 'SES not configured on platform' };

        const { verifySesDomain, getSesDnsRecords } = await import('@/lib/email/ses');
        const { verificationToken, dkimTokens } = await verifySesDomain(domain.trim().toLowerCase());
        const dnsRecords = getSesDnsRecords(domain.trim().toLowerCase(), verificationToken, dkimTokens);

        const firestore = getAdminFirestore();
        await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('ses')
            .set({
                status: 'pending',
                domain: domain.trim().toLowerCase(),
                fromEmail: fromEmail.trim().toLowerCase(),
                fromName: fromName.trim(),
                verificationToken,
                dkimTokens,
                dnsRecords,
                initiatedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, { merge: true });

        logger.info('[OrgEmailSettings] SES domain verification initiated', { orgId, domain });
        return { success: true, dnsRecords };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[OrgEmailSettings] initiateSesVerification failed', { error: msg });
        return { success: false, error: msg };
    }
}

/** Re-check SES verification status and update Firestore */
export async function refreshSesVerification(): Promise<{ success: boolean; verificationStatus?: string; dkimStatus?: string; error?: string }> {
    try {
        await requireUser();
        const orgId = await resolveOrgId();
        const firestore = getAdminFirestore();
        const doc = await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('ses')
            .get();

        if (!doc.exists || !doc.data()?.domain) return { success: false, error: 'No SES domain configured' };

        const { getSesDomainStatus } = await import('@/lib/email/ses');
        const status = await getSesDomainStatus(doc.data()!.domain);

        const isVerified = status.verificationStatus === 'Success' && status.dkimStatus === 'Success';
        await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('ses')
            .set({
                status: isVerified ? 'verified' : 'pending',
                verificationStatus: status.verificationStatus,
                dkimStatus: status.dkimStatus,
                updatedAt: new Date().toISOString(),
            }, { merge: true });

        return { success: true, verificationStatus: status.verificationStatus, dkimStatus: status.dkimStatus };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, error: msg };
    }
}

/** Remove SES domain verification for this org */
export async function disconnectSes(): Promise<{ success: boolean }> {
    try {
        const orgId = await resolveOrgId();
        const firestore = getAdminFirestore();
        const doc = await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('ses')
            .get();

        if (doc.exists && doc.data()?.domain) {
            const { removeSesDomain } = await import('@/lib/email/ses');
            await removeSesDomain(doc.data()!.domain);
        }

        await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('ses')
            .set({ status: 'disconnected', updatedAt: new Date().toISOString() }, { merge: true });

        return { success: true };
    } catch {
        return { success: false };
    }
}

// ─────────────────────────────────────────────────────────────
// Primary email channel preference
// ─────────────────────────────────────────────────────────────

export async function getEmailChannelPreference(): Promise<{
    primaryChannel: 'ses' | 'workspace';
}> {
    try {
        const orgId = await resolveOrgId();
        const firestore = getAdminFirestore();
        const doc = await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('email_preferences')
            .get();
        return { primaryChannel: (doc.data()?.primaryChannel as 'ses' | 'workspace') || 'ses' };
    } catch {
        return { primaryChannel: 'ses' };
    }
}

export async function setEmailChannelPreference(
    channel: 'ses' | 'workspace',
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireUser();
        const orgId = await resolveOrgId();

        if (channel !== 'ses' && channel !== 'workspace') {
            return { success: false, error: 'Invalid channel' };
        }

        const firestore = getAdminFirestore();
        await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('email_preferences')
            .set({
                primaryChannel: channel,
                updatedAt: new Date().toISOString(),
            }, { merge: true });

        logger.info('[OrgEmailSettings] Primary channel updated', { orgId, channel });
        return { success: true };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[OrgEmailSettings] setEmailChannelPreference failed', { error: msg });
        return { success: false, error: msg };
    }
}

export async function sendTestEmail(type: 'workspace' | 'mailjet' | 'ses'): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser();
        const orgId = await resolveOrgId();

        if (type === 'ses') {
            const { sendSesEmail } = await import('@/lib/email/ses');
            const { getAdminFirestore } = await import('@/firebase/admin');

            if (!process.env.AWS_SES_ACCESS_KEY_ID || !process.env.AWS_SES_SECRET_ACCESS_KEY) {
                return { success: false, error: 'AWS SES credentials not configured' };
            }

            // Resolve org brand for from-address
            const firestore = getAdminFirestore();
            const orgDoc = await firestore.collection('organizations').doc(orgId).get();
            const brandId = orgDoc.data()?.brandId as string | undefined;
            let fromEmail = 'team@bakedbot.ai';
            let fromName = 'BakedBot';
            if (brandId) {
                const brandDoc = await firestore.collection('brands').doc(brandId).get();
                fromName = (brandDoc.data()?.name as string) || brandId;
                const { deriveTenantSlug } = await import('@/lib/email/dispatcher');
                fromEmail = `hello@${deriveTenantSlug(brandId)}.bakedbot.ai`;
            }

            await sendSesEmail({
                to: user.email!,
                from: fromEmail,
                fromName,
                subject: `BakedBot Email Test — Amazon SES (${fromName})`,
                htmlBody: `<p>This is a test email from <strong>Amazon SES</strong> for <strong>${fromName}</strong>.</p><p>Sending as: <code>${fromEmail}</code></p><p>If you received this, SES is working correctly for your organization.</p>`,
                textBody: `Test email from Amazon SES for ${fromName}. Sending as: ${fromEmail}. SES is working correctly.`,
            });
            return { success: true };
        }

        const { sendGenericEmail } = await import('@/lib/email/dispatcher');
        return await sendGenericEmail({
            to: user.email!,
            subject: `BakedBot Email Test — ${type === 'workspace' ? 'Google Workspace' : 'Mailjet'}`,
            htmlBody: `<p>This is a test email from your <strong>${type === 'workspace' ? 'Google Workspace' : 'Mailjet'}</strong> integration.</p><p>If you received this, your email setup is working correctly.</p>`,
            textBody: `Test email from ${type}. Email setup is working correctly.`,
            orgId,
            // Workspace for personal, campaign for bulk (forces the right route)
            communicationType: type === 'workspace' ? 'manual' : 'campaign',
        });
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
