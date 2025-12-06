// src/lib/customer-analytics.ts
/**
 * Customer behavior analytics and tracking
 */

import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { logger } from '@/lib/logger';

let db: any = null;

if (typeof window !== 'undefined') {
    try {
        const { firestore } = initializeFirebase();
        db = firestore;
    } catch (e) {
        logger.error('Failed to initialize Firebase for analytics:', e instanceof Error ? e : new Error(String(e)));
    }
}

export type AnalyticsEventType =
    | 'item_added'
    | 'item_removed'
    | 'quantity_updated'
    | 'cart_cleared'
    | 'dispensary_selected'
    | 'checkout_started'
    | 'checkout_completed'
    | 'checkout_abandoned'
    | 'product_viewed'
    | 'search_performed'
    | 'filter_applied';

export type AnalyticsEvent = {
    type: AnalyticsEventType;
    timestamp: any;
    sessionId: string;
    customerId?: string;
    data: Record<string, any>;
    userAgent?: string;
    referrer?: string;
};

/**
 * Track a cart-related event
 */
export async function trackCartEvent(
    type: AnalyticsEventType,
    data: Record<string, any>
): Promise<void> {
    try {
        if (!db) return;

        const event: Partial<AnalyticsEvent> = {
            type,
            timestamp: serverTimestamp(),
            sessionId: data.sessionId,
            data,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
            referrer: typeof window !== 'undefined' ? document.referrer : undefined,
        };

        // Get customer ID from session/auth if available
        const customerId = getCustomerId();
        if (customerId) {
            event.customerId = customerId;
        }

        // Store in Firestore
        await addDoc(collection(db, 'analytics_events'), event);

        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            logger.info(`[Analytics] ${type}`, data);
        }
    } catch (error) {
        logger.error('Failed to track analytics event:', error instanceof Error ? error : new Error(String(error)));
    }
}

/**
 * Track product view
 */
export async function trackProductView(
    productId: string,
    productName: string,
    sessionId: string,
    additionalData?: Record<string, any>
): Promise<void> {
    await trackCartEvent('product_viewed', {
        productId,
        productName,
        sessionId,
        ...additionalData,
    });
}

/**
 * Track search
 */
export async function trackSearch(
    query: string,
    resultCount: number,
    sessionId: string
): Promise<void> {
    await trackCartEvent('search_performed', {
        query,
        resultCount,
        sessionId,
    });
}

/**
 * Track filter application
 */
export async function trackFilter(
    filterType: string,
    filterValue: string,
    sessionId: string
): Promise<void> {
    await trackCartEvent('filter_applied', {
        filterType,
        filterValue,
        sessionId,
    });
}

/**
 * Track checkout start
 */
export async function trackCheckoutStart(
    cartData: {
        items: any[];
        total: number;
        dispensaryId: string;
    },
    sessionId: string
): Promise<void> {
    await trackCartEvent('checkout_started', {
        ...cartData,
        sessionId,
    });
}

/**
 * Track checkout completion
 */
export async function trackCheckoutComplete(
    orderId: string,
    orderData: {
        total: number;
        itemCount: number;
        dispensaryId: string;
        paymentMethod?: string;
    },
    sessionId: string
): Promise<void> {
    await trackCartEvent('checkout_completed', {
        orderId,
        ...orderData,
        sessionId,
    });
}

/**
 * Get customer ID from local storage or auth
 */
function getCustomerId(): string | undefined {
    if (typeof window === 'undefined') return undefined;

    try {
        // Try to get from localStorage first
        const customerId = localStorage.getItem('customer_id');
        if (customerId) return customerId;

        // Could also check Firebase auth here
        // const auth = getAuth();
        // return auth.currentUser?.uid;

        return undefined;
    } catch (error) {
        return undefined;
    }
}

/**
 * Generate or retrieve session ID
 */
export function getOrCreateSessionId(): string {
    if (typeof window === 'undefined') {
        return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    try {
        let sessionId = sessionStorage.getItem('analytics_session_id');

        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            sessionStorage.setItem('analytics_session_id', sessionId);
        }

        return sessionId;
    } catch (error) {
        return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}

/**
 * Set customer ID when user logs in
 */
export function setCustomerId(customerId: string): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem('customer_id', customerId);
    } catch (error) {
        logger.error('Failed to set customer ID:', error instanceof Error ? error : new Error(String(error)));
    }
}

/**
 * Clear customer ID on logout
 */
export function clearCustomerId(): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem('customer_id');
    } catch (error) {
        logger.error('Failed to clear customer ID:', error instanceof Error ? error : new Error(String(error)));
    }
}
