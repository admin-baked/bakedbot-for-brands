import { fixThriveSyracusePOS } from '../action';
import { requireSuperUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/server/auth/auth', () => ({
    requireSuperUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('fixThriveSyracusePOS', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        (requireSuperUser as jest.Mock).mockResolvedValue({ uid: 'super-1' });
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('fails closed when ALLEAVES_PIN is missing', async () => {
        process.env.ALLEAVES_USERNAME = 'user';
        process.env.ALLEAVES_PASSWORD = 'pass';
        delete process.env.ALLEAVES_PIN;

        const result = await fixThriveSyracusePOS();

        expect(result.success).toBe(false);
        expect(result.error).toContain('ALLEAVES_PIN');
        expect(createServerClient).not.toHaveBeenCalled();
    });
});
