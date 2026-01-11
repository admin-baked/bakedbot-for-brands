import { checkGmailConnection } from '@/server/actions/gmail';
import { requireUser } from '@/server/auth/auth';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';

// Mock dependencies
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn()
}));

jest.mock('@/server/integrations/gmail/token-storage', () => ({
    getGmailToken: jest.fn()
}));

// Mock console.error to keep output clean
const originalConsoleError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});
afterAll(() => {
    console.error = originalConsoleError;
});

describe('checkGmailConnection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return isConnected: true when valid token exists', async () => {
        // Setup mocks
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user', email: 'test@example.com' });
        (getGmailToken as jest.Mock).mockResolvedValue({ refresh_token: 'valid-token' });

        const result = await checkGmailConnection();

        expect(result).toEqual({ isConnected: true, email: 'test@example.com' });
    });

    it('should return isConnected: false when token is missing', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });
        (getGmailToken as jest.Mock).mockResolvedValue({}); // Empty credentials

        const result = await checkGmailConnection();

        expect(result).toEqual({ isConnected: false });
    });

    it('should return isConnected: false when requireUser fails', async () => {
        (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

        const result = await checkGmailConnection();

        expect(result).toEqual({ isConnected: false });
    });
});
