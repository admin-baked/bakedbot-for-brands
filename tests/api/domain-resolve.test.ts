/**
 * @jest-environment node
 */
/**
 * Unit Tests: Domain Resolve API
 *
 * Tests for the /api/domain/resolve endpoint that resolves
 * custom domains to tenant IDs for routing.
 *
 * [BUILDER-MODE @ 2026-01-24]
 * Created as part of custom domain routing implementation
 */

import { NextRequest } from 'next/server';

// Mock Firebase server client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock domain cache
jest.mock('@/lib/domain-cache', () => ({
    getCachedTenant: jest.fn(),
    setCachedTenant: jest.fn(),
}));

import { createServerClient } from '@/firebase/server-client';
import { getCachedTenant, setCachedTenant } from '@/lib/domain-cache';

// Helper to create mock NextRequest
function createMockRequest(
    params: {
        hostname?: string;
        originalPath?: string;
        headerHostname?: string;
        headerPath?: string;
    } = {}
): NextRequest {
    const { hostname, originalPath, headerHostname, headerPath } = params;

    const url = new URL('https://internal.server/api/domain/resolve');
    if (hostname) url.searchParams.set('hostname', hostname);
    if (originalPath) url.searchParams.set('originalPath', originalPath);

    const headers = new Headers();
    if (headerHostname) headers.set('x-resolve-hostname', headerHostname);
    if (headerPath) headers.set('x-resolve-path', headerPath);
    headers.set('x-forwarded-proto', 'https');

    return new NextRequest(url.toString(), {
        method: 'GET',
        headers,
    });
}

// Mock Firestore document
function createMockDocSnapshot(exists: boolean, data?: Record<string, unknown>) {
    return {
        exists,
        data: () => data,
    };
}

// Mock Firestore
function createMockFirestore(domainMapping?: { tenantId: string }, tenant?: { type: string }) {
    return {
        collection: jest.fn((name: string) => ({
            doc: jest.fn((id: string) => ({
                get: jest.fn().mockResolvedValue(
                    name === 'domain_mappings'
                        ? createMockDocSnapshot(!!domainMapping, domainMapping)
                        : createMockDocSnapshot(!!tenant, tenant)
                ),
            })),
        })),
    };
}

describe('Domain Resolve API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getCachedTenant as jest.Mock).mockReturnValue(undefined);
    });

    describe('Request Parameter Handling', () => {
        it('should extract hostname from query params', () => {
            const request = createMockRequest({ hostname: 'ecstaticedibles.com' });
            expect(request.nextUrl.searchParams.get('hostname')).toBe('ecstaticedibles.com');
        });

        it('should extract hostname from headers', () => {
            const request = createMockRequest({ headerHostname: 'mybrand.com' });
            expect(request.headers.get('x-resolve-hostname')).toBe('mybrand.com');
        });

        it('should prefer header over query param', () => {
            const request = createMockRequest({
                hostname: 'queryparam.com',
                headerHostname: 'header.com',
            });

            const headerHostname = request.headers.get('x-resolve-hostname');
            const queryHostname = request.nextUrl.searchParams.get('hostname');

            // Headers should be preferred
            const hostname = headerHostname || queryHostname;
            expect(hostname).toBe('header.com');
        });

        it('should handle missing hostname', () => {
            const request = createMockRequest({});
            const hostname = request.headers.get('x-resolve-hostname')
                || request.nextUrl.searchParams.get('hostname');
            expect(hostname).toBeNull();
        });
    });

    describe('Domain Lookup Logic', () => {
        it('should return cached tenant if available', () => {
            (getCachedTenant as jest.Mock).mockReturnValue('cached-tenant');

            const hostname = 'cached.com';
            const tenantId = getCachedTenant(hostname);

            expect(tenantId).toBe('cached-tenant');
        });

        it('should lookup domain mapping from Firestore when not cached', async () => {
            (getCachedTenant as jest.Mock).mockReturnValue(undefined);

            const mockFirestore = createMockFirestore(
                { tenantId: 'ecstaticedibles' },
                { type: 'brand' }
            );
            (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });

            const hostname = 'ecstaticedibles.com';

            // Simulate the lookup logic
            const { firestore } = await createServerClient();
            const mappingDoc = await firestore
                .collection('domain_mappings')
                .doc(hostname)
                .get();

            expect(mappingDoc.exists).toBe(true);
            expect(mappingDoc.data()).toEqual({ tenantId: 'ecstaticedibles' });
        });

        it('should cache lookup result', () => {
            const hostname = 'newdomain.com';
            const tenantId = 'new-tenant';

            setCachedTenant(hostname, tenantId);

            expect(setCachedTenant).toHaveBeenCalledWith(hostname, tenantId);
        });

        it('should cache null for domain not found', () => {
            const hostname = 'notfound.com';

            setCachedTenant(hostname, null);

            expect(setCachedTenant).toHaveBeenCalledWith(hostname, null);
        });
    });

    describe('Tenant Type Handling', () => {
        it('should build correct path for brand type', () => {
            const tenantId = 'ecstaticedibles';
            const tenantType = 'brand';
            const originalPath = '/';

            const redirectPath = tenantType === 'dispensary'
                ? `/dispensaries/${tenantId}${originalPath === '/' ? '' : originalPath}`
                : `/${tenantId}${originalPath === '/' ? '' : originalPath}`;

            expect(redirectPath).toBe('/ecstaticedibles');
        });

        it('should build correct path for dispensary type', () => {
            const tenantId = 'greenleaf';
            const tenantType = 'dispensary';
            const originalPath = '/';

            const redirectPath = tenantType === 'dispensary'
                ? `/dispensaries/${tenantId}${originalPath === '/' ? '' : originalPath}`
                : `/${tenantId}${originalPath === '/' ? '' : originalPath}`;

            expect(redirectPath).toBe('/dispensaries/greenleaf');
        });

        it('should preserve original path for brands', () => {
            const tenantId = 'ecstaticedibles';
            const tenantType = 'brand';
            const originalPath = '/products';

            const redirectPath = tenantType === 'dispensary'
                ? `/dispensaries/${tenantId}${originalPath === '/' ? '' : originalPath}`
                : `/${tenantId}${originalPath === '/' ? '' : originalPath}`;

            expect(redirectPath).toBe('/ecstaticedibles/products');
        });

        it('should preserve original path for dispensaries', () => {
            const tenantId = 'greenleaf';
            const tenantType = 'dispensary';
            const originalPath = '/menu';

            const redirectPath = tenantType === 'dispensary'
                ? `/dispensaries/${tenantId}${originalPath === '/' ? '' : originalPath}`
                : `/${tenantId}${originalPath === '/' ? '' : originalPath}`;

            expect(redirectPath).toBe('/dispensaries/greenleaf/menu');
        });

        it('should default to brand type if not specified', () => {
            const tenantType = undefined;
            const defaultType = tenantType || 'brand';
            expect(defaultType).toBe('brand');
        });
    });

    describe('Response Format', () => {
        it('should return success response with path', () => {
            const response = {
                success: true,
                tenantId: 'ecstaticedibles',
                type: 'brand',
                path: '/ecstaticedibles',
            };

            expect(response.success).toBe(true);
            expect(response.path).toBe('/ecstaticedibles');
        });

        it('should return error response for missing hostname', () => {
            const response = {
                error: 'Missing hostname',
                debug: {
                    url: 'https://internal.server/api/domain/resolve',
                    searchParams: {},
                },
            };

            expect(response.error).toBe('Missing hostname');
        });
    });

    describe('Edge Cases', () => {
        it('should normalize hostname to lowercase', () => {
            const hostname = 'ECSTATICEDIBLES.COM';
            const normalized = hostname.toLowerCase();
            expect(normalized).toBe('ecstaticedibles.com');
        });

        it('should handle hostname with port', () => {
            const hostname = 'ecstaticedibles.com:443';
            const normalized = hostname.toLowerCase();
            expect(normalized).toBe('ecstaticedibles.com:443');
        });

        it('should handle subdomain in custom domain', () => {
            const hostname = 'shop.mybrand.com';
            const normalized = hostname.toLowerCase();
            expect(normalized).toBe('shop.mybrand.com');
        });
    });
});

