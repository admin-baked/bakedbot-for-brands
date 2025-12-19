/**
 * Default Layouts - Role-specific starting widget configurations
 */

import type { UserRole, WidgetInstance } from './widget-registry';

/**
 * Generate unique widget instance ID
 */
function makeId(type: string, index: number): string {
    return `${type}_default_${index}`;
}

/**
 * Owner/Super Admin default layout
 * Full visibility into all platform operations
 */
const OWNER_LAYOUT: WidgetInstance[] = [
    // Row 1: Key insights
    { id: makeId('top-zips', 1), widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 3 },
    { id: makeId('foot-traffic', 2), widgetType: 'foot-traffic', x: 3, y: 0, w: 3, h: 2 },
    { id: makeId('revenue-summary', 3), widgetType: 'revenue-summary', x: 6, y: 0, w: 2, h: 2 },
    { id: makeId('agent-status', 4), widgetType: 'agent-status', x: 8, y: 0, w: 2, h: 2 },

    // Row 2: SEO & Operations
    { id: makeId('seo-health', 5), widgetType: 'seo-health', x: 0, y: 3, w: 3, h: 3 },
    { id: makeId('playbook-tracker', 6), widgetType: 'playbook-tracker', x: 3, y: 2, w: 3, h: 2 },
    { id: makeId('compliance-alerts', 7), widgetType: 'compliance-alerts', x: 6, y: 2, w: 4, h: 2 },

    // Row 3: Growth & Content
    { id: makeId('new-detected', 8), widgetType: 'new-detected', x: 0, y: 6, w: 2, h: 2 },
    { id: makeId('recent-reviews', 9), widgetType: 'recent-reviews', x: 2, y: 6, w: 3, h: 3 },
    { id: makeId('campaign-metrics', 10), widgetType: 'campaign-metrics', x: 5, y: 4, w: 3, h: 2 },
];

/**
 * Admin default layout
 * Similar to owner but without revenue
 */
const ADMIN_LAYOUT: WidgetInstance[] = [
    { id: makeId('top-zips', 1), widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 3 },
    { id: makeId('foot-traffic', 2), widgetType: 'foot-traffic', x: 3, y: 0, w: 3, h: 2 },
    { id: makeId('agent-status', 3), widgetType: 'agent-status', x: 6, y: 0, w: 2, h: 2 },
    { id: makeId('seo-health', 4), widgetType: 'seo-health', x: 0, y: 3, w: 3, h: 3 },
    { id: makeId('playbook-tracker', 5), widgetType: 'playbook-tracker', x: 3, y: 2, w: 3, h: 2 },
    { id: makeId('compliance-alerts', 6), widgetType: 'compliance-alerts', x: 6, y: 2, w: 4, h: 2 },
    { id: makeId('recent-reviews', 7), widgetType: 'recent-reviews', x: 0, y: 6, w: 3, h: 3 },
];

/**
 * Brand default layout
 * Focus on visibility and growth
 */
const BRAND_LAYOUT: WidgetInstance[] = [
    { id: makeId('top-zips', 1), widgetType: 'top-zips', x: 0, y: 0, w: 4, h: 3 },
    { id: makeId('foot-traffic', 2), widgetType: 'foot-traffic', x: 4, y: 0, w: 4, h: 2 },
    { id: makeId('seo-health', 3), widgetType: 'seo-health', x: 0, y: 3, w: 4, h: 3 },
    { id: makeId('campaign-metrics', 4), widgetType: 'campaign-metrics', x: 4, y: 2, w: 4, h: 2 },
    { id: makeId('playbook-tracker', 5), widgetType: 'playbook-tracker', x: 0, y: 6, w: 4, h: 2 },
    { id: makeId('claim-cta', 6), widgetType: 'claim-cta', x: 4, y: 4, w: 4, h: 2 },
    { id: makeId('compliance-alerts', 7), widgetType: 'compliance-alerts', x: 4, y: 6, w: 4, h: 2 },
];

/**
 * Dispensary default layout
 * Focus on foot traffic and local performance
 */
const DISPENSARY_LAYOUT: WidgetInstance[] = [
    { id: makeId('foot-traffic', 1), widgetType: 'foot-traffic', x: 0, y: 0, w: 4, h: 3 },
    { id: makeId('revenue-summary', 2), widgetType: 'revenue-summary', x: 4, y: 0, w: 3, h: 2 },
    { id: makeId('top-zips', 3), widgetType: 'top-zips', x: 0, y: 3, w: 4, h: 3 },
    { id: makeId('playbook-tracker', 4), widgetType: 'playbook-tracker', x: 4, y: 2, w: 4, h: 2 },
    { id: makeId('claim-cta', 5), widgetType: 'claim-cta', x: 0, y: 6, w: 4, h: 2 },
    { id: makeId('compliance-alerts', 6), widgetType: 'compliance-alerts', x: 4, y: 4, w: 4, h: 2 },
];

/**
 * Editor default layout
 * Focus on content moderation
 */
const EDITOR_LAYOUT: WidgetInstance[] = [
    { id: makeId('recent-reviews', 1), widgetType: 'recent-reviews', x: 0, y: 0, w: 6, h: 4 },
    { id: makeId('editor-requests', 2), widgetType: 'editor-requests', x: 6, y: 0, w: 4, h: 3 },
];

/**
 * Customer default layout
 * Minimal - mainly for preference management
 */
const CUSTOMER_LAYOUT: WidgetInstance[] = [];

/**
 * Get default layout for a role
 */
export function getDefaultLayoutForRole(role: UserRole): WidgetInstance[] {
    switch (role) {
        case 'owner':
            return [...OWNER_LAYOUT];
        case 'admin':
            return [...ADMIN_LAYOUT];
        case 'brand':
            return [...BRAND_LAYOUT];
        case 'dispensary':
            return [...DISPENSARY_LAYOUT];
        case 'editor':
            return [...EDITOR_LAYOUT];
        case 'customer':
            return [...CUSTOMER_LAYOUT];
        default:
            return [];
    }
}

/**
 * Get all default layouts
 */
export function getAllDefaultLayouts(): Record<UserRole, WidgetInstance[]> {
    return {
        owner: [...OWNER_LAYOUT],
        admin: [...ADMIN_LAYOUT],
        brand: [...BRAND_LAYOUT],
        dispensary: [...DISPENSARY_LAYOUT],
        editor: [...EDITOR_LAYOUT],
        customer: [...CUSTOMER_LAYOUT]
    };
}
