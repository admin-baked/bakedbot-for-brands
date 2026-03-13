import { createServerClient } from '@/firebase/server-client';
import { encrypt, decrypt } from '@/server/utils/encryption';
import { Credentials } from 'google-auth-library';

const INTEGRATION_ID = 'google_analytics';

export async function saveGoogleAnalyticsToken(userId: string, tokens: Credentials) {
  const { firestore } = await createServerClient();
  if (!tokens.refresh_token && !tokens.access_token) return;

  const payload: Record<string, unknown> = {
    updatedAt: new Date(),
    connectedAt: new Date(),
    status: 'connected',
    scopes: tokens.scope ? tokens.scope.split(' ') : [],
  };

  if (tokens.refresh_token) {
    payload.refreshTokenEncrypted = encrypt(tokens.refresh_token);
  }

  if (tokens.expiry_date) {
    payload.expiryDate = tokens.expiry_date;
    payload.expiresAt = new Date(tokens.expiry_date).toISOString();
  }

  await firestore.collection('users').doc(userId).collection('integrations').doc(INTEGRATION_ID).set(payload, { merge: true });
}

export async function getGoogleAnalyticsToken(userId: string): Promise<Credentials | null> {
  const { firestore } = await createServerClient();
  const doc = await firestore.collection('users').doc(userId).collection('integrations').doc(INTEGRATION_ID).get();

  if (!doc.exists) return null;

  const data = doc.data();
  if (!data) return null;

  const credentials: Credentials = {};

  if (data.refreshTokenEncrypted) {
    try {
      credentials.refresh_token = decrypt(data.refreshTokenEncrypted);
    } catch (error) {
      console.error('Failed to decrypt Google Analytics refresh token', error);
      return null;
    }
  }

  if (data.expiryDate) {
    credentials.expiry_date = data.expiryDate;
  }

  return credentials;
}
