/**
 * QuickEmailVerification Service
 * 
 * Real-time email verification to improve deliverability and reduce bounces.
 * 
 * Access Levels:
 * - Super Users: Use system-level API key (QUICKEMAILVERIFICATION_API_KEY env var)
 * - Brands/Dispensaries: Must provide their own API key (stored in tenant config)
 * 
 * API Docs: https://quickemailverification.com/email-verification-api
 */

import { logger } from '@/lib/logger';

const QEV_API_URL = 'https://api.quickemailverification.com/v1/verify';

export interface EmailVerificationResult {
    email: string;
    result: 'valid' | 'invalid' | 'unknown' | 'catch_all' | 'disposable';
    reason: string;
    disposable: boolean;
    accept_all: boolean;
    role: boolean;
    free: boolean;
    safe_to_send: boolean;
    did_you_mean?: string;
    success: boolean;
    message?: string;
}

export interface VerifyEmailOptions {
    email: string;
    apiKey?: string; // Tenant-specific API key (for brands/dispensaries)
}

/**
 * Verify a single email address.
 * 
 * @param options.email - Email address to verify
 * @param options.apiKey - Optional tenant-specific API key. If not provided, 
 *                         falls back to system key (Super User only)
 */
export async function verifyEmail(options: VerifyEmailOptions | string): Promise<EmailVerificationResult> {
    // Support both old signature (string) and new signature (options object)
    const { email, apiKey: tenantApiKey } = typeof options === 'string' 
        ? { email: options, apiKey: undefined } 
        : options;
    
    // Use tenant key if provided, otherwise fall back to system key
    const apiKey = tenantApiKey || process.env.QUICKEMAILVERIFICATION_API_KEY;
    
    if (!apiKey) {
        logger.warn('[EmailVerification] No API key configured');
        return {
            email,
            result: 'unknown',
            reason: 'API key not configured',
            disposable: false,
            accept_all: false,
            role: false,
            free: false,
            safe_to_send: false,
            success: false,
            message: 'Email verification service not configured'
        };
    }
    
    try {
        const url = `${QEV_API_URL}?email=${encodeURIComponent(email)}&apikey=${apiKey}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        logger.info(`[EmailVerification] Verified ${email}: ${data.result}`);
        
        return {
            email: data.email,
            result: data.result,
            reason: data.reason,
            disposable: data.disposable === 'true' || data.disposable === true,
            accept_all: data.accept_all === 'true' || data.accept_all === true,
            role: data.role === 'true' || data.role === true,
            free: data.free === 'true' || data.free === true,
            safe_to_send: data.safe_to_send === 'true' || data.safe_to_send === true,
            did_you_mean: data.did_you_mean || undefined,
            success: true
        };
    } catch (error) {
        logger.error(`[EmailVerification] Failed to verify ${email}: ${(error as Error).message}`);
        return {
            email,
            result: 'unknown',
            reason: 'Verification service error',
            disposable: false,
            accept_all: false,
            role: false,
            free: false,
            safe_to_send: false,
            success: false,
            message: (error as Error).message
        };
    }
}

/**
 * Verify multiple emails (batch)
 * @param emails - Array of email addresses to verify
 * @param apiKey - Optional tenant-specific API key
 */
export async function verifyEmails(emails: string[], apiKey?: string): Promise<EmailVerificationResult[]> {
    // QuickEmailVerification supports batch via file upload, but for simplicity
    // we'll do sequential verification with rate limiting
    const results: EmailVerificationResult[] = [];
    
    for (const email of emails.slice(0, 50)) { // Limit to 50 per call
        const result = await verifyEmail({ email, apiKey });
        results.push(result);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
}

/**
 * Quick check if email is safe to send to
 */
export async function isEmailSafeToSend(email: string): Promise<boolean> {
    const result = await verifyEmail(email);
    return result.safe_to_send;
}

/**
 * Get email quality score (0-100)
 */
export function getEmailQualityScore(result: EmailVerificationResult): number {
    let score = 50; // Start at neutral
    
    if (result.result === 'valid') score += 30;
    else if (result.result === 'invalid') score -= 50;
    else if (result.result === 'catch_all') score += 10;
    else if (result.result === 'disposable') score -= 40;
    
    if (result.safe_to_send) score += 20;
    if (result.disposable) score -= 20;
    if (result.role) score -= 10; // Role addresses less valuable
    if (result.free) score -= 5; // Free email providers slightly lower
    
    return Math.max(0, Math.min(100, score));
}
