/**
 * Available Markets Configuration
 * 
 * Centralized list of states/markets where BakedBot operates.
 * Used for onboarding, product search, and dispensary discovery.
 */

export interface Market {
    code: string;      // State code (e.g., "IL")
    name: string;      // Full state name
    enabled: boolean;  // Whether market is active
    priority?: number; // Display order (lower = higher priority)
}

/**
 * List of available markets for BakedBot
 * Based on states with legal recreational/medical cannabis
 */
export const AVAILABLE_MARKETS: Market[] = [
    // Priority markets (most active)
    { code: 'IL', name: 'Illinois', enabled: true, priority: 1 },
    { code: 'CA', name: 'California', enabled: true, priority: 2 },
    { code: 'MI', name: 'Michigan', enabled: true, priority: 3 },
    { code: 'CO', name: 'Colorado', enabled: true, priority: 4 },
    { code: 'NV', name: 'Nevada', enabled: true, priority: 5 },

    // Secondary markets
    { code: 'NY', name: 'New York', enabled: true, priority: 10 },
    { code: 'MA', name: 'Massachusetts', enabled: true, priority: 11 },
    { code: 'OH', name: 'Ohio', enabled: true, priority: 12 },
    { code: 'MO', name: 'Missouri', enabled: true, priority: 13 },
    { code: 'AZ', name: 'Arizona', enabled: true, priority: 14 },

    // Expanding markets
    { code: 'WA', name: 'Washington', enabled: true, priority: 20 },
    { code: 'OR', name: 'Oregon', enabled: true, priority: 21 },
    { code: 'ME', name: 'Maine', enabled: true, priority: 22 },
    { code: 'VT', name: 'Vermont', enabled: true, priority: 23 },
    { code: 'CT', name: 'Connecticut', enabled: true, priority: 24 },
    { code: 'NJ', name: 'New Jersey', enabled: true, priority: 25 },
    { code: 'MD', name: 'Maryland', enabled: true, priority: 26 },
    { code: 'VA', name: 'Virginia', enabled: true, priority: 27 },
    { code: 'NM', name: 'New Mexico', enabled: true, priority: 28 },
    { code: 'MN', name: 'Minnesota', enabled: true, priority: 29 },

    // Emerging markets (AL/MS)
    { code: 'AL', name: 'Alabama', enabled: true, priority: 30 },
    { code: 'MS', name: 'Mississippi', enabled: true, priority: 31 },
];

/**
 * Get enabled markets sorted by priority
 */
export function getEnabledMarkets(): Market[] {
    return AVAILABLE_MARKETS
        .filter(m => m.enabled)
        .sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

/**
 * Get a market by code
 */
export function getMarketByCode(code: string): Market | undefined {
    return AVAILABLE_MARKETS.find(m => m.code.toUpperCase() === code.toUpperCase());
}

/**
 * Check if a market code is valid and enabled
 */
export function isValidMarket(code: string): boolean {
    const market = getMarketByCode(code);
    return !!market && market.enabled;
}

/**
 * Get market options for select/dropdown components
 */
export function getMarketOptions(): { value: string; label: string }[] {
    return getEnabledMarkets().map(m => ({
        value: m.code,
        label: `${m.name} (${m.code})`
    }));
}
