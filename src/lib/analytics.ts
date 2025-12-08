export type EventName =
    | 'view_product'
    | 'add_to_cart'
    | 'purchase'
    | 'share_product'
    | 'lead_captured'
    | 'view_promotion'
    | 'click_affiliate_link';

export interface AnalyticsEvent {
    name: EventName;
    properties?: Record<string, any>;
    timestamp?: Date;
    userId?: string;
    sessionId?: string;
}

import { logger } from '@/lib/logger';

export const trackEvent = async (event: AnalyticsEvent) => {
    // In a real implementation, this would send data to:
    // 1. Google Analytics 4
    // 2. Internal Firestore 'events' collection
    // 3. Segment / Mixpanel

    const payload = {
        ...event,
        timestamp: event.timestamp || new Date(),
        url: typeof window !== 'undefined' ? window.location.href : '',
    };

    if (process.env.NODE_ENV === 'development') {
        logger.debug('[ANALYTICS] Event tracked', { eventName: payload.name, ...payload });
    }

    // TODO: Fire-and-forget server action to save to DB
    // await saveEventAction(payload);
};
