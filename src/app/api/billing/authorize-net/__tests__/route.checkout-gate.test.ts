import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCreateServerClient = jest.fn();
const mockRequireUser = jest.fn();
const mockEmitEvent = jest.fn();

jest.mock('next/server', () => {
    return {
        NextRequest: class {},
        NextResponse: {
            json: (body: any, init?: any) => ({
                status: init?.status || 200,
                json: async () => body,
            }),
        },
    };
});

jest.mock('@/firebase/server-client', () => ({
    createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/server/events/emitter', () => ({
    emitEvent: (...args: unknown[]) => mockEmitEvent(...args),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('POST /api/billing/authorize-net checkout gate', () => {
    let POST: typeof import('../route').POST;
    const originalEnv = process.env;

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        mockCreateServerClient.mockResolvedValue({
            firestore: {
                collection: jest.fn(),
            },
        });
        ({ POST } = await import('../route'));
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns 503 and avoids server initialization when company checkout is disabled', async () => {
        process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT = 'false';

        const request = {
            json: async () => ({
                organizationId: 'org_1',
                planId: 'claim_pro',
                locationCount: 1,
            }),
        } as any;

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.error).toContain('currently disabled');
        expect(mockCreateServerClient).not.toHaveBeenCalled();
        expect(mockRequireUser).not.toHaveBeenCalled();
    });

    it('returns 401 when authentication is missing', async () => {
        process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT = 'true';
        mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

        const request = {
            json: async () => ({
                organizationId: 'org_1',
                planId: 'claim_pro',
                locationCount: 1,
            }),
        } as any;

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error).toContain('Authentication required');
    });

    it('rejects invalid organization id payload', async () => {
        process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT = 'true';
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const request = {
            json: async () => ({
                organizationId: 'org/invalid',
                planId: 'claim_pro',
                locationCount: 1,
            }),
        } as any;

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toContain('organizationId');
        expect(mockEmitEvent).not.toHaveBeenCalled();
    });

    it('rejects customer email mismatch against signed-in account', async () => {
        process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT = 'true';
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const request = {
            json: async () => ({
                organizationId: 'org_1',
                planId: 'claim_pro',
                locationCount: 1,
                customer: {
                    email: 'other@example.com',
                },
            }),
        } as any;

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toContain('must match');
        expect(mockEmitEvent).not.toHaveBeenCalled();
    });

    it('rejects paid subscription checkout when email is unverified', async () => {
        process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT = 'true';
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
            email_verified: false,
        });

        const request = {
            json: async () => ({
                organizationId: 'org_1',
                planId: 'claim_pro',
                locationCount: 1,
                customer: {
                    email: 'owner@example.com',
                },
            }),
        } as any;

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toContain('Email verification is required');
        expect(mockEmitEvent).not.toHaveBeenCalled();
    });
});
