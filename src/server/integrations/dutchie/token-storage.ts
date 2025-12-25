import { createServerClient } from '@/firebase/server-client';
import { encrypt, decrypt } from '@/server/utils/encryption';

export async function saveDutchieKey(userId: string, apiKey: string) {
    const { firestore } = await createServerClient();
    
    const encryptedKey = encrypt(apiKey);

    await firestore.collection('users').doc(userId).collection('integrations').doc('dutchie').set({
        apiKeyEncrypted: encryptedKey,
        updatedAt: new Date()
    }, { merge: true });
}

export async function getDutchieKey(userId: string): Promise<string | null> {
    const { firestore } = await createServerClient();
    const doc = await firestore.collection('users').doc(userId).collection('integrations').doc('dutchie').get();

    if (!doc.exists) return null;
    const data = doc.data();
    if (!data?.apiKeyEncrypted) return null;

    try {
        return decrypt(data.apiKeyEncrypted);
    } catch (e) {
        console.error('Failed to decrypt Dutchie key', e);
        return null;
    }
}
