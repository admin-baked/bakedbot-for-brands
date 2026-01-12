'use server';

/**
 * Free User Setup Actions
 * 
 * Handles post-signup initialization for Free tier users:
 * - Auto-discovers 3 nearest competitors (within 25 miles)
 * - Creates competitor records with data sources
 * - Assigns default weekly playbook
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { discovery } from '@/server/services/firecrawl';
import { quickSetupCompetitor } from '@/server/services/ezal/competitor-manager';
import { assignPlaybookToOrg } from '@/server/actions/playbooks';

// =============================================================================
// TYPES
// =============================================================================

export interface FreeUserSetupLocation {
    lat: number;
    lng: number;
    zip: string;
    city: string;
    state: string;
}

export interface DiscoveredCompetitor {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    menuUrl: string;
    distance?: number;
}

export interface FreeUserSetupResult {
    success: boolean;
    competitorsCreated: number;
    competitors: { id: string; name: string }[];
    playbookAssigned: boolean;
    error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const FREE_TIER_LIMITS = {
    maxCompetitors: 3,
    maxRadiusMiles: 25,
    scrapeFrequencyMinutes: 1440, // Daily
};

const WEEKLY_INTEL_PLAYBOOK_ID = 'free-weekly-competitive-intel';

// =============================================================================
// MAIN SETUP FUNCTION
// =============================================================================

/**
 * Initialize competitors for a new Free tier user.
 * Called after claim/onboarding confirmation.
 */
export async function initializeFreeUserCompetitors(
    orgId: string,
    location: FreeUserSetupLocation
): Promise<FreeUserSetupResult> {
    logger.info('[FreeUserSetup] Starting competitor discovery', {
        orgId,
        location: { city: location.city, state: location.state, zip: location.zip },
    });

    try {
        // 1. Discover nearby competitors using Firecrawl web search
        const competitors = await discoverNearbyCompetitors(location);

        if (competitors.length === 0) {
            logger.warn('[FreeUserSetup] No competitors found', { orgId });
            return {
                success: true,
                competitorsCreated: 0,
                competitors: [],
                playbookAssigned: false,
                error: 'No dispensaries found in your area. You can add competitors manually.',
            };
        }

        // 2. Create competitor records (limit to 3 for Free tier)
        const createdCompetitors: { id: string; name: string }[] = [];
        const limitedCompetitors = competitors.slice(0, FREE_TIER_LIMITS.maxCompetitors);

        for (const comp of limitedCompetitors) {
            try {
                const { competitor } = await quickSetupCompetitor(orgId, {
                    name: comp.name,
                    type: 'dispensary',
                    state: comp.state || location.state,
                    city: comp.city || location.city,
                    zip: comp.zip || location.zip,
                    menuUrl: comp.menuUrl,
                    parserProfileId: 'generic-menu', // Default parser
                    frequencyMinutes: FREE_TIER_LIMITS.scrapeFrequencyMinutes,
                    planId: 'free',
                });

                createdCompetitors.push({ id: competitor.id, name: competitor.name });
                logger.info('[FreeUserSetup] Created competitor', {
                    orgId,
                    competitorId: competitor.id,
                    name: competitor.name,
                });
            } catch (err) {
                logger.error('[FreeUserSetup] Failed to create competitor', {
                    orgId,
                    name: comp.name,
                    error: err,
                });
                // Continue with other competitors
            }
        }

        // 3. Assign weekly competitive intelligence playbook
        let playbookAssigned = false;
        try {
            await assignPlaybookToOrg(orgId, WEEKLY_INTEL_PLAYBOOK_ID);
            playbookAssigned = true;
            logger.info('[FreeUserSetup] Assigned weekly playbook', { orgId });
        } catch (err) {
            logger.error('[FreeUserSetup] Failed to assign playbook', { orgId, error: err });
        }

        logger.info('[FreeUserSetup] Setup complete', {
            orgId,
            competitorsCreated: createdCompetitors.length,
            playbookAssigned,
        });

        return {
            success: true,
            competitorsCreated: createdCompetitors.length,
            competitors: createdCompetitors,
            playbookAssigned,
        };
    } catch (error) {
        logger.error('[FreeUserSetup] Setup failed', { orgId, error });
        return {
            success: false,
            competitorsCreated: 0,
            competitors: [],
            playbookAssigned: false,
            error: error instanceof Error ? error.message : 'Unknown error during setup',
        };
    }
}

