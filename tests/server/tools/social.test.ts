import { SocialTools } from '@/server/tools/social';
import { postToSocials, getSocialProfile } from '@/server/services/social-manager';

// Mock the underlying service
jest.mock('@/server/services/social-manager', () => ({
    postToSocials: jest.fn(),
    getSocialProfile: jest.fn()
}));

describe('SocialTools', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('post', () => {
        it('should call postToSocials with correct parameters', async () => {
            (postToSocials as jest.Mock).mockResolvedValue({ success: true, refId: '123' });

            const result = await SocialTools.post('Hello World', ['twitter']);

            expect(postToSocials).toHaveBeenCalledWith({
                post: 'Hello World',
                platforms: ['twitter'],
                mediaUrls: undefined,
                shortenLinks: true
            });
            expect(result).toEqual({ success: true, refId: '123' });
        });

        it('should handle failures', async () => {
            (postToSocials as jest.Mock).mockResolvedValue({ success: false, errors: ['API Error'] });

            const result = await SocialTools.post('Fail');

            expect(result.success).toBe(false);
            expect(result.errors).toContain('API Error');
        });
    });

    describe('getProfile', () => {
        it('should return profile data', async () => {
            const mockProfile = { twitter: { followers: 100 } };
            (getSocialProfile as jest.Mock).mockResolvedValue(mockProfile);

            const result = await SocialTools.getProfile();

            expect(result).toEqual(mockProfile);
        });
    });
});
