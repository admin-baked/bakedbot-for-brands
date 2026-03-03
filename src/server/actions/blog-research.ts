'use server';

/**
 * Blog Research Pipeline — Super User Content Command Center
 *
 * Jina-powered research → Claude synthesis → research-enriched blog generation
 *
 * Exports:
 *   getCannabisNewsIdeas      — cannabis industry news for content ideation
 *   generateResearchBrief     — Jina search → Claude synthesis → structured brief
 *   researchAndGenerateBlog   — brief + generate in one call, saves to Firestore
 *   generateMarketReports     — programmatic SEO bulk generator per state
 *   getContentScorecard       — strategy scorecard (Hub/Spoke/Programmatic counts vs targets)
 */

import { requireSuperUser } from '@/server/auth/auth';
import { jinaSearch, jinaReadUrl } from '@/server/tools/jina-tools';
import { callClaude } from '@/ai/claude';
import { generateBlogDraftWithResearch } from '@/server/services/blog-generator';
import { createBlogPostInternal } from '@/server/actions/blog';
import { generateFromTemplate } from '@/server/services/content-engine/generator';
import { logger } from '@/lib/logger';
import type { BlogCategory, BlogContentType } from '@/types/blog';

const PLATFORM_ORG_ID = 'org_bakedbot_platform';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface NewsIdea {
    title: string;
    url: string;
    snippet: string;
    suggestedAngle: string;
    publishedDate?: string;
}

export interface ResearchBrief {
    topic: string;
    keyFindings: string[];
    suggestedAngles: string[];
    competitorGaps: string[];
    suggestedTitle: string;
    suggestedKeywords: string[];
    rawResearch: string;
}

export interface ContentScorecard {
    hubCount: number;
    spokeCount: number;
    programmaticCount: number;
    comparisonCount: number;
    reportCount: number;
    standardCount: number;
    totalPublished: number;
    hubTarget: number;
    spokeTarget: number;
    programmaticTarget: number;
}

// ─── 1. Cannabis News Ideas ───────────────────────────────────────────────────

/**
 * Fetch cannabis industry news for content ideation using Jina Search.
 * Claude adds a suggested content angle for each result.
 */
export async function getCannabisNewsIdeas(topic?: string): Promise<NewsIdea[]> {
    await requireSuperUser();

    const query = topic
        ? `cannabis dispensary ${topic} 2026`
        : `cannabis industry news dispensary marketing trends 2026`;

    try {
        const results = await jinaSearch(query);
        if (results.length === 0) return [];

        const top8 = results.slice(0, 8);

        // Single Claude call to suggest angles for all 8 results (cheap, ~100 tokens)
        const anglePrompt = `You are a cannabis content strategist. For each of these recent cannabis industry articles, suggest a SHORT (1 sentence) unique content angle for a cannabis dispensary's blog that adds value beyond what's already in the article.

Articles:
${top8.map((r, i) => `${i + 1}. "${r.title}" — ${r.snippet}`).join('\n')}

Respond with ONLY a JSON array of 8 strings, one angle per article. Example:
["Angle for article 1", "Angle for article 2", ...]`;

        let angles: string[] = top8.map(() => 'Explore how this affects your local dispensary customers.');

        try {
            const angleResponse = await callClaude({
                userMessage: anglePrompt,
                temperature: 0.6,
                maxTokens: 500,
            });

            const jsonMatch = angleResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as string[];
                if (Array.isArray(parsed) && parsed.length === top8.length) {
                    angles = parsed;
                }
            }
        } catch (e) {
            logger.warn('[BlogResearch] Failed to get content angles from Claude', { error: String(e) });
        }

        return top8.map((result, i) => ({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            suggestedAngle: angles[i] ?? 'Explore how this affects your local dispensary customers.',
        }));
    } catch (error) {
        logger.error('[BlogResearch] getCannabisNewsIdeas failed', { error, query });
        return [];
    }
}

// ─── 2. Research Brief ────────────────────────────────────────────────────────

/**
 * Generate a structured research brief from Jina web research synthesized by Claude.
 * Steps: jinaSearch → jinaReadUrl top 3 → Claude synthesis → structured ResearchBrief
 */
