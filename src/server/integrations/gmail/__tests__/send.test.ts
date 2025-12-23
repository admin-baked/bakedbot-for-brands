import { sendGmail } from '../send';
import { getGmailToken, saveGmailToken } from '../token-storage';
import { getOAuth2ClientAsync } from '../oauth';
import { google } from 'googleapis';

// Mock dependencies with explicit factories
jest.mock('server-only', () => ({}));
jest.mock('../token-storage', () => ({
    getGmailToken: jest.fn(),
    saveGmailToken: jest.fn()
}));
jest.mock('../oauth', () => ({
    getOAuth2ClientAsync: jest.fn()
}));
jest.mock('googleapis', () => ({
    google: {
        gmail: jest.fn()
    }
}));

describe('Gmail Send', () => {
    const mockOAuth2Client = {
        setCredentials: jest.fn(),
        on: jest.fn()
    };
    const mockGmailClient = {
        users: {
            messages: {
                send: jest.fn()
            }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getOAuth2ClientAsync as jest.Mock).mockResolvedValue(mockOAuth2Client);
        (google.gmail as jest.Mock).mockReturnValue(mockGmailClient);
    });

    it('should throw if no token found', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue(null);
        await expect(sendGmail({ userId: 'u1', to: ['test@test.com'], subject: 'Hi', html: '<b>Hi</b>' }))
            .rejects.toThrow('User has not connected Gmail');
    });

    it('should configure client and send email', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue({ refresh_token: 'valid_refresh' });
        mockGmailClient.users.messages.send.mockResolvedValue({ data: { id: 'msg_123' } });

        const result = await sendGmail({
            userId: 'u1',
            to: ['recipient@example.com'],
            subject: 'Test Subject',
            html: '<p>Hello</p>'
        });

        expect(getGmailToken).toHaveBeenCalledWith('u1');
        expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({ refresh_token: 'valid_refresh' });
        expect(mockGmailClient.users.messages.send).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'me',
            requestBody: expect.objectContaining({
                raw: expect.any(String)
            })
        }));
        expect(result).toEqual({ id: 'msg_123' });
    });

    it('should set up token refresh listener', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue({ refresh_token: 'valid_refresh' });
        mockGmailClient.users.messages.send.mockResolvedValue({ data: { id: 'msg_123' } });

        await sendGmail({ userId: 'u1', to: ['test@test.com'], subject: 'Hi', html: '<b>Hi</b>' });

        expect(mockOAuth2Client.on).toHaveBeenCalledWith('tokens', expect.any(Function));

        // Simulate token refresh event
        const refreshCallback = mockOAuth2Client.on.mock.calls[0][1];
        await refreshCallback({ refresh_token: 'new_refresh_token', scope: 'new_scope' });

        expect(saveGmailToken).toHaveBeenCalledWith('u1', { refresh_token: 'new_refresh_token', scope: 'new_scope' });
    });
});
