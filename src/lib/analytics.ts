
import { EntityType } from "@/types/seo-engine";

export type EventName =
    // Views
    | 'view_zip_page'
    | 'view_brand_page'
    | 'view_brand_near_zip_page'
    | 'view_dispensary_page'
    | 'view_rankings_page'

    // Claiming
    | 'click_claim_cta'
    | 'start_claim'
    | 'submit_claim'
    | 'verify_started'
    | 'verify_completed'

    // Monetization
    | 'upgrade_started'
    | 'upgrade_completed'
    | 'featured_impression'
    | 'featured_click'

    // Conversion Actions
    | 'talk_to_smokey_click'
    | 'hemp_shop_click'
    | 'local_pickup_click'
    | 'click_out_to_partner' // Use for retailer links
    | 'get_directions'
    | 'call_store'
    | 'drop_alert_subscribe';

export interface AnalyticsEvent {
    name: EventName;
    properties?: Record<string, any>;
    userId?: string; // if known
    sessionId?: string; // cookie based
    timestamp?: number; // default Date.now()
}

/**
 * Tracks an event to the analytics system (e.g. wrapper around PostHog/Google Analytics/Firestore).
 * For now, this just logs to console or a placeholder service.
 */
export function trackEvent(event: AnalyticsEvent) {
    if (typeof window !== 'undefined') {
        // Client-side tracking logic
        console.log(`[Analytics] ${event.name}`, event.properties);

        // TODO: Integrate real analytics provider
        // e.g. posthog.capture(event.name, event.properties);
    } else {
        // Server-side tracking logic
        console.log(`[ServerAnalytics] ${event.name}`, event.properties);
    }
}

/**
 * Helper to standardise entity event properties
 */
export function getEntityProperties(type: EntityType, id: string, slug?: string) {
    return {
        entityType: type,
        entityId: id,
        entitySlug: slug
    };
}
