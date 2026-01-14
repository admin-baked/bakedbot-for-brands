
import { requireUser } from '@/server/auth/auth';
import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

describe('Auth Approval Blocking', () => {
    let mockCookies: any;
    let mockAuth: any;

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

    it('should throw Forbidden if approvalStatus is pending', async () => {
        mockCookies.get.mockReturnValue({ value: 'valid-token' });
        mockAuth.verifySessionCookie.mockResolvedValue({
            uid: '123',
            email: 'user@example.com',
            role: 'brand',
            approvalStatus: 'pending'
        });

        await expect(requireUser()).rejects.toThrow('Forbidden: Your account is pending approval.');
    });

    it('should throw Forbidden if approvalStatus is rejected', async () => {
        mockCookies.get.mockReturnValue({ value: 'valid-token' });
        mockAuth.verifySessionCookie.mockResolvedValue({
            uid: '123',
            email: 'user@example.com',
            role: 'brand',
            approvalStatus: 'rejected'
        });

        await expect(requireUser()).rejects.toThrow('Forbidden: Your account has been rejected.');
    });

    it('should allow access if approvalStatus is approved', async () => {
        mockCookies.get.mockReturnValue({ value: 'valid-token' });
        mockAuth.verifySessionCookie.mockResolvedValue({
            uid: '123',
            email: 'user@example.com',
            role: 'brand',
            approvalStatus: 'approved'
        });

        const user = await requireUser();
        expect(user.uid).toBe('123');
    });

    it('should allow access if approvalStatus is undefined (legacy user)', async () => {
        mockCookies.get.mockReturnValue({ value: 'valid-token' });
        mockAuth.verifySessionCookie.mockResolvedValue({
            uid: '123',
            email: 'user@example.com',
            role: 'brand'
            // approvalStatus undefined
        });

        const user = await requireUser();
        expect(user.uid).toBe('123');
    });

    it('should allow Super Admin email bypass even if pending (unlikely but safe)', async () => {
        mockCookies.get.mockReturnValue({ value: 'valid-token' });
        mockAuth.verifySessionCookie.mockResolvedValue({
            uid: '123',
            email: 'martez@bakedbot.ai', // Whitelisted
            role: 'brand',
            approvalStatus: 'pending'
        });

        const user = await requireUser();
        expect(user.uid).toBe('123');
    });
});
