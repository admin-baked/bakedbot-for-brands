export type EventName =
    | 'view_product'
    | 'add_to_cart'
    | 'purchase'
    | 'share_product'
    | 'lead_captured'
    | 'view_promotion'
    | 'click_affiliate_link'
    | 'dtc_click'
    | 'partner_click'
    | 'talk_to_smokey_click'
    | 'local_pickup_click'
    | 'claim_listing_click';


export interface AnalyticsEvent {
    name: EventName;
    properties?: Record<string, any>;
    timestamp?: Date;
    userId?: string;
    sessionId?: string;
}

import { logger } from '@/lib/logger';
import { trackUsageAction } from '@/app/actions/usage';

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

    // Track usage stats if orgId/brandId is present
    const orgId = payload.properties?.orgId || payload.properties?.brandId;
    if (orgId) {
        // Fire-and-forget
        trackUsageAction(orgId, 'tracked_events');
    }

    // TODO: Fire-and-forget server action to save to DB
    // await saveEventAction(payload);
};
