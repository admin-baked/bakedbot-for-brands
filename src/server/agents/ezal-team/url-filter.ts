/**
 * URL Filter Module for Ezal Competitive Intelligence
 *
 * Filters out non-dispensary URLs (blogs, Reddit, news, social media)
 * and validates URLs for the competitive intelligence pipeline.
 */

// =============================================================================
// BLOCKED DOMAINS - Sites that should never be returned as dispensary results
// =============================================================================

const BLOCKED_DOMAINS = new Set([
    // Social Media
    'reddit.com',
    'twitter.com',
    'x.com',
    'facebook.com',
    'instagram.com',
    'tiktok.com',
    'linkedin.com',
    'pinterest.com',
    'youtube.com',
    'threads.net',

    // Blogs & Content Platforms
    'medium.com',
    'wordpress.com',
    'blogger.com',
    'substack.com',
    'tumblr.com',
    'wix.com',
    'squarespace.com',
    'ghost.io',

    // News & Media
    'forbes.com',
    'businessinsider.com',
    'cnbc.com',
    'bloomberg.com',
    'washingtonpost.com',
    'nytimes.com',
    'usatoday.com',
    'cnn.com',
    'foxnews.com',
    'vice.com',
    'buzzfeed.com',
    'huffpost.com',

    // Cannabis News (not dispensaries)
    'hightimes.com',
    'leafly.com/news',
    'weedmaps.com/news',
    'cannabisnow.com',
    'ganjapreneur.com',
    'mjbizdaily.com',
    'marijuana.com',
    'thefreshtoast.com',
    'greenentrepreneur.com',
    'canneconomy.com',
    'benzinga.com',

    // Review Sites
    'yelp.com',
    'tripadvisor.com',
    'google.com/maps',
    'maps.google.com',
    'bbb.org',
    'trustpilot.com',

    // Other Non-Dispensary
    'wikipedia.org',
    'quora.com',
    'wikihow.com',
    'amazon.com',
    'ebay.com',
    'craigslist.org',
    'indeed.com',
    'glassdoor.com',
    'gov',
]);

// =============================================================================
// DISPENSARY PLATFORMS - Known platforms hosting dispensary menus
// =============================================================================

const DISPENSARY_PLATFORMS = new Set([
    'dutchie.com',
    'iheartjane.com',
    'jane.co',
    'weedmaps.com',
    'leafly.com',
    'meadow.com',
    'treez.io',
    'flowhub.com',
    'springbig.com',
    'blaze.me',
    'greenline.io',
    'buddi.io',
    'dispense.io',
    'cova.com',
    'greenscreen.io',
    'tymber.io',
    'indica.io',
    'sweed.io',
    'getgreenline.co',
    'onfleet.com',
    'cannveya.com',
    'posabit.com',
    'biotrack.com',
    'metrc.com',
    'canix.com',
]);

// =============================================================================
// PATH PATTERNS - URL paths that indicate non-dispensary content
// =============================================================================

const BLOCKED_PATH_PATTERNS = [
    /\/news\//i,
    /\/blog\//i,
    /\/article\//i,
    /\/stories\//i,
    /\/community\//i,
    /\/forum\//i,
    /\/thread\//i,
    /\/discussion\//i,
    /\/comments\//i,
    /\/reviews?\//i,
    /\/about\/?$/i,
    /\/contact\/?$/i,
    /\/careers?\/?$/i,
    /\/jobs?\/?$/i,
    /\/press\/?$/i,
    /\/media\/?$/i,
    /\/learn\//i,
    /\/guide\//i,
    /\/how-to\//i,
    /\/best-of\//i,
    /\/top-\d+/i,
    /\/list\//i,
    /\/ranking\//i,
];

// =============================================================================
// TYPES
// =============================================================================

export interface UrlFilterOptions {
    /** Allow generic chain landing pages (e.g., medmen.com vs medmen.com/stores/la) */
    allowChainPages?: boolean;
    /** Minimum confidence score (0-1) to accept URL */
    minConfidence?: number;
    /** Additional domains to block for this request */
    additionalBlockedDomains?: string[];
}

export interface UrlFilterResult {
    allowed: boolean;
    reason?: string;
    confidence: number;
    normalizedUrl: string;
    isPlatform: boolean;
}

