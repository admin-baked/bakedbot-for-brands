import { getAdminFirestore } from '@/firebase/admin';
import { encrypt, decrypt } from '@/server/utils/encryption';
import { logger } from '@/lib/logger';
import type { Credentials } from 'google-auth-library';

const ORG_COLLECTION = 'organizations';
const INTEGRATIONS_SUBCOLLECTION = 'integrations';
const DOC_ID = 'google_workspace';

export interface WorkspaceSendAsAlias {
    email: string;
    displayName: string;
    isDefault: boolean;     // default address in Gmail settings
    isPrimary: boolean;     // the account's own address (not an alias)
}

export interface WorkspaceIntegration {
    status: 'connected' | 'disconnected';
    sendAs: string;                         // currently selected outbound address
    sendAsAliases: WorkspaceSendAsAlias[];  // all verified addresses available
    connectedAt: string;
    connectedByUserId: string;
}

export async function saveWorkspaceToken(
    orgId: string,
    userId: string,
    tokens: Credentials,
    sendAs?: string,
    sendAsAliases?: WorkspaceSendAsAlias[],
): Promise<void> {
    const firestore = getAdminFirestore();
    if (!tokens.refresh_token && !tokens.access_token) return;

    const payload: Record<string, unknown> = {
        status: 'connected',
        connectedAt: new Date().toISOString(),
        connectedByUserId: userId,
        updatedAt: new Date().toISOString(),
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
    };

    if (tokens.refresh_token) {
        payload.refreshTokenEncrypted = encrypt(tokens.refresh_token);
    }
    if (tokens.expiry_date) {
        payload.expiryDate = tokens.expiry_date;
    }
    if (sendAs) {
        payload.sendAs = sendAs;
    }
    if (sendAsAliases) {
        payload.sendAsAliases = sendAsAliases;
    }

    await firestore
        .collection(ORG_COLLECTION)
        .doc(orgId)
        .collection(INTEGRATIONS_SUBCOLLECTION)
        .doc(DOC_ID)
        .set(payload, { merge: true });
}

export async function getWorkspaceToken(orgId: string): Promise<Credentials | null> {
    const firestore = getAdminFirestore();
    const doc = await firestore
        .collection(ORG_COLLECTION)
        .doc(orgId)
        .collection(INTEGRATIONS_SUBCOLLECTION)
        .doc(DOC_ID)
        .get();

    if (!doc.exists) return null;
    const data = doc.data();
    if (!data || data.status !== 'connected') return null;

    const credentials: Credentials = {};

    if (data.refreshTokenEncrypted) {
        try {
            credentials.refresh_token = decrypt(data.refreshTokenEncrypted);
        } catch (e) {
            logger.warn('[WorkspaceTokenStorage] Failed to decrypt refresh token', { orgId, error: e });
            return null;
        }
    }
    if (data.expiryDate) {
        credentials.expiry_date = data.expiryDate;
    }

    return credentials;
}

export async function getWorkspaceIntegration(orgId: string): Promise<WorkspaceIntegration | null> {
    const firestore = getAdminFirestore();
    const doc = await firestore
        .collection(ORG_COLLECTION)
        .doc(orgId)
        .collection(INTEGRATIONS_SUBCOLLECTION)
        .doc(DOC_ID)
        .get();

    if (!doc.exists) return null;
    const data = doc.data();
    if (!data) return null;

    return {
        status: data.status ?? 'disconnected',
        sendAs: data.sendAs ?? '',
        sendAsAliases: data.sendAsAliases ?? [],
        connectedAt: data.connectedAt ?? '',
        connectedByUserId: data.connectedByUserId ?? '',
    };
}

export async function disconnectWorkspace(orgId: string): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore
        .collection(ORG_COLLECTION)
        .doc(orgId)
        .collection(INTEGRATIONS_SUBCOLLECTION)
        .doc(DOC_ID)
        .set({ status: 'disconnected', refreshTokenEncrypted: null, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function updateWorkspaceSendAs(orgId: string, sendAs: string): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore
        .collection(ORG_COLLECTION)
        .doc(orgId)
        .collection(INTEGRATIONS_SUBCOLLECTION)
        .doc(DOC_ID)
        .set({ sendAs, updatedAt: new Date().toISOString() }, { merge: true });
}
