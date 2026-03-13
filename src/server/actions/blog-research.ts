'use server';

/**
 * Blog Research Pipeline — Super User Content Command Center
 *
 * Jina-powered research → Claude synthesis → research-enriched blog generation
 *
 * Exports:
 *   getCannabisNewsIdeas      — cannabis industry news for content ideation
 *   getContentAnalyticsSignals — GA/GSC/content KPI snapshot for BakedBot planning
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
import {
    buildContentAnalyticsContext,
    getContentAnalyticsSignals as getContentAnalyticsSnapshot,
    type ContentAnalyticsSnapshot,
} from '@/server/services/content-engine/analytics-signals';
import {
    PULSE_PRESET_KEYS,
    fetchAndCacheNewsForTopic,
    readCachedNews,
    type PulseTopic,
} from '@/server/services/industry-pulse';
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

/** Preset topic keys the UI can pass to getCannabisNewsIdeas for instant cache reads. */
export { PULSE_PRESET_KEYS };
export type { PulseTopic };

/** An attributable quote extracted from research sources */
export interface Citation {
    quote: string;
    author: string;       // Person name, or publication name if no byline
    company: string;      // Company, org, or publication
    url: string;
    sourceTitle: string;
}

export interface ResearchBrief {
    topic: string;
    keyFindings: string[];
    suggestedAngles: string[];
    competitorGaps: string[];
    suggestedTitle: string;
    suggestedKeywords: string[];
    rawResearch: string;
    citations: Citation[];
    analyticsSignals?: ContentAnalyticsSnapshot | null;
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

export interface NewsIdeasResult {
    ideas: NewsIdea[];
    cachedAt: string | null; // ISO string — cache timestamp or fresh fetch time; null on error/empty
}

export type { ContentAnalyticsSnapshot };

/**
 * Fetch cannabis industry news for content ideation using Jina Search.
 * Claude adds a suggested content angle for each result.
 *
 * Preset topic keys ('regulations', 'marketing', 'products', 'trends') read
 * from pre-warmed Firestore cache populated nightly by the industry-pulse-refresh
 * cron (5:30 AM EST) — these load instantly.
 *
 * Free-form text topics are always fetched live (user-interactive).
 * Pass forceRefresh=true to bypass cache (manual Refresh button).
 */
export async function getCannabisNewsIdeas(
    topic?: string,
    forceRefresh = false
): Promise<NewsIdeasResult> {
    await requireSuperUser();

    // Detect if topic is one of the pre-warmed presets
    const isPreset = topic ? (PULSE_PRESET_KEYS as readonly string[]).includes(topic) : false;
    const pulseTopic: PulseTopic = isPreset ? (topic as PulseTopic) : 'default';
    const useCache = !topic || isPreset;

    // Try cache first for default + preset topics
    if (useCache && !forceRefresh) {
        const cached = await readCachedNews(pulseTopic);
        if (cached) {
            logger.info('[BlogResearch] Returning cached Industry Pulse', { topic: pulseTopic });
            return { ideas: cached.items as NewsIdea[], cachedAt: cached.cachedAt };
        }
    }

    // For free-form text topics: fetch live (no caching)
    if (topic && !isPreset) {
        try {
            const query = `cannabis technology ${topic} dispensary brand AI 2026`;
            const results = await jinaSearch(query);
            if (results.length === 0) return { ideas: [], cachedAt: null };

            const top8 = results.slice(0, 8);
            const anglePrompt = `You are a cannabis technology content strategist for BakedBot AI. For each of these recent cannabis industry articles, suggest a SHORT (1 sentence) content angle for a cannabis technology platform serving dispensaries and brands.

Articles:
${top8.map((r, i) => `${i + 1}. "${r.title}" — ${r.snippet}`).join('\n')}

Respond with ONLY a JSON array of ${top8.length} strings. Example:
["Angle for article 1", "Angle for article 2", ...]`;

            let angles: string[] = top8.map(() => 'Explain what this means for cannabis operators, brand teams, and the systems they depend on.');
            try {
                const angleResponse = await callClaude({ userMessage: anglePrompt, temperature: 0.6, maxTokens: 500 });
                const jsonMatch = angleResponse.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]) as string[];
                    if (Array.isArray(parsed) && parsed.length === top8.length) angles = parsed;
                }
            } catch { /* non-fatal */ }

            const ideas: NewsIdea[] = top8.map((r, i) => ({
                title: r.title,
                url: r.url,
                snippet: r.snippet,
                suggestedAngle: angles[i] ?? 'Explain what this means for cannabis operators, brand teams, and the systems they depend on.',
            }));

            return { ideas, cachedAt: new Date().toISOString() };
        } catch (error) {
            logger.error('[BlogResearch] getCannabisNewsIdeas live fetch failed', { topic, error });
            return { ideas: [], cachedAt: null };
        }
    }

    // Cache miss for default/preset — fetch and warm the cache
    try {
        logger.info('[BlogResearch] Cache miss — fetching live', { topic: pulseTopic });
        const { items } = await fetchAndCacheNewsForTopic(pulseTopic);
        return {
            ideas: items as NewsIdea[],
            cachedAt: items.length > 0 ? new Date().toISOString() : null,
        };
    } catch (error) {
        logger.error('[BlogResearch] getCannabisNewsIdeas failed', { error, topic: pulseTopic });
        return { ideas: [], cachedAt: null };
    }
}

