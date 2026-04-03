import { getAdminFirestore } from '@/firebase/admin';
import { encrypt, decrypt } from '@/server/utils/encryption';
import { logger } from '@/lib/logger';

const ORG_COLLECTION = 'organizations';
const INTEGRATIONS_SUBCOLLECTION = 'integrations';
const DOC_ID = 'cloudflare';

export interface CloudflareIntegration {
    status: 'connected' | 'disconnected';
    connectedAt: string;
    connectedByUserId: string;
    /** Zone ID resolved at connect time to avoid repeated lookups */
    zoneId?: string;
    zoneName?: string;
}

export async function saveCloudflareToken(
    orgId: string,
    userId: string,
    token: string,
    zoneId?: string,
    zoneName?: string,
): Promise<void> {
    const firestore = getAdminFirestore();
    const payload: Record<string, unknown> = {
        status: 'connected',
        apiTokenEncrypted: encrypt(token),
        connectedAt: new Date().toISOString(),
        connectedByUserId: userId,
        updatedAt: new Date().toISOString(),
    };
    if (zoneId) payload.zoneId = zoneId;
    if (zoneName) payload.zoneName = zoneName;

    await firestore
        .collection(ORG_COLLECTION)
        .doc(orgId)
        .collection(INTEGRATIONS_SUBCOLLECTION)
        .doc(DOC_ID)
        .set(payload, { merge: true });
}

export async function getCloudflareToken(orgId: string): Promise<string | null> {
    const firestore = getAdminFirestore();
    const doc = await firestore
        .collection(ORG_COLLECTION)
        .doc(orgId)
        .collection(INTEGRATIONS_SUBCOLLECTION)
        .doc(DOC_ID)
        .get();

    if (!doc.exists) return null;
    const data = doc.data();
    if (!data || data.status !== 'connected' || !data.apiTokenEncrypted) return null;

    try {
        return decrypt(data.apiTokenEncrypted);
    } catch (e) {
        logger.warn('[CloudflareTokenStorage] Failed to decrypt token', { orgId, error: e });
        return null;
    }
}

export async function getCloudflareIntegration(orgId: string): Promise<CloudflareIntegration | null> {
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
        connectedAt: data.connectedAt ?? '',
        connectedByUserId: data.connectedByUserId ?? '',
        zoneId: data.zoneId,
        zoneName: data.zoneName,
    };
}

export async function disconnectCloudflare(orgId: string): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore
        .collection(ORG_COLLECTION)
        .doc(orgId)
        .collection(INTEGRATIONS_SUBCOLLECTION)
        .doc(DOC_ID)
        .set({
            status: 'disconnected',
            apiTokenEncrypted: null,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
}

/** Cache the resolved zone to avoid repeated CF API calls */
export async function updateCloudflareZone(orgId: string, zoneId: string, zoneName: string): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore
        .collection(ORG_COLLECTION)
        .doc(orgId)
        .collection(INTEGRATIONS_SUBCOLLECTION)
        .doc(DOC_ID)
        .set({ zoneId, zoneName, updatedAt: new Date().toISOString() }, { merge: true });
}
