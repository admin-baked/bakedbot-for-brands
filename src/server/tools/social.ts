import { postToSocials, getSocialProfile, type PostData } from '@/server/services/social-manager';

export const SocialTools = {
    /**
     * Posts content to configured social networks.
     */
    post: async (content: string, platforms: string[] = ['twitter', 'linkedin'], mediaUrls?: string[]) => {
        return await postToSocials({
            post: content,
            platforms,
            mediaUrls,
            shortenLinks: true
        });
    },

    /**
     * Gets current social profile status and analytics.
     */
    getProfile: async () => {
        return await getSocialProfile();
    }
};
