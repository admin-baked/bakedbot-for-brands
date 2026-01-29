/**
 * State Detection Utilities
 *
 * Detects user's state from IP address or other sources.
 * Used for age gate state-aware verification.
 */

import { logger } from '@/lib/logger';

export interface StateDetectionResult {
    state: string | null; // Two-letter state code (e.g., "IL", "CA")
    city?: string;
    zipCode?: string;
    confidence: 'high' | 'medium' | 'low';
    method: 'ip' | 'header' | 'fallback';
}

/**
 * Detect state from IP address using ipapi.co (free tier: 1000/day)
 * Falls back to Cloudflare headers if available
 */
export async function detectStateFromIP(
    ipAddress?: string,
    headers?: Headers
): Promise<StateDetectionResult> {
    try {
        // Try Cloudflare geolocation headers first (fastest)
        if (headers) {
            const cfState = headers.get('cf-ipcountry');
            const cfRegion = headers.get('cf-region-code');

            if (cfRegion && cfState === 'US') {
                logger.info('[StateDetection] Detected from Cloudflare headers', {
                    state: cfRegion,
                    method: 'header'
                });

                return {
                    state: cfRegion,
                    confidence: 'high',
                    method: 'header'
                };
            }
        }

        // Fallback to IP geolocation API
        if (ipAddress && ipAddress !== '127.0.0.1' && !ipAddress.startsWith('192.168.')) {
            try {
                const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
                    headers: {
                        'User-Agent': 'BakedBot/1.0'
                    },
                    // Cache for 1 hour
                    next: { revalidate: 3600 }
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.country_code === 'US' && data.region_code) {
                        logger.info('[StateDetection] Detected from IP API', {
                            state: data.region_code,
                            city: data.city,
                            zipCode: data.postal,
                            method: 'ip'
                        });

                        return {
                            state: data.region_code,
                            city: data.city,
                            zipCode: data.postal,
                            confidence: 'medium',
                            method: 'ip'
                        };
                    }
                }
            } catch (apiError) {
                logger.warn('[StateDetection] IP API failed', {
                    error: apiError instanceof Error ? apiError.message : 'Unknown error'
                });
            }
        }

        // Fallback to default
        logger.warn('[StateDetection] Could not detect state, using fallback');
        return {
            state: null,
            confidence: 'low',
            method: 'fallback'
        };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[StateDetection] Error detecting state', {
            error: err.message
        });

        return {
            state: null,
            confidence: 'low',
            method: 'fallback'
        };
    }
}

/**
 * Get state from Next.js request headers
 * Extracts IP from x-forwarded-for or x-real-ip headers
 */
export function getIPFromHeaders(headers: Headers): string | undefined {
    // Check Cloudflare/proxy headers
    const cfConnectingIp = headers.get('cf-connecting-ip');
    if (cfConnectingIp) return cfConnectingIp;

    // Check standard proxy headers
    const xForwardedFor = headers.get('x-forwarded-for');
    if (xForwardedFor) {
        // x-forwarded-for can be a comma-separated list, take the first one
        return xForwardedFor.split(',')[0].trim();
    }

    const xRealIp = headers.get('x-real-ip');
    if (xRealIp) return xRealIp;

    return undefined;
}

/**
 * State name to code mapping (for fuzzy matching)
 */
const STATE_NAME_TO_CODE: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY'
};

/**
 * Normalize state input to two-letter code
 */
export function normalizeStateCode(input: string): string | null {
    if (!input) return null;

    const cleaned = input.trim().toUpperCase();

    // Already a two-letter code
    if (cleaned.length === 2 && /^[A-Z]{2}$/.test(cleaned)) {
        return cleaned;
    }

    // Try state name lookup
    const stateName = input.toLowerCase().trim();
    return STATE_NAME_TO_CODE[stateName] || null;
}
