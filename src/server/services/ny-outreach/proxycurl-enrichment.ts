/**
 * Proxycurl LinkedIn Enrichment
 *
 * Enriches leads that have a linkedinUrl (from Apollo) with full profile data:
 * summary, experience, company size, follower count, location.
 *
 * Pricing: ~$0.01/credit. Only called when Apollo returns a linkedinUrl.
 * API docs: https://nubela.co/proxycurl/docs
 */

import { logger } from '@/lib/logger';

const PROXYCURL_BASE = 'https://nubela.co/proxycurl/api/v2';

export interface ProxycurlProfile {
    fullName?: string;
    headline?: string;          // e.g. "Owner at Green Leaf Dispensary"
    summary?: string;           // LinkedIn about section
    city?: string;
    state?: string;
    followerCount?: number;
    connectionCount?: number;
    currentCompany?: string;
    currentTitle?: string;
    yearsExperience?: number;   // derived from first experience entry
    profilePicUrl?: string;
}

interface ProxycurlApiResponse {
    full_name?: string;
    headline?: string;
    summary?: string;
    city?: string;
    state?: string;
    follower_count?: number;
    connections?: number;
    experiences?: Array<{
        company?: string;
        title?: string;
        starts_at?: { year?: number };
        ends_at?: { year?: number } | null;
    }>;
    profile_pic_url?: string;
}

export async function enrichLinkedInProfile(linkedinUrl: string): Promise<ProxycurlProfile | null> {
    const apiKey = process.env.PROXYCURL_API_KEY;
    if (!apiKey) {
        logger.warn('[Proxycurl] PROXYCURL_API_KEY not set — skipping LinkedIn enrichment');
        return null;
    }

    try {
        const url = new URL(`${PROXYCURL_BASE}/linkedin`);
        url.searchParams.set('linkedin_profile_url', linkedinUrl);
        url.searchParams.set('use_cache', 'if-present');  // avoid re-billing cached profiles

        const response = await globalThis.fetch(url.toString(), {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            logger.warn('[Proxycurl] Profile fetch failed', {
                linkedinUrl,
                status: response.status,
            });
            return null;
        }

        const data = await response.json() as ProxycurlApiResponse;

        // Derive years of cannabis/dispensary experience from current role start date
        const currentRole = data.experiences?.find(e => !e.ends_at);
        const yearsExperience = currentRole?.starts_at?.year
            ? new Date().getFullYear() - currentRole.starts_at.year
            : undefined;

        const profile: ProxycurlProfile = {};
        if (data.full_name) profile.fullName = data.full_name;
        if (data.headline) profile.headline = data.headline;
        if (data.summary) profile.summary = data.summary;
        if (data.city) profile.city = data.city;
        if (data.state) profile.state = data.state;
        if (data.follower_count) profile.followerCount = data.follower_count;
        if (data.connections) profile.connectionCount = data.connections;
        if (currentRole?.company) profile.currentCompany = currentRole.company;
        if (currentRole?.title) profile.currentTitle = currentRole.title;
        if (yearsExperience) profile.yearsExperience = yearsExperience;
        if (data.profile_pic_url) profile.profilePicUrl = data.profile_pic_url;

        logger.info('[Proxycurl] Profile enriched', {
            linkedinUrl,
            name: profile.fullName,
            headline: profile.headline,
        });

        return profile;
    } catch (err) {
        logger.warn('[Proxycurl] Enrichment error', { linkedinUrl, error: String(err) });
        return null;
    }
}
