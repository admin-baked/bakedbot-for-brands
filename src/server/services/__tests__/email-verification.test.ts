
import { verifyEmail, verifyEmails, EmailVerificationResult } from '../email-verification';

// Mock global fetch
global.fetch = jest.fn();

describe('Email Verification Service', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        process.env.QUICKEMAILVERIFICATION_API_KEY = 'test_key';
    });

    it('should verify a valid email successfully', async () => {
        const mockResponse = {
            email: 'test@example.com',
            result: 'valid',
            reason: 'accepted_email',
            disposable: 'false',
            accept_all: 'false',
            role: 'false',
            free: 'true',
            safe_to_send: 'true',
            success: 'true'
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const result = await verifyEmail('test@example.com');

        expect(result.success).toBe(true);
        expect(result.result).toBe('valid');
        expect(result.safe_to_send).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('api.quickemailverification.com'),
            expect.any(Object)
        );
    });

    it('should handle invalid API key/configuration', async () => {
        delete process.env.QUICKEMAILVERIFICATION_API_KEY;

        const result = await verifyEmail('test@example.com');

        expect(result.success).toBe(false);
        expect(result.reason).toBe('API key not configured');
    });

    it('should handle API errors gracefully', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 402,
            statusText: 'Payment Required'
        });

        const result = await verifyEmail('test@example.com');

        expect(result.success).toBe(false);
        expect(result.result).toBe('unknown');
    });

    it('should batch verify emails', async () => {
        const mockResponse = {
            result: 'valid',
            safe_to_send: 'true'
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const results = await verifyEmails(['a@b.com', 'b@c.com']);

        expect(results).toHaveLength(2);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