export async function generateResearchBrief(
    topic: string,
    category: string
): Promise<ResearchBrief> {
    await requireSuperUser();

    logger.info('[BlogResearch] Generating research brief', { topic, category });

    // Step 1: Search for sources
    const searchQuery = `${topic} cannabis dispensary`;
    const results = await jinaSearch(searchQuery);

    if (results.length === 0) {
        // Return a minimal brief so the caller can still proceed
        return {
            topic,
            keyFindings: [`Research topic: ${topic}`],
            suggestedAngles: [`How ${topic} impacts cannabis dispensaries`],
            competitorGaps: ['This topic has limited coverage in cannabis media'],
            suggestedTitle: `${topic}: What Cannabis Dispensaries Need to Know`,
            suggestedKeywords: [topic, 'cannabis dispensary', 'marijuana dispensary'],
            rawResearch: `Topic: ${topic}\nCategory: ${category}`,
        };
    }

    // Step 2: Read top 3 URLs concurrently (cap at 5000 chars each)
    const top3 = results.slice(0, 3);
    const pageContents = await Promise.all(
        top3.map(async (r) => {
            try {
                const content = await jinaReadUrl(r.url);
                return `## Source: ${r.title}\nURL: ${r.url}\n\n${content.substring(0, 5000)}`;
            } catch {
                return `## Source: ${r.title}\nURL: ${r.url}\n\n${r.snippet}`;
            }
        })
    );

    const rawResearch = pageContents.join('\n\n---\n\n');

    // Step 3: Claude synthesis → structured JSON brief
    const synthesisPrompt = `You are a senior cannabis content strategist. Synthesize the following research into a structured content brief.

Topic: ${topic}
Category: ${category.replace('_', ' ')}

Research Sources:
${rawResearch.substring(0, 12000)}

Respond with ONLY valid JSON matching this exact structure:
{
  "keyFindings": ["finding 1", "finding 2", "finding 3", "finding 4", "finding 5"],
  "suggestedAngles": ["angle 1 for a blog post", "angle 2", "angle 3"],
  "competitorGaps": ["gap 1 — what competitors aren't covering", "gap 2"],
  "suggestedTitle": "SEO-optimized blog title (50-60 chars)",
  "suggestedKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Rules:
- keyFindings: 5-7 factual insights from the research
- suggestedAngles: 3 distinct content approaches for a cannabis dispensary blog
- competitorGaps: 2-3 angles that are underserved in cannabis content
- suggestedTitle: compelling, includes primary keyword, 50-60 chars
- suggestedKeywords: 5-8 SEO terms a dispensary should rank for
- NO medical claims, NO youth appeal language`;

    try {
        const synthesisResponse = await callClaude({
            userMessage: synthesisPrompt,
            temperature: 0.5,
            maxTokens: 1000,
        });

        const jsonMatch = synthesisResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');

        const parsed = JSON.parse(jsonMatch[0]) as {
            keyFindings?: string[];
            suggestedAngles?: string[];
            competitorGaps?: string[];
            suggestedTitle?: string;
            suggestedKeywords?: string[];
        };

        return {
            topic,
            keyFindings: parsed.keyFindings ?? [`Research topic: ${topic}`],
            suggestedAngles: parsed.suggestedAngles ?? [`How ${topic} impacts cannabis dispensaries`],
            competitorGaps: parsed.competitorGaps ?? ['Limited cannabis-specific coverage'],
            suggestedTitle: parsed.suggestedTitle ?? `${topic}: A Cannabis Industry Guide`,
            suggestedKeywords: parsed.suggestedKeywords ?? [topic, 'cannabis', 'dispensary'],
            rawResearch,
        };
    } catch (error) {
        logger.error('[BlogResearch] Claude synthesis failed', { error });
        return {
            topic,
            keyFindings: results.slice(0, 5).map(r => r.snippet),
            suggestedAngles: [`How ${topic} impacts your dispensary`],
            competitorGaps: ['Limited cannabis-specific coverage on this topic'],
            suggestedTitle: `${topic}: What Dispensaries Need to Know`,
            suggestedKeywords: [topic, 'cannabis dispensary', 'marijuana'],
            rawResearch,
        };
    }
}

// ─── 3. Research + Generate Blog ──────────────────────────────────────────────

/**
 * Full pipeline: research brief → generate blog post → save to Firestore.
 * Returns the created BlogPost.
 */
