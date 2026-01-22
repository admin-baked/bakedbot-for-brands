/**
 * DNS Utility Functions (Client-safe)
 *
 * Pure utility functions for DNS configuration that don't require
 * Node.js modules. These can be safely imported by client components.
 *
 * For server-side DNS verification (using dns/promises), see dns-verify.ts
 */

/** BakedBot nameservers (for nameserver method) */
export const BAKEDBOT_NAMESERVERS = [
    'ns1.bakedbot.ai',
    'ns2.bakedbot.ai',
];

/** CNAME target for subdomain routing */
export const BAKEDBOT_CNAME_TARGET = 'cname.bakedbot.ai';

/** Prefix for TXT verification records */
export const VERIFICATION_TXT_PREFIX = '_bakedbot';

/**
 * Generate a verification token for domain ownership proof
 */
export function generateVerificationToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `bb_verify_${timestamp}_${random}`;
}

/**
 * Get the TXT record host for verification
 * @param domain - The domain being verified (e.g., "shop.mybrand.com")
 * @returns The TXT record host (e.g., "_bakedbot.shop.mybrand.com")
 */
export function getVerificationTxtHost(domain: string): string {
    return `${VERIFICATION_TXT_PREFIX}.${domain}`;
}

/**
 * Validate domain format
 * @param domain - The domain to validate
 * @returns True if domain format is valid
 */
export function isValidDomain(domain: string): boolean {
    // Basic domain validation regex
    const domainRegex = /^(?!-)([a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Check if domain is a subdomain (e.g., "shop.mybrand.com" vs "mybrand.com")
 * @param domain - The domain to check
 * @returns True if domain has more than one dot (subdomain)
 */
export function isSubdomain(domain: string): boolean {
    const parts = domain.split('.');
    return parts.length > 2;
}

/**
 * Extract the root domain from a subdomain
 * @param domain - The domain (e.g., "shop.mybrand.com")
 * @returns The root domain (e.g., "mybrand.com")
 */
export function getRootDomain(domain: string): string {
    const parts = domain.split('.');
    if (parts.length <= 2) {
        return domain;
    }
    return parts.slice(-2).join('.');
}

/**
 * Get DNS setup instructions for a domain
 * This is a pure utility function (no async operations) that generates
 * the DNS record configuration instructions for domain verification.
 */
export function getDNSInstructions(
    domain: string,
    verificationToken: string,
    connectionType: 'cname' | 'nameserver'
): {
    txtRecord: { host: string; value: string };
    connectionRecord: { type: string; host: string; value: string | string[] };
} {
    if (connectionType === 'cname') {
        // Extract subdomain part
        const parts = domain.split('.');
        const subdomain = parts.length > 2 ? parts[0] : 'shop';

        return {
            txtRecord: {
                host: `_bakedbot.${domain}`,
                value: verificationToken,
            },
            connectionRecord: {
                type: 'CNAME',
                host: subdomain,
                value: BAKEDBOT_CNAME_TARGET,
            },
        };
    } else {
        return {
            txtRecord: {
                host: `_bakedbot.${domain}`,
                value: verificationToken,
            },
            connectionRecord: {
                type: 'NS (Nameservers)',
                host: '@',
                value: BAKEDBOT_NAMESERVERS,
            },
        };
    }
}
