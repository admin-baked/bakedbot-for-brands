
import { sendOrderConfirmationEmail as sendSG } from './sendgrid';
import { sendOrderConfirmationEmail as sendMJ } from './mailjet';
import { getAdminFirestore } from '@/firebase/admin';

// Simple in-memory cache for provider setting to avoid Firestore hit on every email
// invalidates every 60 seconds
let cachedProvider: 'sendgrid' | 'mailjet' | null = null;
let lastFetch = 0;

async function getProvider(): Promise<'sendgrid' | 'mailjet'> {
    const now = Date.now();
    if (cachedProvider && (now - lastFetch < 60000)) {
        return cachedProvider;
    }

    try {
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('settings').doc('system').get();
        const provider = doc.data()?.emailProvider as 'sendgrid' | 'mailjet';
        
        cachedProvider = provider === 'sendgrid' ? 'sendgrid' : 'mailjet'; // Default to mailjet
        lastFetch = now;
        return cachedProvider;
    } catch (e) {
        console.error('Failed to fetch email provider setting, defaulting to Mailjet', e);
        return 'mailjet';
    }
}

export async function sendOrderConfirmationEmail(data: any): Promise<boolean> {
    const provider = await getProvider();
    console.log(`Sending email using provider: ${provider}`);
    
    if (provider === 'mailjet') {
        return sendMJ(data);
    } else {
        return sendSG(data);
    }
}