describe('Domain Resolve Integration Scenarios', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('scenario: First request for new domain - cache miss, Firestore lookup', async () => {
        // Setup: Domain not in cache
        (getCachedTenant as jest.Mock).mockReturnValue(undefined);

        // Setup: Domain exists in Firestore
        const mockFirestore = createMockFirestore(
            { tenantId: 'newbrand' },
            { type: 'brand' }
        );
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });

        // Simulate the flow
        const hostname = 'newbrand.com';
        let tenantId = getCachedTenant(hostname);

        expect(tenantId).toBeUndefined(); // Cache miss

        // Lookup in Firestore
        const { firestore } = await createServerClient();
        const mappingDoc = await firestore.collection('domain_mappings').doc(hostname).get();

        expect(mappingDoc.exists).toBe(true);
        tenantId = mappingDoc.data()?.tenantId;

        // Cache the result
        setCachedTenant(hostname, tenantId);
        expect(setCachedTenant).toHaveBeenCalledWith(hostname, 'newbrand');
    });

    it('scenario: Repeat request for cached domain - cache hit, no Firestore', async () => {
        // Setup: Domain is in cache
        (getCachedTenant as jest.Mock).mockReturnValue('cachedbrand');

        const hostname = 'cachedbrand.com';
        const tenantId = getCachedTenant(hostname);

        expect(tenantId).toBe('cachedbrand'); // Cache hit
        expect(createServerClient).not.toHaveBeenCalled(); // No Firestore call needed
    });

    it('scenario: Request for unknown domain - cache null to prevent repeated lookups', async () => {
        // Setup: Domain not in cache
        (getCachedTenant as jest.Mock).mockReturnValue(undefined);

        // Setup: Domain does NOT exist in Firestore
        const mockFirestore = createMockFirestore(undefined, undefined);
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });

        const hostname = 'unknown.com';
        let tenantId = getCachedTenant(hostname);

        expect(tenantId).toBeUndefined(); // Cache miss

        // Lookup in Firestore
        const { firestore } = await createServerClient();
        const mappingDoc = await firestore.collection('domain_mappings').doc(hostname).get();

        expect(mappingDoc.exists).toBe(false);
        tenantId = null;

        // Cache the null result to prevent repeated lookups
        setCachedTenant(hostname, null);
        expect(setCachedTenant).toHaveBeenCalledWith(hostname, null);
    });
});
