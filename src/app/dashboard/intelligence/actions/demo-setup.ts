'use server';

/**
 * Demo Setup Actions
 * Server Actions wrapper - actual logic in service file
 */

import {
    searchDemoRetailers as searchRetailers,
    sendDemoSMS as sendSMS,
    sendDemoEmail as sendEmail,
} from '@/server/services/demo-setup';

// Re-export service functions as Server Actions
export async function searchDemoRetailers(zip: string) {
    return searchRetailers(zip);
}

export async function sendDemoSMS(phoneNumber: string, messageBody: string) {
    return sendSMS(phoneNumber, messageBody);
}

export async function sendDemoEmail(email: string, htmlBody: string) {
    return sendEmail(email, htmlBody);
}
