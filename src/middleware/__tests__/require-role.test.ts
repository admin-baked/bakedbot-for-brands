import { requireRole, requireBrandAccess, requireDispensaryAccess, ForbiddenError, UnauthorizedError } from '../require-role';

// Mock next/server to avoid environment issues
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn(),
    },
}));

// Mock dependencies
const mockVerifyIdToken = jest.fn();

jest.mock('firebase-admin', () => ({
    auth: () => ({
        verifyIdToken: mockVerifyIdToken,
    }),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

describe('Middleware: require-role', () => {
    
    const createMockRequest = (authHeader?: string) => {
        return {
            headers: {
                get: (key: string) => key === 'authorization' ? authHeader : null,
            },
            nextUrl: {
                pathname: '/test-path',
            },
        } as any;
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('User Role Standardization', () => {
        it('should accept generic super_user token', async () => {
            mockVerifyIdToken.mockResolvedValue({
                uid: '123',
                role: 'super_user',
            });

            const req = createMockRequest('Bearer token-123');
            const user = await requireRole(req, 'brand'); // Request brand access

            expect(user.role).toBe('super_user');
            expect(user.uid).toBe('123');
        });

        it('should normalize legacy "owner" role to "super_user"', async () => {
            mockVerifyIdToken.mockResolvedValue({
                uid: 'owner-1',
                role: 'owner', // Legacy role string from Firebase
            });

            const req = createMockRequest('Bearer token-owner');
            const user = await requireRole(req, 'brand');

            expect(user.role).toBe('super_user'); // Should be normalized
        });

        it('should normalize legacy "executive" role to "super_user"', async () => {
            mockVerifyIdToken.mockResolvedValue({
                uid: 'exec-1',
                role: 'executive',
            });

            const req = createMockRequest('Bearer token-exec');
            const user = await requireRole(req, 'brand');

            expect(user.role).toBe('super_user');
        });
    });

    describe('Access Control', () => {
        it('should deny partial role match', async () => {
            mockVerifyIdToken.mockResolvedValue({
                uid: 'cust-1',
                role: 'customer',
            });

            const req = createMockRequest('Bearer token-cust');
            
            await expect(requireRole(req, 'brand'))
                .rejects
                .toThrow(ForbiddenError);
        });

        it('should allow matching role', async () => {
            mockVerifyIdToken.mockResolvedValue({
                uid: 'brand-1',
                role: 'brand',
            });

            const req = createMockRequest('Bearer token-brand');
            const user = await requireRole(req, 'brand');

            expect(user.role).toBe('brand');
        });

        it('should throw Unauthorized if no token', async () => {
            const req = createMockRequest(undefined);
            
            await expect(requireRole(req, 'brand'))
                .rejects
                .toThrow(UnauthorizedError);
        });
    });

    describe('Scoped Access (requireBrandAccess)', () => {
        it('should allow super_user to access any brand', async () => {
             mockVerifyIdToken.mockResolvedValue({
                uid: 'admin-1',
                role: 'super_user',
            });

            const req = createMockRequest('Bearer token-admin');
            const user = await requireBrandAccess(req, 'some-brand-id');

            expect(user.role).toBe('super_user');
        });

        it('should allow brand owner to access their own brand', async () => {
            mockVerifyIdToken.mockResolvedValue({
               uid: 'brand-user-1',
               role: 'brand',
               brandId: 'my-brand-id'
           });

           const req = createMockRequest('Bearer token-brand');
           const user = await requireBrandAccess(req, 'my-brand-id');

           expect(user.brandId).toBe('my-brand-id');
       });

       it('should deny brand owner accessing another brand', async () => {
            mockVerifyIdToken.mockResolvedValue({
               uid: 'brand-user-1',
               role: 'brand',
               brandId: 'my-brand-id'
           });

           const req = createMockRequest('Bearer token-brand');
           
           await expect(requireBrandAccess(req, 'other-brand-id'))
               .rejects
               .toThrow(ForbiddenError);
       });
    });

    describe('Scoped Access (requireDispensaryAccess)', () => {
        it('should allow dispensary_admin to access their own location', async () => {
            mockVerifyIdToken.mockResolvedValue({
                uid: 'disp-admin-1',
                role: 'dispensary_admin',
                locationId: 'loc-123',
            });

            const req = createMockRequest('Bearer token-disp-admin');
            const user = await requireDispensaryAccess(req, 'loc-123');

            expect(user.role).toBe('dispensary_admin');
            expect(user.locationId).toBe('loc-123');
        });

        it('should allow dispensary_staff to access their own location', async () => {
            mockVerifyIdToken.mockResolvedValue({
                uid: 'disp-staff-1',
                role: 'dispensary_staff',
                locationId: 'loc-123',
            });

            const req = createMockRequest('Bearer token-disp-staff');
            const user = await requireDispensaryAccess(req, 'loc-123');

            expect(user.role).toBe('dispensary_staff');
            expect(user.locationId).toBe('loc-123');
        });

        it('should deny dispensary role when location does not match', async () => {
            mockVerifyIdToken.mockResolvedValue({
                uid: 'disp-user-1',
                role: 'dispensary',
                locationId: 'loc-123',
            });

            const req = createMockRequest('Bearer token-disp-user');

            await expect(requireDispensaryAccess(req, 'loc-456'))
                .rejects
                .toThrow(ForbiddenError);
        });
    });
});