export interface FilteredUrlResult {
    url: string;
    normalizedUrl: string;
    confidence: number;
    isPlatform: boolean;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Extract the display-friendly domain from a URL
 */
export function extractDisplayDomain(url: string): string {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

/**
 * Check if a URL is from a known dispensary platform
 */
export function isDispensaryPlatform(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        // Check if domain or parent domain is a platform
        for (const platform of Array.from(DISPENSARY_PLATFORMS)) {
            if (hostname === platform || hostname.endsWith('.' + platform)) {
                return true;
            }
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Check if a domain is in the blocked list
 */
function isBlockedDomain(hostname: string, additionalBlocked: string[] = []): boolean {
    const cleanHost = hostname.replace(/^www\./, '').toLowerCase();

    // Check main blocked list
    for (const blocked of Array.from(BLOCKED_DOMAINS)) {
        if (cleanHost === blocked || cleanHost.endsWith('.' + blocked)) {
            return true;
        }
    }

    // Check additional blocked domains
    for (const blocked of additionalBlocked) {
        const cleanBlocked = blocked.replace(/^www\./, '').toLowerCase();
        if (cleanHost === cleanBlocked || cleanHost.endsWith('.' + cleanBlocked)) {
            return true;
        }
    }

    return false;
}

/**
 * Check if URL path matches blocked patterns
 */
function hasBlockedPath(pathname: string): boolean {
    for (const pattern of BLOCKED_PATH_PATTERNS) {
        if (pattern.test(pathname)) {
            return true;
        }
    }
    return false;
}

/**
 * Filter a single URL and return detailed result
 */
export function filterUrl(url: string, options: UrlFilterOptions = {}): UrlFilterResult {
    const {
        allowChainPages = false,
        minConfidence = 0.5,
        additionalBlockedDomains = [],
    } = options;

    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
        const pathname = parsed.pathname.toLowerCase();

        // Normalize URL
        const normalizedUrl = `${parsed.protocol}//${hostname}${parsed.pathname}${parsed.search}`;
        const isPlatform = isDispensaryPlatform(url);

        // Check blocked domains
        if (isBlockedDomain(hostname, additionalBlockedDomains)) {
            return {
                allowed: false,
                reason: `Blocked domain: ${hostname}`,
                confidence: 0,
                normalizedUrl,
                isPlatform,
            };
        }

        // Check blocked path patterns
        if (hasBlockedPath(pathname)) {
            return {
                allowed: false,
                reason: `Blocked path pattern: ${pathname}`,
                confidence: 0,
                normalizedUrl,
                isPlatform,
            };
        }

        // Check for chain landing pages (no store-specific path)
        if (!allowChainPages && !isPlatform) {
            // If URL is just domain root or generic page, might be chain landing page
            if (pathname === '/' || pathname === '' || pathname === '/locations' || pathname === '/stores') {
                // Lower confidence but still allow
                return {
                    allowed: true,
                    reason: 'Possible chain landing page',
                    confidence: 0.4,
                    normalizedUrl,
                    isPlatform,
                };
            }
        }

        // Calculate confidence based on URL characteristics
        let confidence = 0.7; // Base confidence

        // Boost for known platforms
        if (isPlatform) {
            confidence += 0.2;
        }

        // Boost for menu/shop/store paths
        if (/\/(menu|shop|store|order|products)/i.test(pathname)) {
            confidence += 0.15;
        }

        // Boost for dispensary-specific paths
        if (/\/(dispensar|cannabis|marijuana)/i.test(pathname)) {
            confidence += 0.1;
        }

        // Slight reduction for very long paths (might be blog/article)
        if (pathname.split('/').length > 5) {
            confidence -= 0.1;
        }

        // Clamp confidence
        confidence = Math.max(0, Math.min(1, confidence));

        // Check against minimum confidence
        if (confidence < minConfidence) {
            return {
                allowed: false,
                reason: `Low confidence: ${confidence.toFixed(2)} < ${minConfidence}`,
                confidence,
                normalizedUrl,
                isPlatform,
            };
        }

        return {
            allowed: true,
            confidence,
            normalizedUrl,
            isPlatform,
        };
    } catch (e) {
        return {
            allowed: false,
            reason: `Invalid URL: ${(e as Error).message}`,
            confidence: 0,
            normalizedUrl: url,
            isPlatform: false,
        };
    }
}

/**
 * Filter multiple URLs and return allowed/blocked lists
 */
export function filterUrls(
    urls: string[],
    options: UrlFilterOptions = {}
): {
    allowed: FilteredUrlResult[];
    blocked: Array<{ url: string; reason: string }>;
} {
    const allowed: FilteredUrlResult[] = [];
    const blocked: Array<{ url: string; reason: string }> = [];

    for (const url of urls) {
        const result = filterUrl(url, options);

        if (result.allowed) {
            allowed.push({
                url,
                normalizedUrl: result.normalizedUrl,
                confidence: result.confidence,
                isPlatform: result.isPlatform,
            });
        } else {
            blocked.push({
                url,
                reason: result.reason || 'Unknown',
            });
        }
    }

    // Sort allowed by confidence (highest first)
    allowed.sort((a, b) => b.confidence - a.confidence);

    return { allowed, blocked };
}
