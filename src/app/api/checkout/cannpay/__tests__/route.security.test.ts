import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();

jest.mock('next/server', () => ({
    NextRequest: class {},
    NextResponse: {
        json: (body: any, init?: any) => ({
            status: init?.status || 200,
            json: async () => body,
        }),
    },
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('POST /api/checkout/cannpay security', () => {
    let POST: typeof import('../route').POST;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        ({ POST } = await import('../route'));
    });

    it('requires authenticated user', async () => {
        mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

        const response = await POST({
            json: async () => ({
                dispId: 'disp_1',
                amount: 410,
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error).toContain('Authentication required');
    });

    it('returns 410 and blocks legacy endpoint even for authenticated users', async () => {
        const response = await POST({
            json: async () => ({
                dispId: 'disp_1',
                amount: 410,
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(410);
        expect(body.error).toContain('Deprecated endpoint');
    });

    it('does not create CannPay intent records through the deprecated route', async () => {
        const response = await POST({
            json: async () => ({
                dispId: 'disp_1',
                amount: 410,
                items: [{ id: 'item-1', qty: 1 }],
                draftCartId: 'cart_1',
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(410);
        expect(body.success).toBe(false);
    });
});
