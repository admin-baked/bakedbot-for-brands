/**
 * Twilio Service (Stub)
 * TODO: Implement actual Twilio SMS integration
 */

export const twilioService = {
    async sendSms(to: string, message: string): Promise<boolean> {
        console.log('[Twilio] Would send SMS to', to, ':', message.substring(0, 50), '...');
        // Stub - actual implementation would use Twilio API
        return true;
    }
};
