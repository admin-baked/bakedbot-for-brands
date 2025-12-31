import { createServerClient } from '@/firebase/server-client';
import { encrypt, decrypt } from '@/server/utils/encryption';

export interface SlackCredentials {
    accessToken: string;
    botUserId?: string;
    teamId?: string;
    teamName?: string;
}

export async function saveSlackToken(userId: string, creds: SlackCredentials) {
    const { firestore } = await createServerClient();
    if (!creds.accessToken) return;

    const payload: any = {
        updatedAt: new Date(),
        botUserId: creds.botUserId,
        teamId: creds.teamId,
        teamName: creds.teamName,
        accessTokenEncrypted: encrypt(creds.accessToken)
    };

    await firestore.collection('users').doc(userId).collection('integrations').doc('slack').set(payload, { merge: true });
}

export async function getSlackToken(userId: string): Promise<string | null> {
    const { firestore } = await createServerClient();
    const doc = await firestore.collection('users').doc(userId).collection('integrations').doc('slack').get();

    if (!doc.exists) return null;

    const data = doc.data();
    if (!data || !data.accessTokenEncrypted) return null;

    try {
        return decrypt(data.accessTokenEncrypted);
    } catch (e) {
        console.error('Failed to decrypt slack token', e);
        return null;
    }
}
