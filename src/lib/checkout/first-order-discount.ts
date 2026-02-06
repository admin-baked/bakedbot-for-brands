/**
 * First-Order Discount System
 *
 * Checks customer eligibility for first-order discount and generates unique codes.
 * Helps convert age gate traffic into paying customers.
 *
 * Business Logic:
 * - 20% off first order
 * - Unique personalized code per customer (WELCOME-{PREFIX}{RANDOM})
 * - One-time use only
 * - 30-day expiration
 */

'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface FirstOrderEligibility {
    eligible: boolean;
    discountCode?: string;
    discountPercent: number;
    reason?: string;
}

/**
 * Check if customer is eligible for first-order discount
 * Eligibility: Customer has never placed an order (orderCount === 0 or doesn't exist)
 */
export async function checkFirstOrderEligibility(
    email: string,
    orgId: string
): Promise<FirstOrderEligibility> {
    try {
        // Validate inputs
        if (!email || !orgId) {
            logger.error('[FirstOrderDiscount] Missing required fields', { email, orgId });
            return {
                eligible: false,
                discountPercent: 0,
                reason: 'Invalid request'
            };
        }

        const db = getAdminFirestore();

        // Query customers collection by email + orgId
        const customerQuery = await db.collection('customers')
            .where('email', '==', email.toLowerCase())
            .where('orgId', '==', orgId)
            .limit(1)
            .get();

        // If no customer record found, they're eligible (new customer)
        if (customerQuery.empty) {
            const discountCode = generateFirstOrderCode(email);
            logger.info('[FirstOrderDiscount] New customer eligible', {
                email,
                orgId,
                discountCode
            });

            return {
                eligible: true,
                discountCode,
                discountPercent: 20
            };
        }

        // Customer exists - check if they have any orders
        const customerDoc = customerQuery.docs[0];
        const customerData = customerDoc.data();
        const orderCount = customerData.orderCount || 0;

        if (orderCount === 0) {
            // Customer exists but hasn't ordered yet - still eligible
            const discountCode = generateFirstOrderCode(email);
            logger.info('[FirstOrderDiscount] Existing customer with no orders eligible', {
                email,
                orgId,
                discountCode
            });

            return {
                eligible: true,
                discountCode,
                discountPercent: 20
            };
        }

        // Customer has placed orders - not eligible
        logger.info('[FirstOrderDiscount] Customer not eligible (returning)', {
            email,
            orgId,
            orderCount
        });

        return {
            eligible: false,
            discountPercent: 0,
            reason: 'Welcome discount is only available for first-time customers'
        };
    } catch (error) {
        logger.error('[FirstOrderDiscount] Error checking eligibility', {
            error: error instanceof Error ? error.message : String(error),
            email,
            orgId
        });

        return {
            eligible: false,
            discountPercent: 0,
            reason: 'Unable to verify eligibility'
        };
    }
}

/**
 * Generate personalized first-order discount code
 * Format: WELCOME-{PREFIX}{RANDOM}
 * Example: WELCOME-JOHN3F2A
 *
 * NOTE: Not exported because it's a sync utility in a 'use server' file
 */
function generateFirstOrderCode(email: string): string {
    try {
        // Extract prefix from email (first 4 chars before @)
        const emailPrefix = email.split('@')[0].toUpperCase();
        const prefix = emailPrefix.slice(0, Math.min(4, emailPrefix.length)).replace(/[^A-Z0-9]/g, '');

        // Generate random suffix (4 alphanumeric chars)
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();

        // Combine into code
        const code = `WELCOME-${prefix}${random}`;

        logger.info('[FirstOrderDiscount] Generated code', {
            email,
            code
        });

        return code;
    } catch (error) {
        logger.error('[FirstOrderDiscount] Error generating code', {
            error: error instanceof Error ? error.message : String(error),
            email
        });

        // Fallback to fully random code
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `WELCOME-${random}`;
    }
}
