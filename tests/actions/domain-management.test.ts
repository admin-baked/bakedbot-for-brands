/**
 * Tests for domain management server actions
 */

import {
    addCustomDomain,
    verifyCustomDomain,
    removeCustomDomain,
    getDomainStatus,
    getTenantByDomain,
} from '@/server/actions/domain-management';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

// Mock modules
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('@/lib/dns-verify', () => ({
    generateVerificationToken: jest.fn(() => 'bb_verify_test123456789012345678901234'),
    verifyDomainTXT: jest.fn(),
    verifyCNAME: jest.fn(),
    verifyNameservers: jest.fn(),
    isValidDomain: jest.fn((domain) => {
        // Simple validation for testing
        if (!domain || domain.includes('bakedbot.ai')) return false;
        return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
            domain.toLowerCase()
        );
    }),
    isSubdomain: jest.fn((domain) => domain.split('.').length > 2),
    getVerificationTxtHost: jest.fn((domain) => `_bakedbot.${domain}`),
    BAKEDBOT_CNAME_TARGET: 'cname.bakedbot.ai',
    BAKEDBOT_NAMESERVERS: ['ns1.bakedbot.ai', 'ns2.bakedbot.ai'],
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('domain-management', () => {
    // Mock Firestore methods
    const mockGet = jest.fn();
    const mockSet = jest.fn();
    const mockUpdate = jest.fn();
    const mockDelete = jest.fn();
    const mockDoc = jest.fn();
    const mockCollection = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'test-user',
            email: 'owner@bakedbot.ai',
            role: 'super_user',
        });

        // Setup Firestore chain
        mockDoc.mockReturnValue({
            get: mockGet,
            set: mockSet,
            update: mockUpdate,
            delete: mockDelete,
            collection: mockCollection,
        });

        mockCollection.mockReturnValue({
            doc: mockDoc,
        });

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: mockCollection,
            },
        });
    });

    describe('addCustomDomain', () => {
        it('should add a valid subdomain with CNAME connection type', async () => {
            // Mock: domain not already registered
            mockGet.mockResolvedValueOnce({ exists: false });

            // Mock: tenant update succeeds
            mockUpdate.mockResolvedValueOnce({});

            const result = await addCustomDomain('tenant-123', 'shop.mybrand.com');

            expect(result.success).toBe(true);
            expect(result.config).toBeDefined();
            expect(result.config?.domain).toBe('shop.mybrand.com');
            expect(result.config?.connectionType).toBe('cname');
            expect(result.config?.verificationStatus).toBe('pending');
            expect(result.config?.verificationToken).toBe('bb_verify_test123456789012345678901234');
        });

        it('should add a valid root domain with nameserver connection type', async () => {
            mockGet.mockResolvedValueOnce({ exists: false });
            mockUpdate.mockResolvedValueOnce({});

            const result = await addCustomDomain('tenant-123', 'mybrandmenu.com');

            expect(result.success).toBe(true);
            expect(result.config?.connectionType).toBe('nameserver');
        });

        it('should reject invalid domain format', async () => {
            const result = await addCustomDomain('tenant-123', 'invalid');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid domain format');
        });

        it('should reject bakedbot.ai domains', async () => {
            const result = await addCustomDomain('tenant-123', 'shop.bakedbot.ai');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid domain format');
        });

        it('should reject domain already registered to another tenant', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ tenantId: 'other-tenant' }),
            });

            const result = await addCustomDomain('tenant-123', 'shop.claimed.com');

            expect(result.success).toBe(false);
            expect(result.error).toContain('already registered');
        });

        it('should allow re-adding domain owned by same tenant', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ tenantId: 'tenant-123' }),
            });
            mockUpdate.mockResolvedValueOnce({});

            const result = await addCustomDomain('tenant-123', 'shop.myownbrand.com');

            expect(result.success).toBe(true);
        });

        it('should normalize domain to lowercase', async () => {
            mockGet.mockResolvedValueOnce({ exists: false });
            mockUpdate.mockResolvedValueOnce({});

            const result = await addCustomDomain('tenant-123', 'SHOP.MYBRAND.COM');

            expect(result.config?.domain).toBe('shop.mybrand.com');
        });
    });

    describe('verifyCustomDomain', () => {
        const { verifyDomainTXT, verifyCNAME, verifyNameservers } = require('@/lib/dns-verify');

        it('should verify domain with CNAME when TXT and CNAME pass', async () => {
            // Mock tenant with pending domain
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    customDomain: {
                        domain: 'shop.mybrand.com',
                        connectionType: 'cname',
                        verificationToken: 'bb_verify_abc123',
                        verificationStatus: 'pending',
                    },
                }),
            });

            verifyDomainTXT.mockResolvedValueOnce({ success: true });
            verifyCNAME.mockResolvedValueOnce({ success: true });

            mockUpdate.mockResolvedValue({});
            mockSet.mockResolvedValue({});

            const result = await verifyCustomDomain('tenant-123');

            expect(result.success).toBe(true);
            expect(verifyDomainTXT).toHaveBeenCalledWith('shop.mybrand.com', 'bb_verify_abc123');
            expect(verifyCNAME).toHaveBeenCalledWith('shop.mybrand.com');
        });

        it('should verify domain with nameservers when TXT and NS pass', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    customDomain: {
                        domain: 'mybrandmenu.com',
                        connectionType: 'nameserver',
                        verificationToken: 'bb_verify_abc123',
                        verificationStatus: 'pending',
                    },
                }),
            });

            verifyDomainTXT.mockResolvedValueOnce({ success: true });
            verifyNameservers.mockResolvedValueOnce({ success: true });

            mockUpdate.mockResolvedValue({});
            mockSet.mockResolvedValue({});

            const result = await verifyCustomDomain('tenant-123');

            expect(result.success).toBe(true);
            expect(verifyNameservers).toHaveBeenCalledWith('mybrandmenu.com');
        });

        it('should fail if TXT record verification fails', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    customDomain: {
                        domain: 'shop.mybrand.com',
                        connectionType: 'cname',
                        verificationToken: 'bb_verify_abc123',
                    },
                }),
            });

            verifyDomainTXT.mockResolvedValueOnce({
                success: false,
                error: 'TXT record not found',
            });

            mockUpdate.mockResolvedValue({});

            const result = await verifyCustomDomain('tenant-123');

            expect(result.success).toBe(false);
            expect(result.error).toContain('TXT record');
        });

        it('should fail if tenant not found', async () => {
            mockGet.mockResolvedValueOnce({ exists: false });

            const result = await verifyCustomDomain('nonexistent-tenant');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Tenant not found');
        });

        it('should fail if no domain configured', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({}),
            });

            const result = await verifyCustomDomain('tenant-no-domain');

            expect(result.success).toBe(false);
            expect(result.error).toContain('No domain configured');
        });
    });

    describe('removeCustomDomain', () => {
        it('should remove domain config and mapping', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    customDomain: {
                        domain: 'shop.mybrand.com',
                    },
                }),
            });

            mockDelete.mockResolvedValue({});
            mockUpdate.mockResolvedValue({});

            const result = await removeCustomDomain('tenant-123');

            expect(result.success).toBe(true);
            // Verify domain mapping was deleted
            expect(mockCollection).toHaveBeenCalledWith('domain_mappings');
            expect(mockDoc).toHaveBeenCalledWith('shop.mybrand.com');
            expect(mockDelete).toHaveBeenCalled();
        });

        it('should succeed even if no domain was configured', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({}),
            });

            mockUpdate.mockResolvedValue({});

            const result = await removeCustomDomain('tenant-123');

            expect(result.success).toBe(true);
        });
    });

    describe('getDomainStatus', () => {
        it('should return domain config for tenant', async () => {
            const mockConfig = {
                domain: 'shop.mybrand.com',
                connectionType: 'cname',
                verificationStatus: 'verified',
            };

            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ customDomain: mockConfig }),
            });

            const result = await getDomainStatus('tenant-123');

            expect(result.success).toBe(true);
            expect(result.config).toEqual(mockConfig);
        });

        it('should return null config if no domain', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({}),
            });

            const result = await getDomainStatus('tenant-123');

            expect(result.success).toBe(true);
            expect(result.config).toBeNull();
        });

        it('should fail if tenant not found', async () => {
            mockGet.mockResolvedValueOnce({ exists: false });

            const result = await getDomainStatus('nonexistent');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Tenant not found');
        });
    });

    describe('getTenantByDomain', () => {
        it('should return tenant ID for verified domain', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ tenantId: 'tenant-123' }),
            });

            const result = await getTenantByDomain('shop.mybrand.com');

            expect(result).toBe('tenant-123');
            expect(mockCollection).toHaveBeenCalledWith('domain_mappings');
            expect(mockDoc).toHaveBeenCalledWith('shop.mybrand.com');
        });

        it('should normalize domain to lowercase', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ tenantId: 'tenant-123' }),
            });

            await getTenantByDomain('SHOP.MYBRAND.COM');

            expect(mockDoc).toHaveBeenCalledWith('shop.mybrand.com');
        });

        it('should return null for unregistered domain', async () => {
            mockGet.mockResolvedValueOnce({ exists: false });

            const result = await getTenantByDomain('unknown.com');

            expect(result).toBeNull();
        });
    });
});
