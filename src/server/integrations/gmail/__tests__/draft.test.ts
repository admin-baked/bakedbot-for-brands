import { createGmailDraft } from '../send';
import { getGmailToken, saveGmailToken } from '../token-storage';
import { getOAuth2ClientAsync } from '../oauth';

// Mock dependencies
jest.mock('server-only', () => ({}));
jest.mock('../token-storage', () => ({
    getGmailToken: jest.fn(),
    saveGmailToken: jest.fn()
}));
jest.mock('../oauth', () => ({
    getOAuth2ClientAsync: jest.fn()
}));

describe('Gmail Create Draft', () => {
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
            json: jest.fn().mockResolvedValue({ id: 'draft_123', message: { id: 'msg_123', threadId: 'thread_123' } }),
        } as any);
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it('should throw if no token found', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue(null);
        await expect(createGmailDraft({ userId: 'u1', to: ['test@test.com'], subject: 'Hi', html: '<b>Hi</b>' }))
            .rejects.toThrow('User has not connected Gmail');
    });

    it('should configure client and create draft', async () => {
        (getGmailToken as jest.Mock).mockResolvedValue({ refresh_token: 'valid_refresh' });

        const result = await createGmailDraft({
            userId: 'u1',
            to: ['recipient@example.com'],
            subject: 'Test Subject',
            html: '<p>Hello</p>'
        });

        expect(getGmailToken).toHaveBeenCalledWith('u1');
        expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({ refresh_token: 'valid_refresh' });
        expect(global.fetch).toHaveBeenCalledWith(
            'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer access-123',
                    'Content-Type': 'application/json',
                }),
                body: expect.any(String),
            })
        );

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(body.message).toBeDefined();
        expect(body.message.raw).toBeDefined();

        expect(result).toEqual({ id: 'draft_123', message: { id: 'msg_123', threadId: 'thread_123' } });
    });
});
