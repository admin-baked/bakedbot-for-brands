/**
 * Social Media Manager Service (Ayrshare)
 * 
 * Capability: Post text, images, and videos to multiple social networks.
 * Supported Platforms: Instagram, Twitter (X), Facebook, LinkedIn, GMB, etc.
 * 
 * API Docs: https://docs.ayrshare.com/
 */

import { logger } from '@/lib/logger';

const AYRSHARE_API_URL = 'https://app.ayrshare.com/api';

export interface PostResult {
    success: boolean;
    refId?: string; // Ayrshare internal ID
    postIds?: Record<string, string>; // ID per platform
    errors?: any[];
}

export interface PostData {
    post: string; // Text content
    platforms: string[]; // e.g., ['twitter', 'instagram', 'linkedin', 'facebook']
    mediaUrls?: string[]; // Optional images/videos
    shortenLinks?: boolean;
}

/**
 * Post to social networks.
 */
export async function postToSocials(data: PostData): Promise<PostResult> {
    const apiKey = process.env.AYRSHARE_API_KEY;
    
    if (!apiKey) {
        logger.warn('[SocialManager] No API key configured');
        return { success: false, errors: ['Service not configured'] };
    }

    try {
        const body: any = {
            post: data.post,
            platforms: data.platforms,
            shortenLinks: data.shortenLinks ?? true
        };

        if (data.mediaUrls && data.mediaUrls.length > 0) {
            body.mediaUrls = data.mediaUrls;
        }

        const response = await fetch(`${AYRSHARE_API_URL}/post`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.status === 'success' || result.status === 'posted') {
            logger.info(`[SocialManager] Posted to ${data.platforms.join(', ')}: ${result.refId}`);
            return {
                success: true,
                refId: result.refId || result.id,
                postIds: result.postIds
            };
        } else {
            logger.error(`[SocialManager] Post failed: ${JSON.stringify(result)}`);
            return { success: false, errors: [result.message || 'Unknown error'] };
        }
    } catch (e) {
        logger.error(`[SocialManager] Network error: ${(e as Error).message}`);
        return { success: false, errors: [(e as Error).message] };
    }
}

/**
 * Get profile data (analytics/connection status).
 */
export async function getSocialProfile(): Promise<any> {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return null;

    try {
        const response = await fetch(`${AYRSHARE_API_URL}/user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        return await response.json();
    } catch (e) {
        return null;
    }
}