// =============================================================================
// COMPETITOR DISCOVERY
// =============================================================================

/**
 * Discover nearby dispensaries using Firecrawl web search.
 */
async function discoverNearbyCompetitors(
    location: FreeUserSetupLocation
): Promise<DiscoveredCompetitor[]> {
    if (!discovery.isConfigured()) {
        logger.warn('[FreeUserSetup] Firecrawl not configured, skipping discovery');
        return [];
    }

    const searchQuery = `dispensaries near ${location.city}, ${location.state} ${location.zip}`;
    
    try {
        logger.info('[FreeUserSetup] Searching for competitors', { query: searchQuery });
        const results = await discovery.search(searchQuery);

        if (!results || !Array.isArray(results)) {
            logger.warn('[FreeUserSetup] Invalid search results', { results });
            return [];
        }

        // Parse search results into competitor format
        const competitors: DiscoveredCompetitor[] = [];
        
        for (const result of results) {
            // Skip non-dispensary results
            const title = result.title?.toLowerCase() || '';
            const url = result.url || '';
            
            // Filter for likely dispensary/cannabis results
            if (!isLikelyDispensary(title, url)) {
                continue;
            }

            // Extract location info from result
            const parsed = parseSearchResult(result, location);
            if (parsed) {
                competitors.push(parsed);
            }

            // Stop at our limit
            if (competitors.length >= FREE_TIER_LIMITS.maxCompetitors) {
                break;
            }
        }

        logger.info('[FreeUserSetup] Found competitors', { 
            count: competitors.length,
            names: competitors.map(c => c.name),
        });

        return competitors;
    } catch (error) {
        logger.error('[FreeUserSetup] Search failed', { error });
        return [];
    }
}

/**
 * Check if a search result is likely a dispensary.
 */
function isLikelyDispensary(title: string, url: string): boolean {
    const keywords = [
        'dispensary', 'dispensaries', 'cannabis', 'marijuana',
        'weed', 'thc', 'cbd', 'recreational', 'medical marijuana',
    ];
    const combined = `${title} ${url}`.toLowerCase();
    return keywords.some(kw => combined.includes(kw));
}

/**
 * Parse a search result into a DiscoveredCompetitor.
 */
function parseSearchResult(
    result: any,
    fallbackLocation: FreeUserSetupLocation
): DiscoveredCompetitor | null {
    const name = result.title || result.name || 'Unknown Dispensary';
    const url = result.url || '';
    
    if (!url) return null;

    // Try to extract location from result metadata or description
    const description = result.description || result.snippet || '';
    const locationMatch = description.match(/(\w+),\s*([A-Z]{2})\s*(\d{5})?/i);

    return {
        name: cleanDispensaryName(name),
        address: result.address || '',
        city: locationMatch?.[1] || fallbackLocation.city,
        state: locationMatch?.[2] || fallbackLocation.state,
        zip: locationMatch?.[3] || fallbackLocation.zip,
        menuUrl: findMenuUrl(url),
    };
}

/**
 * Clean up dispensary name from search result.
 */
function cleanDispensaryName(name: string): string {
    return name
        .replace(/\s*-\s*(Menu|Dispensary|Cannabis|Marijuana|Reviews?|Deals?).*/gi, '')
        .replace(/\s*\|\s*.*/g, '')
        .trim()
        .slice(0, 100);
}

/**
 * Find the most likely menu URL for a dispensary.
 */
function findMenuUrl(baseUrl: string): string {
    try {
        const url = new URL(baseUrl);
        // Common menu path patterns
        const menuPaths = ['/menu', '/products', '/shop', '/order'];
        
        // If URL already contains a menu-like path, use it
        for (const path of menuPaths) {
            if (url.pathname.toLowerCase().includes(path)) {
                return baseUrl;
            }
        }
        
        // Otherwise, append /menu as best guess
        return `${url.origin}/menu`;
    } catch {
        return baseUrl;
    }
}
