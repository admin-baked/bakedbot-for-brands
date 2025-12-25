import { createServerClient } from '@/firebase/server-client';
import { encrypt, decrypt } from '@/server/utils/encryption';
import { Credentials } from 'google-auth-library';

export async function saveSheetsToken(userId: string, tokens: Credentials) {
    const { firestore } = await createServerClient();
    if (!tokens.refresh_token && !tokens.access_token) return;

    const payload: any = {
        updatedAt: new Date(),
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
    };

    if (tokens.refresh_token) {
        payload.refreshTokenEncrypted = encrypt(tokens.refresh_token);
    }

    if (tokens.expiry_date) {
        payload.expiryDate = tokens.expiry_date;
    }

    await firestore.collection('users').doc(userId).collection('integrations').doc('sheets').set(payload, { merge: true });
}

export async function getSheetsToken(userId: string): Promise<Credentials | null> {
    const { firestore } = await createServerClient();
    const doc = await firestore.collection('users').doc(userId).collection('integrations').doc('sheets').get();

    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    const credentials: Credentials = {};

    if (data.refreshTokenEncrypted) {
        try {
            credentials.refresh_token = decrypt(data.refreshTokenEncrypted);
        } catch (e) {
            console.error('Failed to decrypt sheets refresh token', e);
            return null;
        }
    }

    if (data.expiryDate) {
        credentials.expiry_date = data.expiryDate;
    }

    return credentials;
}
