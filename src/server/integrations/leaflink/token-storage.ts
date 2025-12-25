import { createServerClient } from '@/firebase/server-client';
import { encrypt, decrypt } from '@/server/utils/encryption';

export async function saveLeafLinkKey(userId: string, apiKey: string) {
    const { firestore } = await createServerClient();
    
    // Encrypt the key for security at rest
    const encryptedKey = encrypt(apiKey);

    await firestore.collection('users').doc(userId).collection('integrations').doc('leaflink').set({
        apiKeyEncrypted: encryptedKey,
        updatedAt: new Date()
    }, { merge: true });
}

export async function getLeafLinkKey(userId: string): Promise<string | null> {
    const { firestore } = await createServerClient();
    const doc = await firestore.collection('users').doc(userId).collection('integrations').doc('leaflink').get();

    if (!doc.exists) return null;
    const data = doc.data();
    if (!data?.apiKeyEncrypted) return null;

    try {
        return decrypt(data.apiKeyEncrypted);
    } catch (e) {
        console.error('Failed to decrypt LeafLink key', e);
        return null;
    }
}
