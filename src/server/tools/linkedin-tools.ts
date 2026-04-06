/**
 * LinkedIn Agent Tools
 *
 * Craig: linkedin_post — publish content to the Super User's LinkedIn feed
 * Leo:   linkedin_send_message — DM a LinkedIn connection
 *        linkedin_enrich_profile — get profile data from a LinkedIn URL (replaces Proxycurl)
 *
 * All tools require a LinkedIn session (li_at cookie) stored via the
 * LinkedIn Settings page by a Super User.
 */

import { z } from 'zod/v3';
import {
    linkedInPost,
    linkedInSendMessage,
    linkedInEnrichProfile,
} from '@/server/services/linkedin/linkedin-browser';

// ---------------------------------------------------------------------------
// Tool definitions (schema + metadata)
// ---------------------------------------------------------------------------

const linkedInPostToolDef = {
    name: 'linkedin_post',
    description:
        'Publish a post to the Super User\'s LinkedIn feed. Use for thought leadership, product announcements, or brand content. Requires LinkedIn to be connected in Settings.',
    schema: z.object({
        content: z.string().describe('The post content. Max ~3000 characters. No markdown — LinkedIn uses plain text with line breaks.'),
    }),
};

const linkedInMessageToolDef = {
    name: 'linkedin_send_message',
    description:
        'Send a LinkedIn direct message to a connection. Use for outreach to dispensary leads or partners. Requires LinkedIn to be connected in Settings.',
    schema: z.object({
        profileUrl: z.string().url().describe('Full LinkedIn profile URL (e.g. https://www.linkedin.com/in/username)'),
        message: z.string().describe('Message text. Keep it personalized and under 300 characters for best response rates.'),
    }),
};

const linkedInEnrichToolDef = {
    name: 'linkedin_enrich_profile',
    description:
        'Enrich a LinkedIn profile URL with name, headline, location, and summary. Use to qualify leads before outreach.',
    schema: z.object({
        profileUrl: z.string().url().describe('Full LinkedIn profile URL'),
    }),
};

/** Craig: posting only */
export const linkedInCraigToolDefs = [linkedInPostToolDef];

/** Leo: outreach + enrichment (no posting) */
export const linkedInLeoToolDefs = [linkedInMessageToolDef, linkedInEnrichToolDef];

// ---------------------------------------------------------------------------
// Tool implementations factory
// ---------------------------------------------------------------------------

export function makeLinkedInToolsImpl(uid: string) {
    return {
        async linkedin_post({ content }: { content: string }) {
            return linkedInPost(uid, content);
        },
        async linkedin_send_message({ profileUrl, message }: { profileUrl: string; message: string }) {
            return linkedInSendMessage(uid, profileUrl, message);
        },
        async linkedin_enrich_profile({ profileUrl }: { profileUrl: string }) {
            return linkedInEnrichProfile(uid, profileUrl);
        },
    };
}
