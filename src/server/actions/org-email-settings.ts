'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { encrypt } from '@/server/utils/encryption';
import { getWorkspaceIntegration, disconnectWorkspace, updateWorkspaceSendAs } from '@/server/integrations/google-workspace/token-storage';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';
import { logger } from '@/lib/logger';

async function resolveOrgId(): Promise<string> {
    const user = await requireUser();
    const orgId = (user as any).currentOrgId || (user as any).locationId || (user as any).brandId;
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

export async function sendTestEmail(type: 'workspace' | 'mailjet'): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser();
        const orgId = await resolveOrgId();

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
