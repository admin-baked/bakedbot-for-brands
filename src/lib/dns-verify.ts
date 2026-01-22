/**
 * DNS Verification Utilities (Server-only)
 *
 * Provides DNS record verification for custom domain setup.
 * Supports TXT record verification for domain ownership proof,
 * CNAME verification for subdomain routing, and NS verification
 * for full domain delegation.
 *
 * NOTE: This file uses Node.js 'dns/promises' and should only be
 * imported by server-side code. For client-safe utilities, use dns-utils.ts
 */

import dns from 'dns/promises';
import { logger } from '@/lib/logger';

// Re-export client-safe utilities for convenience
export {
    BAKEDBOT_NAMESERVERS,
    BAKEDBOT_CNAME_TARGET,
    VERIFICATION_TXT_PREFIX,
    generateVerificationToken,
    getVerificationTxtHost,
    isValidDomain,
    isSubdomain,
    getRootDomain,
} from './dns-utils';

/**
 * Verify domain ownership via DNS TXT record
 * @param domain - The domain to verify
 * @param expectedToken - The verification token to look for
 * @returns True if verification token found in DNS
 */
export async function verifyDomainTXT(
    domain: string,
    expectedToken: string
): Promise<{ success: boolean; error?: string }> {
    const { getVerificationTxtHost } = await import('./dns-utils');
    const txtHost = getVerificationTxtHost(domain);

    try {
        logger.info('[DNS] Verifying TXT record', { host: txtHost, token: expectedToken.substring(0, 20) });

        const records = await dns.resolveTxt(txtHost);

        // TXT records come as arrays of strings (chunks), flatten them
        const allRecords = records.flat().map(r => r.trim());

        if (allRecords.includes(expectedToken)) {
            logger.info('[DNS] TXT verification successful', { domain });
            return { success: true };
        }

        logger.warn('[DNS] TXT record not found', {
            domain,
            expected: expectedToken.substring(0, 20),
            found: allRecords.length > 0 ? allRecords.join(', ').substring(0, 50) : 'none',
        });

        return {
            success: false,
            error: 'Verification token not found in TXT records',
        };
    } catch (error) {
        const err = error as NodeJS.ErrnoException;

        // ENOTFOUND or ENODATA means no record exists
        if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            logger.info('[DNS] No TXT record found', { domain, host: txtHost });
            return {
                success: false,
                error: `No TXT record found at ${txtHost}`,
            };
        }

        logger.error('[DNS] TXT verification error', { domain, error: err.message });
        return {
            success: false,
            error: `DNS lookup failed: ${err.message}`,
        };
    }
}

/**
 * Verify CNAME record points to BakedBot
 * @param domain - The subdomain to verify (e.g., "shop.mybrand.com")
 * @returns True if CNAME points to bakedbot.ai
 */
export async function verifyCNAME(
    domain: string
): Promise<{ success: boolean; target?: string; error?: string }> {
    const { BAKEDBOT_CNAME_TARGET } = await import('./dns-utils');

    try {
        logger.info('[DNS] Verifying CNAME record', { domain });

        const records = await dns.resolveCname(domain);

        if (records.length === 0) {
            return {
                success: false,
                error: 'No CNAME record found',
            };
        }

        const target = records[0].toLowerCase();

        // Check if it points to our CNAME target
        if (target === BAKEDBOT_CNAME_TARGET || target.endsWith('.bakedbot.ai')) {
            logger.info('[DNS] CNAME verification successful', { domain, target });
            return { success: true, target };
        }

        logger.warn('[DNS] CNAME points to wrong target', { domain, expected: BAKEDBOT_CNAME_TARGET, actual: target });
        return {
            success: false,
            target,
            error: `CNAME points to ${target}, expected ${BAKEDBOT_CNAME_TARGET}`,
        };
    } catch (error) {
        const err = error as NodeJS.ErrnoException;

        if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            // No CNAME might mean it's an A record or doesn't exist
            logger.info('[DNS] No CNAME record found', { domain });
            return {
                success: false,
                error: 'No CNAME record found for this domain',
            };
        }

        logger.error('[DNS] CNAME verification error', { domain, error: err.message });
        return {
            success: false,
            error: `DNS lookup failed: ${err.message}`,
        };
    }
}

/**
 * Verify nameservers are set to BakedBot's nameservers
 * @param domain - The domain to verify (e.g., "mybrandmenu.com")
 * @returns True if nameservers are set to BakedBot's NS
 */
export async function verifyNameservers(
    domain: string
): Promise<{ success: boolean; nameservers?: string[]; error?: string }> {
    const { BAKEDBOT_NAMESERVERS } = await import('./dns-utils');

    try {
        logger.info('[DNS] Verifying nameservers', { domain });

        const records = await dns.resolveNs(domain);

        if (records.length === 0) {
            return {
                success: false,
                error: 'No nameserver records found',
            };
        }

        const lowerRecords = records.map(r => r.toLowerCase());
        const expectedLower = BAKEDBOT_NAMESERVERS.map(ns => ns.toLowerCase());

        // Check if all expected nameservers are present
        const allPresent = expectedLower.every(expected =>
            lowerRecords.some(actual => actual === expected || actual === `${expected}.`)
        );

        if (allPresent) {
            logger.info('[DNS] Nameserver verification successful', { domain, nameservers: records });
            return { success: true, nameservers: records };
        }

        logger.warn('[DNS] Nameservers not matching', {
            domain,
            expected: BAKEDBOT_NAMESERVERS,
            actual: records,
        });

        return {
            success: false,
            nameservers: records,
            error: `Nameservers are not set to BakedBot's nameservers`,
        };
    } catch (error) {
        const err = error as NodeJS.ErrnoException;

        logger.error('[DNS] Nameserver verification error', { domain, error: err.message });
        return {
            success: false,
            error: `DNS lookup failed: ${err.message}`,
        };
    }
}

/**
 * Check if a domain resolves (has any DNS record)
 * @param domain - The domain to check
 * @returns True if domain has DNS records
 */
export async function domainExists(domain: string): Promise<boolean> {
    try {
        // Try to resolve any record type
        await dns.resolve(domain);
        return true;
    } catch {
        try {
            // Fallback to A record check
            await dns.resolve4(domain);
            return true;
        } catch {
            return false;
        }
    }
}
