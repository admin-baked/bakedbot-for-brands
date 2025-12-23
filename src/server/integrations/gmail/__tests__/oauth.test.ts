import { getAuthUrl, getOAuth2ClientAsync, exchangeCodeForTokens } from '../oauth';
import { getGoogleOAuthCredentials } from '@/server/utils/secrets';
import { google } from 'googleapis';

// Mock dependencies
jest.mock('@/server/utils/secrets', () => ({
    getGoogleOAuthCredentials: jest.fn()
}));

// Partially mock googleapis to spy on OAuth2 constructor
jest.mock('googleapis', () => {
    const mockOAuth2Instance = {
        generateAuthUrl: jest.fn(),
        getToken: jest.fn()
    };
    return {
        google: {
            auth: {
                OAuth2: jest.fn(() => mockOAuth2Instance)
            }
        }
    };
});

describe('Gmail OAuth', () => {
    const mockCredentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getGoogleOAuthCredentials as jest.Mock).mockResolvedValue(mockCredentials);
    });

    describe('getOAuth2ClientAsync', () => {
        it('should create OAuth2 client with credentials from Secret Manager', async () => {
            const client = await getOAuth2ClientAsync();

            expect(getGoogleOAuthCredentials).toHaveBeenCalled();
            expect(google.auth.OAuth2).toHaveBeenCalledWith(
                'test-client-id',
                'test-client-secret',
                expect.any(String) // redirect URI
            );
            expect(client).toBeDefined();
        });

        it('should throw error if credentials are missing', async () => {
            (getGoogleOAuthCredentials as jest.Mock).mockResolvedValue({
                clientId: null,
                clientSecret: null
            });

            await expect(getOAuth2ClientAsync()).rejects.toThrow(
                'Google OAuth credentials not configured'
            );
        });
    });

    describe('getAuthUrl', () => {
        it('should generate OAuth URL with correct scopes', async () => {
            const mockUrl = 'https://accounts.google.com/oauth/authorize?...';
            const mockClient = (google.auth.OAuth2 as jest.Mock).mock.results[0]?.value || {
                generateAuthUrl: jest.fn().mockReturnValue(mockUrl)
            };
            (google.auth.OAuth2 as jest.Mock).mockReturnValue({
                generateAuthUrl: jest.fn().mockReturnValue(mockUrl)
            });

            const url = await getAuthUrl();

            expect(url).toBe(mockUrl);
        });

        it('should include state parameter when provided', async () => {
            const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://...');
            (google.auth.OAuth2 as jest.Mock).mockReturnValue({
                generateAuthUrl: mockGenerateAuthUrl
            });

            await getAuthUrl('csrf-token-123');

            expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    state: 'csrf-token-123',
                    access_type: 'offline',
                    prompt: 'consent'
                })
            );
        });
    });

    describe('exchangeCodeForTokens', () => {
        it('should exchange authorization code for tokens', async () => {
            const mockTokens = {
                access_token: 'access-123',
                refresh_token: 'refresh-456'
            };
            const mockGetToken = jest.fn().mockResolvedValue({ tokens: mockTokens });
            (google.auth.OAuth2 as jest.Mock).mockReturnValue({
                getToken: mockGetToken
            });

            const tokens = await exchangeCodeForTokens('auth-code-789');

            expect(mockGetToken).toHaveBeenCalledWith('auth-code-789');
            expect(tokens).toEqual(mockTokens);
        });
    });
});
