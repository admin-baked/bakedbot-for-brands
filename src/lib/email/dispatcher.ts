
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

        cachedProvider = provider === 'sendgrid' ? 'sendgrid' : 'mailjet'; // Default to Mailjet
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

// Static imports to avoid bundling issues in server actions
import { sendGenericEmail as sendSGGeneric } from './sendgrid';
import { sendGenericEmail as sendMJGeneric } from './mailjet';

export async function sendGenericEmail(data: {
    to: string;
    name?: string;
    fromEmail?: string;
    fromName?: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    // Optional CRM tracking metadata
    orgId?: string;
    communicationType?: 'campaign' | 'transactional' | 'welcome' | 'winback' | 'birthday' | 'order_update' | 'loyalty' | 'manual';
    agentName?: string;
    campaignId?: string;
}): Promise<{ success: boolean; error?: string }> {
    const provider = await getProvider();

    // Helper to attempt SendGrid
    const attemptSendGrid = async () => {
        try {
            return await sendSGGeneric(data);
        } catch (e: any) {
            return { success: false, error: 'SendGrid Execution Failed: ' + e.message };
        }
    };

    let result: { success: boolean; error?: string };

    if (provider === 'sendgrid') {
        result = await attemptSendGrid();
    } else {
        // Try Mailjet
        try {
            const mjResult = await sendMJGeneric(data);
            if (!mjResult.success) {
                console.warn(`Mailjet attempt failed: ${mjResult.error}. Failing over to SendGrid...`);

                const sgResult = await attemptSendGrid();
                if (!sgResult.success) {
                    result = {
                        success: false,
                        error: `Mailjet Failed: ${mjResult.error} | SendGrid Failed: ${sgResult.error}`
                    };
                } else {
                    result = sgResult;
                }
            } else {
                result = mjResult;
            }
        } catch (mjError: any) {
             console.warn(`Mailjet Exception: ${mjError.message}. Failing over to SendGrid...`);
             const sgResult = await attemptSendGrid();
             if (!sgResult.success) {
                result = {
                    success: false,
                    error: `Mailjet Exception: ${mjError.message} | SendGrid Failed: ${sgResult.error}`
                };
             } else {
                result = sgResult;
             }
        }
    }

    // Fire-and-forget: Log communication for CRM tracking
    if (result.success && data.orgId) {
        import('@/server/actions/customer-communications').then(({ logCommunication }) => {
            logCommunication({
                customerEmail: data.to,
                orgId: data.orgId!,
                channel: 'email',
                type: data.communicationType || 'manual',
                subject: data.subject,
                preview: data.textBody?.slice(0, 200) || data.htmlBody?.replace(/<[^>]*>/g, '').slice(0, 200),
                agentName: data.agentName,
                campaignId: data.campaignId,
                provider,
            }).catch(() => {}); // silently fail - don't break email sending
        }).catch(() => {});
    }

    return result;
}
