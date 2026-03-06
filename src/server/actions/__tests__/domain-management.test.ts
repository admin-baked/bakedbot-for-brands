import { addCustomDomain } from '../domain-management';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';

// Mock dependencies
jest.mock('@/firebase/server-client');
jest.mock('@/server/auth/auth');
jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn() }
}));

const mockDoc = jest.fn();
const mockCollection = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn();

mockCollection.mockReturnValue({
    doc: mockDoc,
});

mockDoc.mockReturnValue({
    get: mockGet,
    set: mockSet,
    collection: mockCollection,
});

const mockFirestore = {
    collection: mockCollection,
};

(createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });

describe('addCustomDomain', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('requires an admin role to add a domain', async () => {
        // Mock non-admin user
        (requireUser as jest.Mock).mockResolvedValue({
            email: 'user@example.com',
            role: 'budtender',
            tenantId: 'tenant-123'
        });

        const result = await addCustomDomain('tenant-123', 'shop.example.com');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Forbidden');
    });

    it('adds domain successfully and uses set with merge for tenant doc', async () => {
        // Mock admin user
        (requireUser as jest.Mock).mockResolvedValue({
            email: 'admin@example.com',
            role: 'brand_admin',
            tenantId: 'tenant-123'
        });

        // Mock no existing mapping
        mockGet.mockResolvedValueOnce({ exists: false, data: () => null });

        const result = await addCustomDomain('tenant-123', 'shop.example.com');

        expect(result.success).toBe(true);
        expect(mockSet).toHaveBeenCalledWith(
            expect.objectContaining({
                customDomain: expect.objectContaining({
                    domain: 'shop.example.com',
                    verificationStatus: 'pending',
                })
            }),
            { merge: true } // Crucial part of the recent fix
        );
    });

    it('rejects if domain belongs to another tenant', async () => {
        (requireUser as jest.Mock).mockResolvedValue({
            email: 'admin@example.com',
            role: 'brand_admin',
            tenantId: 'tenant-123'
        });

        // Mock existing mapping for different tenant
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ tenantId: 'other-tenant' })
        });

        const result = await addCustomDomain('tenant-123', 'shop.example.com');

        expect(result.success).toBe(false);
        expect(result.error).toContain('already registered');
    });
});