export async function getContentAnalyticsSignals(): Promise<ContentAnalyticsSnapshot> {
    const user = await requireSuperUser();
    return getContentAnalyticsSnapshot(user.uid);
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
    const user = await requireSuperUser();

    logger.info('[BlogResearch] Generating research brief', { topic, category });

    const searchQuery = `${topic} cannabis technology dispensary brand AI CRM loyalty analytics`;
    const [analyticsSignals, results] = await Promise.all([
        getContentAnalyticsSnapshot(user.uid),
        jinaSearch(searchQuery),
    ]);
    const analyticsContext = buildContentAnalyticsContext(analyticsSignals);

    if (results.length === 0) {
        // Return a minimal brief so the caller can still proceed
        return {
            topic,
            keyFindings: [`Research topic: ${topic}`],
            suggestedAngles: [`How ${topic} affects cannabis operators, retention teams, and AI-led growth`],
            competitorGaps: ['This topic has limited coverage for cannabis technology teams and operator workflows'],
            suggestedTitle: `${topic}: What Cannabis Operators Need to Know`,
            suggestedKeywords: [topic, 'cannabis technology', 'dispensary software', 'cannabis AI'],
            rawResearch: `Topic: ${topic}\nCategory: ${category}\n\n${analyticsContext}`,
            citations: [],
            analyticsSignals,
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

    const rawResearch = `${pageContents.join('\n\n---\n\n')}\n\n---\n\n## BakedBot analytics context\n${analyticsContext}`;

    // Step 3a: Extract attributable citations from research sources
    let citations: Citation[] = [];
    try {
        const citationPrompt = `From the following web research, extract 2-4 direct quotable passages that:
1. Are clearly attributable to a named person OR a named company/publication
2. Contain a specific claim, statistic, trend, or insight worth citing in a cannabis industry blog

Research:
${rawResearch.substring(0, 10000)}

Source URLs:
${top3.map(r => `"${r.title}": ${r.url}`).join('\n')}

Output ONLY a JSON array. Each object must have these exact fields:
[
  {
    "quote": "exact or lightly paraphrased quotable text (max 60 words)",
    "author": "Person Name — if no specific person, use the publication or company name",
    "company": "Company, publication, or organization name",
    "url": "the source URL this came from",
    "sourceTitle": "the article title"
  }
]

Rules:
- Prefer quotes from named executives, researchers, or industry experts
- If no named person, use the publication as the "author" (e.g. "MJBizDaily Reports" or "Cannabis Regulatory Commission")
- Quotes must be attributable — no anonymous statements
- If fewer than 2 attributable quotes exist, return an empty array []
- Output ONLY the JSON array, no other text`;

        const citationResponse = await callClaude({
            userMessage: citationPrompt,
            temperature: 0.3,
            maxTokens: 800,
        });

        const jsonMatch = citationResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as Citation[];
            if (Array.isArray(parsed)) {
                citations = parsed.filter(c => c.quote && c.author && c.company && c.url);
            }
        }
        logger.info('[BlogResearch] Extracted citations', { count: citations.length, topic });
    } catch (citationError) {
        // Non-fatal — blog generation proceeds without citations
        logger.warn('[BlogResearch] Citation extraction failed', { error: String(citationError) });
    }

    // Step 3b: Claude synthesis → structured JSON brief
    const synthesisPrompt = `You are a senior cannabis technology content strategist for BakedBot AI. Synthesize the following research into a structured content brief.

Topic: ${topic}
Category: ${category.replace('_', ' ')}
Primary competitor: AlpineIQ (AIQ)

Internal performance context:
${analyticsContext}

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
- suggestedAngles: 3 distinct content approaches for a cannabis technology company serving dispensaries, brands, and operators
- competitorGaps: 2-3 angles that are underserved in cannabis technology, CRM, AI, or operator-focused content
- suggestedTitle: compelling, includes primary keyword, 50-60 chars
- suggestedKeywords: 5-8 SEO terms BakedBot should rank for
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
            suggestedAngles: parsed.suggestedAngles ?? [`How ${topic} affects cannabis operators and growth teams`],
            competitorGaps: parsed.competitorGaps ?? ['Limited operator-focused coverage'],
            suggestedTitle: parsed.suggestedTitle ?? `${topic}: A Cannabis Industry Guide`,
            suggestedKeywords: parsed.suggestedKeywords ?? [topic, 'cannabis technology', 'dispensary software'],
            rawResearch,
            citations,
            analyticsSignals,
        };
    } catch (error) {
        logger.error('[BlogResearch] Claude synthesis failed', { error });
        return {
            topic,
            keyFindings: results.slice(0, 5).map(r => r.snippet),
            suggestedAngles: [`How ${topic} impacts cannabis operators, brands, and AI-led teams`],
            competitorGaps: ['Limited cannabis technology coverage on this topic'],
            suggestedTitle: `${topic}: What Cannabis Teams Need to Know`,
            suggestedKeywords: [topic, 'cannabis technology', 'cannabis CRM', 'AI for dispensaries'],
            rawResearch,
            citations,
            analyticsSignals,
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
    userId?: string;
}): Promise<{ id: string; title: string }> {
    const user = await requireSuperUser();

    logger.info('[BlogResearch] researchAndGenerateBlog', {
        topic: input.topic,
        category: input.category,
        contentType: input.contentType,
        hasBrief: !!input.brief,
    });

    // Step 1: Get research brief (skip if already provided)
    const brief = input.brief ?? await generateResearchBrief(input.topic, input.category);

    // Step 2: Generate enriched draft (pass citations so ≥2 appear as blockquotes)
    const draft = await generateBlogDraftWithResearch(
        {
            topic: input.topic,
            category: input.category,
            orgId: input.orgId,
            userId: input.userId,
            seoKeywords: brief.suggestedKeywords,
        },
        brief.rawResearch,
        brief.citations
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
        createdBy: user.uid || input.userId || 'super_user',
        author: {
            id: user.uid || input.userId || 'super_user',
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
