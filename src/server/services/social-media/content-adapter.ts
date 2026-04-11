/**
 * Cross-Platform Content Adapter
 *
 * Marty writes one insight, and this adapts it for each platform's tone,
 * format, and constraints. Uses Groq (free) for rewrites.
 *
 * LinkedIn → professional, data-driven
 * Facebook → conversational, community-focused
 * Reddit   → casual, anti-marketing, value-first
 * Instagram → visual hook, hashtags, emojis
 * Moltbook  → agent-speak, technical, ecosystem-aware
 */

import { logger } from '@/lib/logger';
import type { SocialPlatform } from './rate-limiter';

// ---------------------------------------------------------------------------
// Platform-specific formatting rules
// ---------------------------------------------------------------------------

interface PlatformStyle {
    maxLength: number;
    tone: string;
    format: string;
    rules: string[];
}

const PLATFORM_STYLES: Record<SocialPlatform, PlatformStyle> = {
    linkedin: {
        maxLength: 3000,
        tone: 'professional, authoritative, thought-leadership',
        format: 'Short paragraphs, line breaks between ideas, end with a question or CTA',
        rules: [
            'Use data and specific numbers when possible',
            'Reference industry trends',
            'No hashtags in body — max 3 at the end',
            'No emojis in first line',
            'Hook in first 2 lines (before "see more" fold)',
        ],
    },
    facebook: {
        maxLength: 5000,
        tone: 'conversational, community-oriented, approachable',
        format: 'Casual paragraphs, personal anecdotes welcome, call to action',
        rules: [
            'Write like you are talking to a friend in the industry',
            'Ask questions to drive comments',
            'Tag-friendly — mention "dispensary owners" or "cannabis retailers" directly',
            'Groups have strict no-promotion rules — lead with value',
            'Emojis OK but not excessive',
        ],
    },
    reddit: {
        maxLength: 10000,
        tone: 'genuine, helpful, anti-corporate, knowledgeable',
        format: 'Markdown — headers, bullet points, links. TL;DR at top for long posts.',
        rules: [
            'NEVER mention your company name or product directly',
            'Share knowledge and experience, not marketing',
            'Be specific — vague advice gets downvoted',
            'Acknowledge counter-arguments',
            'Use subreddit-appropriate language',
            'No self-promotion — if asked, mention casually',
        ],
    },
    instagram: {
        maxLength: 2200,
        tone: 'visual, energetic, inspiring, brand-aware',
        format: 'Hook line, short body, hashtag block (20-30 relevant hashtags)',
        rules: [
            'First line is the hook — make it count',
            'Use line breaks and emojis for readability',
            'Hashtags: mix popular (#cannabisindustry) with niche (#dispensarytech)',
            'Include a call to action (comment, save, share)',
            'Content should pair with a strong visual',
        ],
    },
    moltbook: {
        maxLength: 5000,
        tone: 'technical, agent-native, ecosystem-aware, collaborative',
        format: 'Structured — title, body, clear thesis. Think: agent writing for agents.',
        rules: [
            'Write as an AI agent, not as a human',
            'Share operational learnings — what worked, what failed, what you measured',
            'Reference agent patterns: tool use, delegation, memory, learning loops',
            'Be specific about your architecture and capabilities',
            'Invite collaboration — "any agents working on X?"',
            'Never share internal company secrets',
        ],
    },
};

// ---------------------------------------------------------------------------
// Content adaptation
// ---------------------------------------------------------------------------

export interface AdaptedContent {
    platform: SocialPlatform;
    content: string;
    title?: string;           // For Reddit/Moltbook
    hashtags?: string[];      // For Instagram/LinkedIn
    submolt?: string;         // For Moltbook
}

/**
 * Adapt a single piece of content for a target platform.
 * Uses Groq for the rewrite if available, otherwise applies rules manually.
 */
export async function adaptContent(
    originalContent: string,
    targetPlatform: SocialPlatform,
    context?: { topic?: string; intent?: string },
): Promise<AdaptedContent> {
    const style = PLATFORM_STYLES[targetPlatform];

    try {
        // Try Groq for intelligent adaptation (free tier)
        const { callGroqOrClaude } = await import('@/ai/glm');
        const prompt = `You are a social media content adapter. Rewrite the following content for ${targetPlatform}.

PLATFORM RULES:
- Tone: ${style.tone}
- Format: ${style.format}
- Max length: ${style.maxLength} characters
- Rules: ${style.rules.join('; ')}
${context?.topic ? `- Topic context: ${context.topic}` : ''}
${context?.intent ? `- Intent: ${context.intent}` : ''}

ORIGINAL CONTENT:
${originalContent}

Return ONLY the adapted content. No preamble, no explanation.${targetPlatform === 'instagram' ? ' Include hashtag block at the end.' : ''}${targetPlatform === 'reddit' ? ' Do NOT mention any company or product names.' : ''}`;

        const adapted = await callGroqOrClaude({
            userMessage: prompt,
            maxTokens: 1000,
            temperature: 0.7,
            caller: 'social-content-adapter',
        });

        const result: AdaptedContent = {
            platform: targetPlatform,
            content: adapted.slice(0, style.maxLength),
        };

        // Extract hashtags for Instagram
        if (targetPlatform === 'instagram') {
            const hashtagMatch = adapted.match(/#\w+/g);
            if (hashtagMatch) result.hashtags = hashtagMatch;
        }

        return result;
    } catch {
        // Fallback: manual truncation with platform label
        logger.warn('[ContentAdapter] Groq unavailable, using manual adaptation', { targetPlatform });
        return {
            platform: targetPlatform,
            content: originalContent.slice(0, style.maxLength),
        };
    }
}

/**
 * Adapt content for ALL platforms at once.
 * Returns a map of platform → adapted content.
 */
export async function adaptForAllPlatforms(
    originalContent: string,
    context?: { topic?: string; intent?: string },
    platforms?: SocialPlatform[],
): Promise<AdaptedContent[]> {
    const targets = platforms ?? ['linkedin', 'facebook', 'reddit', 'instagram', 'moltbook'] as SocialPlatform[];

    const results = await Promise.allSettled(
        targets.map(platform => adaptContent(originalContent, platform, context)),
    );

    return results
        .filter((r): r is PromiseFulfilledResult<AdaptedContent> => r.status === 'fulfilled')
        .map(r => r.value);
}

/**
 * Get platform style info — useful for Marty to understand constraints before writing.
 */
export function getPlatformStyle(platform: SocialPlatform): PlatformStyle {
    return PLATFORM_STYLES[platform];
}
