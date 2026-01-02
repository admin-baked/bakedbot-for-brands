
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
        
        cachedProvider = provider === 'mailjet' ? 'mailjet' : 'sendgrid'; // Default to sendgrid
        lastFetch = now;
        return cachedProvider;
    } catch (e) {
        console.error('Failed to fetch email provider setting, defaulting to SendGrid', e);
        return 'sendgrid';
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

// Static imports to avoid bundling issues in server actions
import { sendGenericEmail as sendSGGeneric } from './sendgrid';
import { sendGenericEmail as sendMJGeneric } from './mailjet';

export async function sendGenericEmail(data: { to: string, name?: string, subject: string, htmlBody: string, textBody?: string }): Promise<{ success: boolean; error?: string }> {
    const provider = await getProvider();
    
    // Helper to attempt SendGrid
    const attemptSendGrid = async () => {
        try {
            return await sendSGGeneric(data);
        } catch (e: any) {
            return { success: false, error: 'SendGrid Execution Failed: ' + e.message };
        }
    };

    if (provider === 'sendgrid') {
        return attemptSendGrid();
    } else {
        // Try Mailjet
        try {
            const mjResult = await sendMJGeneric(data);
            if (!mjResult.success) {
                console.warn(`Mailjet attempt failed: ${mjResult.error}. Failing over to SendGrid...`);
                
                const sgResult = await attemptSendGrid();
                if (!sgResult.success) {
                    return { 
                        success: false, 
                        error: `Mailjet Failed: ${mjResult.error} | SendGrid Failed: ${sgResult.error}` 
                    };
                }
                return sgResult;
            }
            return mjResult;
        } catch (mjError: any) {
             console.warn(`Mailjet Exception: ${mjError.message}. Failing over to SendGrid...`);
             const sgResult = await attemptSendGrid();
             if (!sgResult.success) {
                return { 
                    success: false, 
                    error: `Mailjet Exception: ${mjError.message} | SendGrid Failed: ${sgResult.error}` 
                };
             }
             return sgResult;
        }
    }
}
