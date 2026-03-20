import { sendGmail } from '../send';
import { getGmailToken, saveGmailToken } from '../token-storage';
import { getOAuth2ClientAsync } from '../oauth';

// Mock dependencies with explicit factories
jest.mock('server-only', () => ({}));
jest.mock('../token-storage', () => ({
    getGmailToken: jest.fn(),
    saveGmailToken: jest.fn()
}));
jest.mock('../oauth', () => ({
    getOAuth2ClientAsync: jest.fn()
}));

describe('Gmail Send', () => {
    const mockOAuth2Client = {
        setCredentials: jest.fn(),
        on: jest.fn(),
        getAccessToken: jest.fn(),
    };
    const originalFetch = global.fetch;

    beforeEach(() => {
        jest.clearAllMocks();
        (getOAuth2ClientAsync as jest.Mock).mockResolvedValue(mockOAuth2Client);
        mockOAuth2Client.getAccessToken.mockResolvedValue({ token: 'access-123' });
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ id: 'msg_123' }),
        } as any);
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it('should throw if no token found', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue(null);
        await expect(sendGmail({ userId: 'u1', to: ['test@test.com'], subject: 'Hi', html: '<b>Hi</b>' }))
            .rejects.toThrow('User has not connected Gmail');
    });

    it('should configure client and send email', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue({ refresh_token: 'valid_refresh' });

        const result = await sendGmail({
            userId: 'u1',
            to: ['recipient@example.com'],
            subject: 'Test Subject',
            html: '<p>Hello</p>'
        });

        expect(getGmailToken).toHaveBeenCalledWith('u1');
        expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({ refresh_token: 'valid_refresh' });
        expect(mockOAuth2Client.getAccessToken).toHaveBeenCalled();
        expect(mockOAuth2Client.setCredentials).toHaveBeenNthCalledWith(2, {
            refresh_token: 'valid_refresh',
            access_token: 'access-123',
        });
        expect(global.fetch).toHaveBeenCalledWith(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer access-123',
                    'Content-Type': 'application/json',
                }),
                body: expect.any(String),
            })
        );
        expect(result).toEqual({ id: 'msg_123' });
    });

    it('should set up token refresh listener', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue({ refresh_token: 'valid_refresh' });

        await sendGmail({ userId: 'u1', to: ['test@test.com'], subject: 'Hi', html: '<b>Hi</b>' });

        expect(mockOAuth2Client.on).toHaveBeenCalledWith('tokens', expect.any(Function));

        // Simulate token refresh event
        const refreshCallback = mockOAuth2Client.on.mock.calls[0][1];
        await refreshCallback({ refresh_token: 'new_refresh_token', scope: 'new_scope' });

        expect(saveGmailToken).toHaveBeenCalledWith('u1', { refresh_token: 'new_refresh_token', scope: 'new_scope' });
    });

    it('should throw if access token acquisition fails', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue({ refresh_token: 'valid_refresh' });
        mockOAuth2Client.getAccessToken.mockResolvedValue({ token: null });

        await expect(sendGmail({ userId: 'u1', to: ['test@test.com'], subject: 'Hi', html: '<b>Hi</b>' }))
            .rejects.toThrow('Failed to acquire Gmail access token.');
    });

    it('should throw when Gmail API returns a non-2xx response', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue({ refresh_token: 'valid_refresh' });
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 401,
            text: jest.fn().mockResolvedValue('Unauthorized'),
        } as any);

        await expect(sendGmail({ userId: 'u1', to: ['test@test.com'], subject: 'Hi', html: '<b>Hi</b>' }))
            .rejects.toThrow('Failed to send email: Gmail API 401: Unauthorized');
    });

    it('should RFC 2047 encode unicode headers in the raw payload', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue({ refresh_token: 'valid_refresh' });

        await sendGmail({
            userId: 'u1',
            to: ['recipient@example.com'],
            subject: '📅 New meeting: BakedBot Booking Smoke Test — Discovery Call',
            html: '<p>Hello</p>',
            from: 'Martez — BakedBot AI',
        });

        const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(requestInit.body as string);
        const raw = requestBody.raw.replace(/-/g, '+').replace(/_/g, '/');
        const padding = raw.length % 4 === 0 ? '' : '='.repeat(4 - (raw.length % 4));
        const decoded = Buffer.from(raw + padding, 'base64').toString('utf8');

        expect(decoded).toContain('Subject: =?UTF-8?B?8J+ThSBOZXcgbWVldGluZzogQmFrZWRCb3QgQm9va2luZyBTbW9rZSBUZXN0IOKAlCBEaXNjb3ZlcnkgQ2FsbA==?=');
        expect(decoded).toContain('From: =?UTF-8?B?TWFydGV6IOKAlCBCYWtlZEJvdCBBSQ==?=');
    });
});
