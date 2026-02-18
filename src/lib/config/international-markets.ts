/**
 * International Markets Configuration
 * Defines markets outside the US (Thailand, etc.)
 * Separate from domestic US markets which use ZIP codes
 */

export interface InternationalMarket {
    /** Unique market ID: "{country}_{city-slug}" e.g. "thailand_koh-samui" */
    id: string;
    /** Country code (lowercase): "thailand", "vietnam", etc. */
    country: string;
    /** Country name for display: "Thailand" */
    countryName: string;
    /** City code (lowercase): "koh-samui" */
    city: string;
    /** City name for display: "Koh Samui" */
    cityName: string;
    /** Currency code: "THB", "VND", "USD" */
    currency: string;
    /** Currency symbol for display: "฿", "₫", "$" */
    currencySymbol: string;
    /** Locale for i18n: "en-TH", "en-VN", "en-US" */
    locale: string;
    /** Center latitude for discovery radius calculations */
    lat: number;
    /** Center longitude */
    lng: number;
    /** Discovery radius in kilometers (not miles) */
    radiusKm: number;
    /** Whether this market is active */
    enabled: boolean;
    /** Priority for daily discovery (lower = first) */
    priority: number;
    /** Search queries for RTRVR Google Maps scraping */
    searchTerms: string[];
    /** Description for market landing page */
    description?: string;
    /** Image URL for market preview */
    imageUrl?: string;
}

/**
 * Available international markets
 * Phase 1: Thailand (Koh Samui pilot)
 * Phase 2: More Thai cities, Vietnam, Cambodia
 */
export const INTERNATIONAL_MARKETS: InternationalMarket[] = [
    {
        id: 'thailand_koh-samui',
        country: 'thailand',
        countryName: 'Thailand',
        city: 'koh-samui',
        cityName: 'Koh Samui',
        currency: 'THB',
        currencySymbol: '฿',
        locale: 'en-TH',
        lat: 9.5120,
        lng: 100.0136,
        radiusKm: 20,
        enabled: true,
        priority: 1,
        searchTerms: [
            'cannabis dispensary Koh Samui Thailand',
            'weed shop Koh Samui',
            'marijuana dispensary Koh Samui',
            'cannabis store Samui',
            'dispensary Koh Samui tourist',
        ],
        description: 'Explore cannabis dispensaries and products in Koh Samui, Thailand',
        imageUrl: '/images/destinations/koh-samui.jpg',
    },
];

/**
 * Get a single market by country and city
 * Returns undefined if not found
 */
export function getInternationalMarket(
    country: string,
    city: string
): InternationalMarket | undefined {
    return INTERNATIONAL_MARKETS.find(
        m => m.country.toLowerCase() === country.toLowerCase() &&
             m.city.toLowerCase() === city.toLowerCase()
    );
}

/**
 * Get all enabled markets, sorted by priority
 */
export function getEnabledInternationalMarkets(): InternationalMarket[] {
    return INTERNATIONAL_MARKETS.filter(m => m.enabled).sort((a, b) => a.priority - b.priority);
}

/**
 * Get all markets (enabled or disabled)
 */
export function getAllInternationalMarkets(): InternationalMarket[] {
    return INTERNATIONAL_MARKETS;
}

/**
 * Get markets by country
 */
export function getMarketsByCountry(country: string): InternationalMarket[] {
    return INTERNATIONAL_MARKETS.filter(
        m => m.country.toLowerCase() === country.toLowerCase()
    );
}

/**
 * Check if a market exists and is enabled
 */
export function isMarketEnabled(country: string, city: string): boolean {
    const market = getInternationalMarket(country, city);
    return market?.enabled ?? false;
}
