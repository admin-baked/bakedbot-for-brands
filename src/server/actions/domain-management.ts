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
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type {
    CustomDomainConfig,
    DomainMapping,
    DomainConnectionType,
    DomainVerificationStatus,
    DomainTargetType,
    DomainRoutingConfig,
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
 * Add a custom domain to a tenant (unified: supports menu, vibe_site, hybrid)
 * Generates verification token and stores pending domain config
 */
export async function addCustomDomain(
    tenantId: string,
    domain: string,
    connectionType?: DomainConnectionType,
    targetType: DomainTargetType = 'menu',
    targetId?: string,
    targetName?: string,
    routingConfig?: DomainRoutingConfig,
    userId?: string
): Promise<DomainOperationResult & { config?: Omit<CustomDomainConfig, 'createdAt' | 'updatedAt'> }> {
    try {
        // Validate tenant ID
        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
            logger.error('[Domain] Invalid tenant ID provided', { tenantId });
            return {
                success: false,
                error: 'Invalid account. Please log out and log back in.',
            };
        }

        // Validate domain input
        if (!domain || typeof domain !== 'string' || domain.trim() === '') {
            return {
                success: false,
                error: 'Please enter a domain name.',
            };
        }

        // Validate target configuration
        if (targetType === 'vibe_site' && !targetId) {
            return {
                success: false,
                error: 'Please select a Vibe Builder project for this domain.',
            };
        }

        // Validate domain format
        const normalizedDomain = domain.toLowerCase().trim();
        if (!isValidDomain(normalizedDomain)) {
            return {
                success: false,
                error: 'Invalid domain format. Please enter a valid domain name (e.g., shop.yourbrand.com or yourbrand.com).',
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
            targetType,
            ...(targetId ? { targetId } : {}),
            ...(targetName ? { targetName } : {}),
            ...(routingConfig ? { routingConfig } : {}),
            verificationStatus: 'pending' as const,
            verificationToken,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            ...(detectedType === 'nameserver' ? { nameserversAssigned: BAKEDBOT_NAMESERVERS } : {}),
        };

        // Save to tenant's domains subcollection (unified multi-domain)
        await firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('domains')
            .doc(normalizedDomain)
            .set(domainConfigForDb);

        // Also save to legacy customDomain field for backwards compat (menu only)
        if (targetType === 'menu') {
            await firestore
                .collection('tenants')
                .doc(tenantId)
                .set({
                    customDomain: domainConfigForDb,
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
        }

        logger.info('[Domain] Added custom domain', {
            tenantId,
            domain: normalizedDomain,
            connectionType: detectedType,
            targetType,
            targetId,
        });

        // Return a client-safe version (without FieldValue which can't be serialized)
        const responseConfig: Omit<CustomDomainConfig, 'createdAt' | 'updatedAt'> = {
            domain: normalizedDomain,
            connectionType: detectedType,
            targetType,
            ...(targetId ? { targetId } : {}),
            ...(targetName ? { targetName } : {}),
            ...(routingConfig ? { routingConfig } : {}),
            verificationStatus: 'pending',
            verificationToken,
            ...(detectedType === 'nameserver' ? { nameserversAssigned: BAKEDBOT_NAMESERVERS } : {}),
        };

        return {
            success: true,
            config: responseConfig,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('[Domain] Failed to add custom domain', {
            tenantId,
            domain,
            error: errorMessage,
            stack: errorStack,
        });
        return {
            success: false,
            error: `Failed to add domain: ${errorMessage}`,
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

        // Create domain mapping for fast lookups (include target info)
        const mapping: Record<string, unknown> = {
            domain,
            tenantId,
            connectionType,
            targetType: domainConfig.targetType || 'menu',
            verifiedAt: now,
        };

        // Include target-specific fields
        if (domainConfig.targetId) {
            mapping.targetId = domainConfig.targetId;
        }
        if (domainConfig.targetName) {
            mapping.targetName = domainConfig.targetName;
        }
        if (domainConfig.routingConfig) {
            mapping.routingConfig = domainConfig.routingConfig;
        }

        await firestore.collection('domain_mappings').doc(domain).set(mapping);

        // Also update the tenant's domains subcollection
        await firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('domains')
            .doc(domain)
            .update({
                verificationStatus: 'verified',
                verifiedAt: now,
                lastCheckAt: now,
                updatedAt: now,
                sslStatus: 'pending',
            });

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

// ============================================================================
// Unified Domain Management Actions
// ============================================================================

/** Serializable domain info for client components */
export interface DomainListItem {
    domain: string;
    connectionType: DomainConnectionType;
    targetType: DomainTargetType;
    targetId?: string;
    targetName?: string;
    routingConfig?: DomainRoutingConfig;
    verificationStatus: DomainVerificationStatus;
    sslStatus?: string;
    createdAt?: string;
    verifiedAt?: string;
}

/**
 * List all domains for a tenant (unified view)
 */
export async function listDomains(
    tenantId: string
): Promise<DomainOperationResult & { domains?: DomainListItem[] }> {
    try {
        const { firestore } = await createServerClient();

        // Get domains from subcollection
        const domainsSnapshot = await firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('domains')
            .orderBy('createdAt', 'desc')
            .get();

        const domains: DomainListItem[] = [];

        domainsSnapshot.forEach((doc) => {
            const data = doc.data();
            domains.push({
                domain: data.domain || doc.id,
                connectionType: data.connectionType || 'cname',
                targetType: data.targetType || 'menu',
                targetId: data.targetId,
                targetName: data.targetName,
                routingConfig: data.routingConfig,
                verificationStatus: data.verificationStatus || 'pending',
                sslStatus: data.sslStatus,
                createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt,
                verifiedAt: data.verifiedAt?.toDate?.()?.toISOString?.() || data.verifiedAt,
            });
        });

        // Also check legacy customDomain field for backwards compatibility
        if (domains.length === 0) {
            const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
            const tenant = tenantDoc.data();
            if (tenant?.customDomain?.domain) {
                domains.push({
                    domain: tenant.customDomain.domain,
                    connectionType: tenant.customDomain.connectionType || 'cname',
                    targetType: tenant.customDomain.targetType || 'menu',
                    targetId: tenant.customDomain.targetId,
                    targetName: tenant.customDomain.targetName,
                    verificationStatus: tenant.customDomain.verificationStatus || 'pending',
                    sslStatus: tenant.customDomain.sslStatus,
                    createdAt: tenant.customDomain.createdAt?.toDate?.()?.toISOString?.(),
                    verifiedAt: tenant.customDomain.verifiedAt?.toDate?.()?.toISOString?.(),
                });
            }
        }

        return { success: true, domains };
    } catch (error) {
        logger.error('[Domain] Failed to list domains', { tenantId, error });
        return {
            success: false,
            error: 'Failed to list domains.',
        };
    }
}

/**
 * Update domain target (switch from menu to vibe site, etc.)
 */
export async function updateDomainTarget(
    tenantId: string,
    domain: string,
    newTarget: {
        targetType: DomainTargetType;
        targetId?: string;
        targetName?: string;
        routingConfig?: DomainRoutingConfig;
    }
): Promise<DomainOperationResult> {
    try {
        const { firestore } = await createServerClient();
        const normalizedDomain = domain.toLowerCase().trim();

        // Validate target
        if (newTarget.targetType === 'vibe_site' && !newTarget.targetId) {
            return {
                success: false,
                error: 'Please select a Vibe Builder project.',
            };
        }

        const updateData: Record<string, unknown> = {
            targetType: newTarget.targetType,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (newTarget.targetId) {
            updateData.targetId = newTarget.targetId;
        }
        if (newTarget.targetName) {
            updateData.targetName = newTarget.targetName;
        }
        if (newTarget.routingConfig) {
            updateData.routingConfig = newTarget.routingConfig;
        }

        // Update in domains subcollection
        await firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('domains')
            .doc(normalizedDomain)
            .update(updateData);

        // Update domain mapping if it exists (already verified)
        const mappingDoc = await firestore
            .collection('domain_mappings')
            .doc(normalizedDomain)
            .get();

        if (mappingDoc.exists) {
            await firestore
                .collection('domain_mappings')
                .doc(normalizedDomain)
                .update(updateData);
        }

        logger.info('[Domain] Updated domain target', {
            tenantId,
            domain: normalizedDomain,
            targetType: newTarget.targetType,
            targetId: newTarget.targetId,
        });

        return { success: true };
    } catch (error) {
        logger.error('[Domain] Failed to update domain target', { tenantId, domain, error });
        return {
            success: false,
            error: 'Failed to update domain target.',
        };
    }
}

/**
 * Get full domain mapping by hostname (for middleware routing)
 * Returns target info so middleware knows what content to serve
 */
export async function getDomainMapping(
    domain: string
): Promise<DomainMapping | null> {
    try {
        const { firestore } = await createServerClient();

        const mappingDoc = await firestore
            .collection('domain_mappings')
            .doc(domain.toLowerCase())
            .get();

        if (!mappingDoc.exists) {
            return null;
        }

        return mappingDoc.data() as DomainMapping;
    } catch (error) {
        logger.error('[Domain] Failed to get domain mapping', { domain, error });
        return null;
    }
}

/**
 * Remove a specific domain from a tenant (unified)
 * Supports multi-domain tenants
 */
export async function removeDomain(
    tenantId: string,
    domain: string
): Promise<DomainOperationResult> {
    try {
        const { firestore } = await createServerClient();
        const normalizedDomain = domain.toLowerCase().trim();

        // Remove from domain_mappings
        await firestore.collection('domain_mappings').doc(normalizedDomain).delete();

        // Remove from tenant's domains subcollection
        await firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('domains')
            .doc(normalizedDomain)
            .delete();

        // Also check and remove legacy customDomain field if it matches
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
        const tenant = tenantDoc.data();
        if (tenant?.customDomain?.domain === normalizedDomain) {
            await firestore.collection('tenants').doc(tenantId).update({
                customDomain: FieldValue.delete(),
            });
        }

        logger.info('[Domain] Domain removed (unified)', { tenantId, domain: normalizedDomain });

        return { success: true };
    } catch (error) {
        logger.error('[Domain] Failed to remove domain', { tenantId, domain, error });
        return {
            success: false,
            error: 'Failed to remove domain.',
        };
    }
}
