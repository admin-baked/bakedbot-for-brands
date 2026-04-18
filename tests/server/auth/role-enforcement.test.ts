import { requireUser } from '@/server/auth/auth';
import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';

const mockRedirect = jest.fn();

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('next/navigation', () => ({
    redirect: (...args: unknown[]) => mockRedirect(...args),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

describe('Auth Role Enforcement', () => {
    let mockCookies: {
        get: jest.Mock;
        getAll: jest.Mock;
    };
    let mockAuth: {
        verifySessionCookie: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockCookies = {
            get: jest.fn(),
            getAll: jest.fn().mockReturnValue([]),
        };
        (cookies as jest.Mock).mockResolvedValue(mockCookies);

        mockAuth = {
            verifySessionCookie: jest.fn(),
        };
        (createServerClient as jest.Mock).mockResolvedValue({ auth: mockAuth });
    });

    it('throws Forbidden on role mismatch instead of redirecting', async () => {
        mockCookies.get.mockReturnValue({ value: 'valid-token' });
        mockAuth.verifySessionCookie.mockResolvedValue({
            uid: 'user-1',
            email: 'user@example.com',
            role: 'brand_admin',
            approvalStatus: 'approved',
        });

        await expect(requireUser(['super_user'])).rejects.toThrow(
            'Forbidden: You do not have the required permissions.',
        );
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});
