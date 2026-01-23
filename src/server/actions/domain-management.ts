'use server';

/**
 * Domain Management Server Actions
 *
 * Server actions for managing custom domains:
 * - Add/register a custom domain
 * - Verify domain ownership via DNS
 * - Remove custom domain
 * - Get domain status
 */

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from '@google-cloud/firestore';
import { logger } from '@/lib/logger';
import type {
    CustomDomainConfig,
    DomainMapping,
    DomainConnectionType,
    DomainVerificationStatus,
} from '@/types/tenant';
import {
    generateVerificationToken,
    verifyDomainTXT,
    verifyCNAME,
    verifyNameservers,
    isValidDomain,
    isSubdomain,
    BAKEDBOT_NAMESERVERS,
} from '@/lib/dns-verify';

/** Result type for domain operations */
interface DomainOperationResult {
    success: boolean;
    error?: string;
    data?: unknown;
}

/**
 * Add a custom domain to a tenant
 * Generates verification token and stores pending domain config
 */
export async function addCustomDomain(
    tenantId: string,
    domain: string,
    connectionType?: DomainConnectionType
): Promise<DomainOperationResult & { config?: Omit<CustomDomainConfig, 'createdAt' | 'updatedAt'> }> {
    try {
        // Validate domain format
        const normalizedDomain = domain.toLowerCase().trim();
        if (!isValidDomain(normalizedDomain)) {
            return {
                success: false,
                error: 'Invalid domain format. Please enter a valid domain name.',
            };
        }

        // Auto-detect connection type if not specified
        const detectedType: DomainConnectionType = connectionType ||
            (isSubdomain(normalizedDomain) ? 'cname' : 'nameserver');

        const { firestore } = await createServerClient();

        // Check if domain is already registered by another tenant
        const existingMapping = await firestore
            .collection('domain_mappings')
            .doc(normalizedDomain)
            .get();

        if (existingMapping.exists) {
            const mappingData = existingMapping.data() as DomainMapping;
            if (mappingData.tenantId !== tenantId) {
                return {
                    success: false,
                    error: 'This domain is already registered to another account.',
                };
            }
        }

        // Generate verification token
        const verificationToken = generateVerificationToken();

        // Create domain config for Firestore (with FieldValue for timestamps)
        const domainConfigForDb = {
            domain: normalizedDomain,
            connectionType: detectedType,
            verificationStatus: 'pending' as const,
            verificationToken,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            ...(detectedType === 'nameserver' ? { nameserversAssigned: BAKEDBOT_NAMESERVERS } : {}),
        };

        // Save to tenant document (use set with merge to create if not exists)
        await firestore
            .collection('tenants')
            .doc(tenantId)
            .set({
                customDomain: domainConfigForDb,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

        logger.info('[Domain] Added custom domain', {
            tenantId,
            domain: normalizedDomain,
            connectionType: detectedType,
        });

        // Return a client-safe version (without FieldValue which can't be serialized)
        const responseConfig: Omit<CustomDomainConfig, 'createdAt' | 'updatedAt'> = {
            domain: normalizedDomain,
            connectionType: detectedType,
            verificationStatus: 'pending',
            verificationToken,
            ...(detectedType === 'nameserver' ? { nameserversAssigned: BAKEDBOT_NAMESERVERS } : {}),
        };

        return {
            success: true,
            config: responseConfig,
        };
    } catch (error) {
        logger.error('[Domain] Failed to add custom domain', { tenantId, domain, error });
        return {
            success: false,
            error: 'Failed to add domain. Please try again.',
        };
    }
}

/**
 * Verify domain ownership via DNS
 * Checks TXT record and connection-specific records (CNAME or NS)
 */
export async function verifyCustomDomain(tenantId: string): Promise<DomainOperationResult> {
    try {
        const { firestore } = await createServerClient();

        // Get tenant's domain config
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            return { success: false, error: 'Tenant not found.' };
        }

        const tenant = tenantDoc.data();
        const domainConfig = tenant?.customDomain as CustomDomainConfig | undefined;

        if (!domainConfig?.domain) {
            return { success: false, error: 'No domain configured for this account.' };
        }

        const { domain, verificationToken, connectionType } = domainConfig;

        // Step 1: Verify TXT record for ownership proof
        const txtResult = await verifyDomainTXT(domain, verificationToken);
        if (!txtResult.success) {
            // Update last check timestamp
            await firestore.collection('tenants').doc(tenantId).update({
                'customDomain.lastCheckAt': FieldValue.serverTimestamp(),
                'customDomain.verificationStatus': 'pending',
                'customDomain.verificationError': txtResult.error,
            });

            return {
                success: false,
                error: txtResult.error || 'TXT record verification failed.',
            };
        }

        // Step 2: Verify connection-specific record (CNAME or NS)
        let connectionResult: { success: boolean; error?: string };

        if (connectionType === 'cname') {
            connectionResult = await verifyCNAME(domain);
        } else {
            connectionResult = await verifyNameservers(domain);
        }

        if (!connectionResult.success) {
            await firestore.collection('tenants').doc(tenantId).update({
                'customDomain.lastCheckAt': FieldValue.serverTimestamp(),
                'customDomain.verificationStatus': 'pending',
                'customDomain.verificationError': connectionResult.error,
            });

            return {
                success: false,
                error: connectionResult.error || `${connectionType.toUpperCase()} verification failed.`,
            };
        }

        // All checks passed - mark as verified
        const now = FieldValue.serverTimestamp();

        // Update tenant document
        await firestore.collection('tenants').doc(tenantId).update({
            'customDomain.verificationStatus': 'verified',
            'customDomain.verifiedAt': now,
            'customDomain.lastCheckAt': now,
            'customDomain.verificationError': FieldValue.delete(),
            'customDomain.updatedAt': now,
            'customDomain.sslStatus': 'pending', // SSL will be provisioned
        });

        // Create domain mapping for fast lookups
        const mapping = {
            domain,
            tenantId,
            connectionType,
            verifiedAt: now,
        };

        await firestore.collection('domain_mappings').doc(domain).set(mapping);

        logger.info('[Domain] Domain verified successfully', { tenantId, domain });

        return { success: true };
    } catch (error) {
        logger.error('[Domain] Verification failed', { tenantId, error });
        return {
            success: false,
            error: 'Verification failed. Please try again.',
        };
    }
}

/**
 * Remove custom domain from tenant
 */
export async function removeCustomDomain(tenantId: string): Promise<DomainOperationResult> {
    try {
        const { firestore } = await createServerClient();

        // Get current domain config to find the domain
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
        const tenant = tenantDoc.data();
        const domain = tenant?.customDomain?.domain;

        // Remove domain mapping if exists
        if (domain) {
            await firestore.collection('domain_mappings').doc(domain).delete();
        }

        // Remove domain config from tenant
        await firestore.collection('tenants').doc(tenantId).update({
            customDomain: FieldValue.delete(),
        });

        logger.info('[Domain] Domain removed', { tenantId, domain });

        return { success: true };
    } catch (error) {
        logger.error('[Domain] Failed to remove domain', { tenantId, error });
        return {
            success: false,
            error: 'Failed to remove domain. Please try again.',
        };
    }
}

/**
 * Get domain status for a tenant
 */
export async function getDomainStatus(
    tenantId: string
): Promise<DomainOperationResult & { config?: CustomDomainConfig | null }> {
    try {
        const { firestore } = await createServerClient();

        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            return { success: false, error: 'Tenant not found.' };
        }

        const tenant = tenantDoc.data();
        const domainConfig = tenant?.customDomain as CustomDomainConfig | null;

        return {
            success: true,
            config: domainConfig || null,
        };
    } catch (error) {
        logger.error('[Domain] Failed to get domain status', { tenantId, error });
        return {
            success: false,
            error: 'Failed to get domain status.',
        };
    }
}


/**
 * Lookup tenant ID by custom domain
 * Used by middleware for hostname-based routing
 */
export async function getTenantByDomain(domain: string): Promise<string | null> {
    try {
        const { firestore } = await createServerClient();

        const mappingDoc = await firestore
            .collection('domain_mappings')
            .doc(domain.toLowerCase())
            .get();

        if (!mappingDoc.exists) {
            return null;
        }

        const mapping = mappingDoc.data() as DomainMapping;
        return mapping.tenantId;
    } catch (error) {
        logger.error('[Domain] Failed to lookup tenant by domain', { domain, error });
        return null;
    }
}
