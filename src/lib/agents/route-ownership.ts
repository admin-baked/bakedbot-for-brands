/**
 * Route → Agent Ownership Map
 *
 * Maps dashboard routes to their canonical agent owner.
 * Used for contextual labeling, intent routing, and future handoff logic.
 */

import type { AgentId } from './registry';

export const ROUTE_AGENT_OWNERS: Record<string, AgentId> = {
    // Smokey — commerce, menu, discovery
    '/dashboard/menu': 'smokey',
    '/dashboard/products': 'smokey',
    '/dashboard/orders': 'smokey',

    // Craig — campaigns, creative, playbooks
    '/dashboard/brand/creative': 'craig',
    '/dashboard/vibe-studio': 'craig',
    '/dashboard/heroes': 'craig',
    '/dashboard/qr-codes': 'craig',
    '/dashboard/campaigns': 'craig',
    '/dashboard/playbooks': 'craig',
    '/dashboard/media': 'craig',

    // Pops — analytics, goals
    '/dashboard/analytics': 'pops',
    '/dashboard/goals': 'pops',

    // Ezal — competitive intel, research, distribution
    '/dashboard/competitive-intel': 'ezal',
    '/dashboard/research': 'ezal',
    '/dashboard/dispensaries': 'ezal',

    // Money Mike — pricing, profitability, bundles, upsells
    '/dashboard/pricing': 'money_mike',
    '/dashboard/profitability': 'money_mike',
    '/dashboard/bundles': 'money_mike',
    '/dashboard/upsells': 'money_mike',

    // Mrs. Parker — loyalty, CRM, segments
    '/dashboard/customers': 'mrs_parker',
    '/dashboard/segments': 'mrs_parker',
    '/dashboard/leads': 'mrs_parker',
    '/dashboard/loyalty': 'mrs_parker',
    '/dashboard/loyalty-tablet-qr': 'mrs_parker',
    '/dashboard/settings/loyalty': 'mrs_parker',

    // Deebo — compliance
    '/dashboard/compliance': 'deebo',
};

/**
 * Returns the owning agent for a given pathname.
 * Matches exact routes and prefix-based sub-routes.
 */
export function getOwnerForRoute(pathname: string): AgentId | null {
    // Exact match first
    if (ROUTE_AGENT_OWNERS[pathname]) return ROUTE_AGENT_OWNERS[pathname];

    // Prefix match (e.g. /dashboard/loyalty/rewards → mrs_parker)
    for (const route of Object.keys(ROUTE_AGENT_OWNERS)) {
        if (pathname.startsWith(route + '/')) {
            return ROUTE_AGENT_OWNERS[route];
        }
    }

    return null;
}
