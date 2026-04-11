/**
 * RTRVR Service Registry
 *
 * Defines every external service that agents can act on via RTRVR browser automation.
 * Each entry specifies how to log in and which session cookie to capture and store.
 *
 * Firestore path: users/{uid}/integrations/{serviceId}
 * Schema:         { cookies: Record<string, string>; capturedAt: Timestamp }
 */

export type ServiceId = 'linkedin' | 'reddit' | 'reddit_ads' | 'twitter' | 'instagram' | 'facebook' | 'moltbook';

export interface ServiceDefinition {
    id: ServiceId;
    displayName: string;
    loginUrl: string;
    /** Cookie names to capture after login (stored in Firestore) */
    sessionCookies: string[];
    /** Domain for cookie injection when driving browser */
    cookieDomain: string;
    /** Which agents use this service */
    agents: string[];
    /** What the agents can do */
    capabilities: string[];
}

export const SERVICE_REGISTRY: Record<ServiceId, ServiceDefinition> = {
    linkedin: {
        id: 'linkedin',
        displayName: 'LinkedIn',
        loginUrl: 'https://www.linkedin.com/login',
        sessionCookies: ['li_at', 'JSESSIONID'],
        cookieDomain: '.linkedin.com',
        agents: ['Craig', 'Leo', 'Marty'],
        capabilities: ['Post to feed', 'Post with images', 'Browse feed', 'Comment', 'React', 'Send messages', 'Send connections', 'Browse groups', 'View profiles', 'Repost', 'Read inbox', 'Enrich lead profiles'],
    },
    reddit_ads: {
        id: 'reddit_ads',
        displayName: 'Reddit Ads',
        loginUrl: 'https://ads.reddit.com',
        sessionCookies: ['reddit_session', 'token_v2'],
        cookieDomain: '.reddit.com',
        agents: ['Craig'],
        capabilities: ['Create ad campaigns', 'Monitor ad performance'],
    },
    twitter: {
        id: 'twitter',
        displayName: 'Twitter / X',
        loginUrl: 'https://twitter.com/login',
        sessionCookies: ['auth_token', 'ct0'],
        cookieDomain: '.twitter.com',
        agents: ['Craig'],
        capabilities: ['Post tweets', 'Schedule content', 'Monitor mentions'],
    },
    instagram: {
        id: 'instagram',
        displayName: 'Instagram',
        loginUrl: 'https://www.instagram.com/accounts/login',
        sessionCookies: ['sessionid', 'csrftoken'],
        cookieDomain: '.instagram.com',
        agents: ['Craig', 'Marty'],
        capabilities: ['Post content', 'Post with images', 'Browse feed', 'Comment', 'React', 'Send messages', 'View profiles', 'Browse stories'],
    },
    facebook: {
        id: 'facebook',
        displayName: 'Facebook',
        loginUrl: 'https://www.facebook.com/login',
        sessionCookies: ['c_user', 'xs', 'datr'],
        cookieDomain: '.facebook.com',
        agents: ['Marty', 'Craig'],
        capabilities: ['Post to feed', 'Post with images', 'Browse feed', 'Comment', 'React', 'Browse groups', 'Send messages', 'Search'],
    },
    reddit: {
        id: 'reddit',
        displayName: 'Reddit',
        loginUrl: 'https://www.reddit.com/login',
        sessionCookies: ['reddit_session', 'token_v2'],
        cookieDomain: '.reddit.com',
        agents: ['Marty', 'Craig'],
        capabilities: ['Post to subreddits', 'Comment', 'Vote', 'Browse feed', 'Browse subreddits', 'Send messages', 'Search'],
    },
    moltbook: {
        id: 'moltbook',
        displayName: 'Moltbook',
        loginUrl: 'https://www.moltbook.com',
        sessionCookies: ['moltbook_session'],
        cookieDomain: '.moltbook.com',
        agents: ['Marty'],
        capabilities: ['Post content', 'Comment', 'Vote', 'Browse feed', 'Search agents', 'Send messages', 'View profiles'],
    },
};

export function getService(id: ServiceId): ServiceDefinition {
    return SERVICE_REGISTRY[id];
}