export async function researchAndGenerateBlog(input: {
    topic: string;
    category: BlogCategory;
    contentType: BlogContentType;
    brief?: ResearchBrief;
    orgId: string;
    userId: string;
}): Promise<{ id: string; title: string }> {
    await requireSuperUser();

    logger.info('[BlogResearch] researchAndGenerateBlog', {
        topic: input.topic,
        category: input.category,
        contentType: input.contentType,
        hasBrief: !!input.brief,
    });

    // Step 1: Get research brief (skip if already provided)
    const brief = input.brief ?? await generateResearchBrief(input.topic, input.category);

    // Step 2: Generate enriched draft
    const draft = await generateBlogDraftWithResearch(
        {
            topic: input.topic,
            category: input.category,
            orgId: input.orgId,
            userId: input.userId,
            seoKeywords: brief.suggestedKeywords,
        },
        brief.rawResearch
    );

    // Step 3: Save to Firestore
    const post = await createBlogPostInternal({
        orgId: input.orgId,
        title: draft.title,
        subtitle: draft.subtitle,
        excerpt: draft.excerpt,
        content: draft.content,
        category: input.category,
        contentType: input.contentType,
        tags: draft.tags,
        seoKeywords: draft.seoKeywords,
        generatedBy: 'research_pipeline',
        status: 'draft',
        createdBy: input.userId,
        author: {
            id: input.userId,
            name: 'BakedBot AI',
        },
    });

    // Return only serializable fields — BlogPost contains Firestore Timestamps
    // which cannot cross the server action → client boundary
    return { id: post.id, title: post.title };
}

// ─── 4. Programmatic Market Reports ──────────────────────────────────────────

/**
 * Bulk generate market report posts for a list of US states.
 * Uses the existing content-engine 'market_trends_state' template.
 * Sequential (not parallel) to respect rate limits.
 */
export async function generateMarketReports(states: string[]): Promise<{
    state: string;
    postId: string;
    title: string;
    status: 'generated' | 'failed';
}[]> {
    await requireSuperUser();

    const results: { state: string; postId: string; title: string; status: 'generated' | 'failed' }[] = [];

    for (const state of states) {
        try {
            logger.info('[BlogResearch] Generating market report', { state });
            const result = await generateFromTemplate('market_trends_state', {
                state,
                city: '',
                year: String(new Date().getFullYear()),
            });

            if (result) {
                results.push({
                    state,
                    postId: result.postId,
                    title: result.title,
                    status: 'generated',
                });
            } else {
                results.push({ state, postId: '', title: '', status: 'failed' });
            }
        } catch (error) {
            logger.error('[BlogResearch] Market report generation failed', { state, error });
            results.push({ state, postId: '', title: '', status: 'failed' });
        }
    }

    return results;
}

// ─── 5. Content Strategy Scorecard ───────────────────────────────────────────

/**
 * Returns counts of published platform posts by content type vs monthly targets.
 */
export async function getContentScorecard(): Promise<ContentScorecard> {
    await requireSuperUser();

    try {
        const { getAdminFirestore } = await import('@/firebase/admin');
        const firestore = getAdminFirestore();

        const snapshot = await firestore
            .collection('tenants')
            .doc(PLATFORM_ORG_ID)
            .collection('blog_posts')
            .where('status', '==', 'published')
            .get();

        const counts: Record<string, number> = {
            hub: 0,
            spoke: 0,
            programmatic: 0,
            comparison: 0,
            report: 0,
            standard: 0,
        };

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const contentType: string = data.contentType || 'standard';
            if (contentType in counts) {
                counts[contentType]++;
            } else {
                counts.standard++;
            }
        }

        return {
            hubCount: counts.hub,
            spokeCount: counts.spoke,
            programmaticCount: counts.programmatic,
            comparisonCount: counts.comparison,
            reportCount: counts.report,
            standardCount: counts.standard,
            totalPublished: snapshot.size,
            // Monthly targets from the $10M content strategy
            hubTarget: 4,
            spokeTarget: 8,
            programmaticTarget: 20,
        };
    } catch (error) {
        logger.error('[BlogResearch] getContentScorecard failed', { error });
        return {
            hubCount: 0, spokeCount: 0, programmaticCount: 0,
            comparisonCount: 0, reportCount: 0, standardCount: 0,
            totalPublished: 0, hubTarget: 4, spokeTarget: 8, programmaticTarget: 20,
        };
    }
}
