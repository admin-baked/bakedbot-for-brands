/**
 * Day Day — Growth & SEO Agent
 *
 * Dual mandate:
 *   1. Platform acquisition — drive B2B signups for bakedbot.ai via organic search
 *   2. Cannabis data authority — build the #1 cannabis SEO moat (strains, terpenes, lab results)
 *
 * Tools:
 * - get_seo_report           — GSC top queries: clicks, impressions, avg position
 * - find_seo_opportunities    — Low-competition queries close to page 1
 * - get_traffic_report        — GA4 sessions, users, top pages
 * - get_page_performance      — GSC data for specific BakedBot page paths
 * - research_seo_trends       — Fetch + summarize from Google Search Central, SEL, SEJ, Ahrefs, Semrush
 * - create_blog_post          — Draft a SEO-optimized blog post for bakedbot.ai
 * - optimize_content          — SEO-improve a piece of existing content
 * - save_content_draft        — Persist a content draft to Firestore for tracking
 * - get_content_library       — List published and draft content with performance data
 * - submit_for_approval       — Post content to #ceo Slack with Approve/Decline buttons for Martez
 * - learning_log              — Record what worked and what failed
 * - learning_search           — Search prior SEO learnings before repeating work
 * - notify_agent_problem      — Escalate blockers to Linus + Marty via learning loop
 * - dayday_dream              — Overnight dream session: introspect SEO telemetry and hypothesize improvements
 */

import { executeWithTools, isClaudeAvailable, ClaudeTool, ClaudeResult, AgentContext } from '@/ai/claude';
import { executeGLMWithTools, GLM_MODELS, isGLMConfigured } from '@/ai/glm';
import { executeGeminiFlashWithTools, isGeminiFlashConfigured } from '@/ai/gemini-flash-tools';
import { getAgentModelConfig, type ModelTier } from '@/server/services/agent-model-config';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { searchConsoleService } from '@/server/services/growth/search-console';
import { googleAnalyticsService } from '@/server/services/growth/google-analytics';
import { makeLearningLoopToolsImpl } from '@/server/services/agent-learning-loop';
import { isDreamModel } from '@/server/services/letta/dream-loop';
import type { AgentImplementation } from './harness';
import type { AgentMemory } from './schemas';

const daydayLearningTools = makeLearningLoopToolsImpl({
    agentId: 'day_day',
    role: 'Growth & SEO Agent',
    defaultCategory: 'seo-growth',
});

// SEO blog sources for trend research
const SEO_SOURCES = [
    { name: 'Google Search Central Blog', url: 'https://developers.google.com/search/blog' },
    { name: 'Search Engine Land', url: 'https://searchengineland.com/category/seo' },
    { name: 'Search Engine Journal', url: 'https://www.searchenginejournal.com/category/seo/' },
    { name: 'Ahrefs Blog', url: 'https://ahrefs.com/blog/' },
    { name: 'Semrush Blog', url: 'https://www.semrush.com/blog/' },
];

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const DAYDAY_TOOLS: ClaudeTool[] = [
    {
        name: 'get_seo_report',
        description: 'Return the top GSC search queries for bakedbot.ai: clicks, impressions, CTR, and average position. Shows what people are searching to find us.',
        input_schema: {
            type: 'object' as const,
            properties: {
                days: { type: 'number', description: 'Look-back window in days (default 28)' },
                limit: { type: 'number', description: 'Max queries to return (default 50)' },
            },
            required: [],
        },
    },
    {
        name: 'find_seo_opportunities',
        description: 'Find low-competition queries where bakedbot.ai is already ranking between positions 4–30 with meaningful impressions. These are quick-win ranking opportunities.',
        input_schema: {
            type: 'object' as const,
            properties: {
                limit: { type: 'number', description: 'Max opportunities to return (default 20)' },
            },
            required: [],
        },
    },
    {
        name: 'get_traffic_report',
        description: 'Return GA4 traffic data for bakedbot.ai: sessions, users, top pages, and traffic sources for the past N days.',
        input_schema: {
            type: 'object' as const,
            properties: {
                days: { type: 'number', description: 'Look-back window (default 7)' },
            },
            required: [],
        },
    },
    {
        name: 'get_page_performance',
        description: 'Return GSC search performance for specific bakedbot.ai page paths: top queries, clicks, impressions for each page.',
        input_schema: {
            type: 'object' as const,
            properties: {
                pages: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of page paths to check, e.g. ["/strains", "/blog/cannabis-seo-guide"]',
                },
                days: { type: 'number', description: 'Look-back window in days (default 7)' },
            },
            required: ['pages'],
        },
    },
    {
        name: 'research_seo_trends',
        description: 'Fetch and summarize the latest SEO trends, AI search updates, and best practices from Google Search Central, Search Engine Land, Search Engine Journal, Ahrefs, and Semrush.',
        input_schema: {
            type: 'object' as const,
            properties: {
                topic: {
                    type: 'string',
                    description: 'Optional: specific topic to research (e.g. "AI overviews", "E-E-A-T", "cannabis SEO", "local SEO"). Omit for general trends.',
                },
                source: {
                    type: 'string',
                    enum: ['google', 'searchengineland', 'searchenginejournal', 'ahrefs', 'semrush', 'all'],
                    description: 'Which source to fetch from. Defaults to "all" (tries fastest available).',
                },
            },
            required: [],
        },
    },
    {
        name: 'create_blog_post',
        description: 'Draft a SEO-optimized blog post for bakedbot.ai targeting a specific keyword or topic. Includes title, meta description, H2 outline, and draft body.',
        input_schema: {
            type: 'object' as const,
            properties: {
                keyword: { type: 'string', description: 'Primary target keyword, e.g. "cannabis dispensary software" or "cannabis SEO guide"' },
                topic: { type: 'string', description: 'Optional: additional context or angle for the post' },
                audience: {
                    type: 'string',
                    enum: ['dispensary', 'brand', 'general', 'b2b'],
                    description: 'Target reader (default: b2b for platform acquisition)',
                },
                wordCount: { type: 'number', description: 'Approximate target word count (default 1200)' },
            },
            required: ['keyword'],
        },
    },
    {
        name: 'optimize_content',
        description: 'Take existing content and improve it for SEO: better title, meta description, keyword density, internal linking suggestions, and schema markup recommendations.',
        input_schema: {
            type: 'object' as const,
            properties: {
                content: { type: 'string', description: 'The existing content to optimize' },
                targetKeyword: { type: 'string', description: 'Primary keyword to optimize for' },
                currentUrl: { type: 'string', description: 'Optional: the URL of the existing page' },
            },
            required: ['content', 'targetKeyword'],
        },
    },
    {
        name: 'save_content_draft',
        description: 'Save a content draft to Firestore for tracking. Records keyword, status, and creation date so Day Day can monitor performance over time.',
        input_schema: {
            type: 'object' as const,
            properties: {
                title: { type: 'string', description: 'Content title' },
                content: { type: 'string', description: 'Full content body' },
                keyword: { type: 'string', description: 'Primary target keyword' },
                contentType: {
                    type: 'string',
                    enum: ['blog_post', 'lead_magnet', 'deck', 'landing_page', 'social'],
                    description: 'Type of content',
                },
                status: {
                    type: 'string',
                    enum: ['draft', 'pending_approval', 'approved', 'published'],
                    description: 'Content status (default: draft)',
                },
                metaDescription: { type: 'string', description: 'Optional: SEO meta description' },
            },
            required: ['title', 'content', 'keyword', 'contentType'],
        },
    },
    {
        name: 'get_content_library',
        description: 'List all content drafts and published pieces that Day Day is tracking. Shows keyword, status, type, and creation date.',
        input_schema: {
            type: 'object' as const,
            properties: {
                status: {
                    type: 'string',
                    enum: ['draft', 'pending_approval', 'approved', 'published', 'all'],
                    description: 'Filter by status (default: all)',
                },
                limit: { type: 'number', description: 'Max items to return (default 20)' },
            },
            required: [],
        },
    },
    {
        name: 'submit_for_approval',
        description: 'Submit a content piece to Martez for approval via Slack. Posts a message with Approve/Decline buttons to #ceo. Always do this after creating a blog post, lead magnet, or deck.',
        input_schema: {
            type: 'object' as const,
            properties: {
                title: { type: 'string', description: 'Content title' },
                contentType: {
                    type: 'string',
                    enum: ['blog_post', 'lead_magnet', 'deck', 'landing_page', 'social'],
                    description: 'Type of content',
                },
                summary: { type: 'string', description: 'Brief summary of the content and why it matters for growth' },
                targetKeyword: { type: 'string', description: 'Primary keyword this content targets' },
                contentId: { type: 'string', description: 'Optional: Firestore content draft ID from save_content_draft' },
                estimatedImpact: { type: 'string', description: 'Optional: expected impressions/traffic or business impact' },
            },
            required: ['title', 'contentType', 'summary', 'targetKeyword'],
        },
    },
    {
        name: 'learning_log',
        description: 'Log a meaningful SEO or growth attempt, outcome, and next step so Day Day can learn from it.',
        input_schema: {
            type: 'object' as const,
            properties: {
                action: { type: 'string', description: 'What was attempted' },
                result: { type: 'string', enum: ['success', 'failure', 'pending', 'partial'], description: 'Outcome' },
                reason: { type: 'string', description: 'Why it worked or failed' },
                nextStep: { type: 'string', description: 'What should happen next' },
                category: { type: 'string', description: 'Category: seo-growth, content, trends, acquisition, or problem' },
            },
            required: ['action', 'result'],
        },
    },
    {
        name: 'learning_search',
        description: 'Search Day Day\'s prior SEO learnings before repeating a workflow or retrying a blocked task.',
        input_schema: {
            type: 'object' as const,
            properties: {
                query: { type: 'string', description: 'What to search for' },
                category: { type: 'string', description: 'Optional category filter' },
                limit: { type: 'number', description: 'Max results' },
            },
            required: ['query'],
        },
    },
    {
        name: 'notify_agent_problem',
        description: 'Escalate a blocked SEO or growth failure to Slack and record it for follow-up via the learning loop.',
        input_schema: {
            type: 'object' as const,
            properties: {
                problem: { type: 'string', description: 'What went wrong' },
                context: { type: 'string', description: 'What Day Day was trying to do' },
                proposedFix: { type: 'string', description: 'What to try next' },
                severity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Failure severity' },
                category: { type: 'string', description: 'Category for future retrieval' },
            },
            required: ['problem', 'context'],
        },
    },
    {
        name: 'dayday_dream',
        description: 'Run a Dream session for Day Day to reflect on SEO telemetry, content performance, and latest trends, then route improvement hypotheses to Linus and Marty for review.',
        input_schema: {
            type: 'object' as const,
            properties: {
                model: { type: 'string', description: 'Optional dream model override. Defaults to cheapest available with fallback.' },
            },
            required: [],
        },
    },
];

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

async function daydayToolExecutor(toolName: string, input: Record<string, unknown>): Promise<unknown> {
    logger.info(`[DayDay] Executing tool: ${toolName}`, { input });

    switch (toolName) {
        case 'get_seo_report': {
            const days = typeof input.days === 'number' ? input.days : 28;
            const limit = typeof input.limit === 'number' ? input.limit : 50;
            const end = new Date();
            const start = new Date(end);
            start.setDate(start.getDate() - days);
            const fmt = (d: Date) => d.toISOString().split('T')[0];
            const report = await searchConsoleService.getTopQueries(fmt(start), fmt(end), limit);
            return {
                totalClicks: report.totalClicks,
                totalImpressions: report.totalImpressions,
                avgPosition: Math.round(report.avgPosition * 10) / 10,
                dateRange: report.dateRange,
                topQueries: report.queries.slice(0, 20).map(q => ({
                    query: q.query,
                    clicks: q.clicks,
                    impressions: q.impressions,
                    ctr: `${(q.ctr * 100).toFixed(1)}%`,
                    position: Math.round(q.position * 10) / 10,
                })),
            };
        }

        case 'find_seo_opportunities': {
            const limit = typeof input.limit === 'number' ? input.limit : 20;
            const opps = await searchConsoleService.findLowCompetitionOpportunities(limit);
            if (!opps.length) return { message: 'No low-competition opportunities found right now — site may need more impressions to surface patterns.' };
            return {
                count: opps.length,
                opportunities: opps.map(o => ({
                    query: o.query,
                    position: Math.round(o.position * 10) / 10,
                    impressions: o.impressions,
                    clicks: o.clicks,
                    ctr: `${(o.ctr * 100).toFixed(1)}%`,
                    opportunity: o.opportunity,
                    reason: o.reason,
                })),
            };
        }

        case 'get_traffic_report': {
            const days = typeof input.days === 'number' ? input.days : 7;
            const report = await googleAnalyticsService.getTrafficReport(`${days}daysAgo`, 'today');
            if (report.error) return { error: report.error, rows: [] };
            const totalSessions = report.rows.reduce((s, r) => s + r.sessions, 0);
            const totalUsers = report.rows.reduce((s, r) => s + r.users, 0);
            return {
                totalSessions,
                totalUsers,
                authMode: report.authMode,
                topPages: report.rows
                    .sort((a, b) => b.sessions - a.sessions)
                    .slice(0, 10)
                    .map(r => ({ path: r.path, sessions: r.sessions, users: r.users, source: r.source })),
            };
        }

        case 'get_page_performance': {
            const pages = Array.isArray(input.pages) ? input.pages.map(String) : [];
            if (!pages.length) return { message: 'Provide at least one page path.' };
            const days = typeof input.days === 'number' ? input.days : 7;
            const end = new Date();
            const start = new Date(end);
            start.setDate(start.getDate() - days);
            const fmt = (d: Date) => d.toISOString().split('T')[0];
            const results = await searchConsoleService.getPagePerformance(pages, fmt(start), fmt(end));
            return Object.entries(results).map(([page, queries]) => ({
                page,
                topQueries: queries.slice(0, 5).map(q => ({
                    query: q.query,
                    clicks: q.clicks,
                    impressions: q.impressions,
                    position: Math.round(q.position * 10) / 10,
                })),
            }));
        }

        case 'research_seo_trends': {
            const topic = typeof input.topic === 'string' ? input.topic.trim() : '';
            const sourceFilter = typeof input.source === 'string' ? input.source : 'all';
            const sources = sourceFilter === 'all'
                ? SEO_SOURCES
                : SEO_SOURCES.filter(s => s.url.includes(sourceFilter) || s.name.toLowerCase().includes(sourceFilter));
            const targetSource = sources[0] ?? SEO_SOURCES[0];

            const researchQuery = topic
                ? `What are the latest articles and insights about "${topic}" on ${targetSource.name}? Summarize the 3 most relevant recent pieces with key takeaways.`
                : `What are the top 3 most recent SEO articles or insights on ${targetSource.name}? Give me the headlines and key takeaways for each.`;

            try {
                const { discovery } = await import('@/server/services/firecrawl');
                const result = await discovery.runAgent(
                    `Visit ${targetSource.url} and ${researchQuery}`,
                    60_000
                );
                if (result.success && result.data) {
                    return { source: targetSource.name, url: targetSource.url, topic: topic || 'general SEO trends', insights: result.data };
                }
            } catch (e) {
                logger.warn('[DayDay] Firecrawl SEO research failed, using fallback', { error: String(e) });
            }

            return {
                source: 'Day Day knowledge base',
                topic: topic || 'general SEO trends',
                insights: topic
                    ? `Unable to fetch live data from ${targetSource.name} right now. Based on established SEO knowledge for "${topic}": focus on E-E-A-T signals, topical authority, and user intent. Consider FAQ schema and structured data for AI Overview citations.`
                    : 'Key 2025 SEO themes: AI Overviews (AIO) citations via structured content + E-E-A-T, topical authority clusters, schema markup (FAQ/Article/HowTo), page experience signals, and cannabis-specific local SEO for dispensaries.',
                note: 'Live fetch unavailable — Firecrawl may be rate limited. Try again in a few minutes.',
            };
        }

        case 'create_blog_post': {
            const keyword = String(input.keyword ?? '').trim();
            if (!keyword) return { error: 'Provide a primary keyword.' };
            const topic = typeof input.topic === 'string' ? input.topic : '';
            const audience = typeof input.audience === 'string' ? input.audience : 'b2b';
            const wordCount = typeof input.wordCount === 'number' ? input.wordCount : 1200;

            const audienceMap: Record<string, string> = {
                dispensary: 'cannabis dispensary owners and managers',
                brand: 'cannabis brand owners and marketing teams',
                general: 'cannabis consumers and enthusiasts',
                b2b: 'cannabis business owners (dispensaries and brands) evaluating software',
            };
            const audienceLabel = audienceMap[audience] ?? 'cannabis business operators';
            const kwTitle = keyword.charAt(0).toUpperCase() + keyword.slice(1);

            return {
                status: 'draft_template',
                keyword,
                audience: audienceLabel,
                wordTarget: wordCount,
                suggestedTitle: `How ${kwTitle} Drives Revenue for Cannabis Dispensaries`,
                metaDescription: `Discover how ${keyword} helps cannabis dispensaries grow sales and retain customers. BakedBot's AI platform makes it simple.`,
                outline: [
                    `H1: How ${kwTitle} Transforms Cannabis Retail`,
                    `H2: What Is ${kwTitle}?`,
                    `H2: Why Cannabis Dispensaries Need ${keyword} in 2025`,
                    topic ? `H2: ${topic}` : `H2: The ROI of ${kwTitle} for Dispensaries`,
                    `H2: How BakedBot Uses ${keyword} to Drive 3x Customer Retention`,
                    `H2: Getting Started: 3 Steps to Implement ${kwTitle}`,
                    `H2: Frequently Asked Questions`,
                    `CTA: Try BakedBot free — no credit card required`,
                ],
                seoNotes: [
                    `Include "${keyword}" in H1, first 100 words, and 2–3 H2s`,
                    'Add internal links to /strains, /pricing, and /dispensaries pages',
                    `Target ~${wordCount} words for topical depth`,
                    'Add FAQ schema markup for AI Overview citations',
                    'Include 1 image with alt text containing keyword',
                ],
                instruction: 'This is a structural outline. Save with save_content_draft, then use submit_for_approval to get Martez\'s sign-off before publishing.',
            };
        }

        case 'optimize_content': {
            const content = String(input.content ?? '').trim();
            const targetKeyword = String(input.targetKeyword ?? '').trim();
            const currentUrl = typeof input.currentUrl === 'string' ? input.currentUrl : null;
            if (!content) return { error: 'Provide content to optimize.' };
            if (!targetKeyword) return { error: 'Provide a target keyword.' };

            const wordCount = content.split(/\s+/).length;
            const occurrences = (content.toLowerCase().match(new RegExp(targetKeyword.toLowerCase(), 'g')) || []).length;
            const density = wordCount > 0 ? (occurrences / wordCount * 100).toFixed(2) : '0';
            const densityNum = parseFloat(density);

            return {
                currentUrl,
                targetKeyword,
                analysis: {
                    wordCount,
                    keywordOccurrences: occurrences,
                    keywordDensityPercent: density,
                    densityStatus: densityNum < 0.5 ? 'too_low' : densityNum > 2.5 ? 'too_high' : 'good',
                },
                recommendations: [
                    densityNum < 0.5 ? `Increase "${targetKeyword}" usage — only ${occurrences} occurrences in ${wordCount} words` : null,
                    `Add "${targetKeyword}" in the first 100 words if not already there`,
                    wordCount < 800 ? 'Expand content to 800+ words for topical depth' : null,
                    'Add FAQ section with keyword-rich questions for AI Overview eligibility',
                    'Include internal links to related BakedBot pages (/strains, /pricing, /dispensaries)',
                    `Meta description should include "${targetKeyword}" and be 150–160 characters`,
                    'Add Article + FAQ schema markup',
                ].filter(Boolean),
                suggestedTitle: `${targetKeyword.charAt(0).toUpperCase() + targetKeyword.slice(1)}: The Complete Guide for Cannabis Dispensaries`,
            };
        }

        case 'save_content_draft': {
            const title = String(input.title ?? '').trim();
            const content = String(input.content ?? '').trim();
            const keyword = String(input.keyword ?? '').trim();
            const contentType = String(input.contentType ?? 'blog_post');
            const status = String(input.status ?? 'draft');
            const metaDescription = typeof input.metaDescription === 'string' ? input.metaDescription : null;
            if (!title || !content || !keyword) return { error: 'title, content, and keyword are required.' };

            const db = getAdminFirestore();
            const now = Date.now();
            const docRef = await db.collection('content_library').add({
                agentId: 'day_day',
                title,
                content,
                keyword,
                contentType,
                status,
                metaDescription,
                wordCount: content.split(/\s+/).length,
                createdAt: now,
                updatedAt: now,
                publishedAt: null,
                gscClicks: 0,
                gscImpressions: 0,
                gscPosition: null,
            });
            return { success: true, id: docRef.id, title, keyword, contentType, status };
        }

        case 'get_content_library': {
            const statusFilter = typeof input.status === 'string' && input.status !== 'all' ? input.status : null;
            const limit = typeof input.limit === 'number' ? Math.min(input.limit, 50) : 20;
            const db = getAdminFirestore();
            let q: FirebaseFirestore.Query = db.collection('content_library')
                .where('agentId', '==', 'day_day')
                .orderBy('createdAt', 'desc')
                .limit(limit);
            if (statusFilter) {
                q = db.collection('content_library')
                    .where('agentId', '==', 'day_day')
                    .where('status', '==', statusFilter)
                    .orderBy('createdAt', 'desc')
                    .limit(limit);
            }
            const snap = await q.get();
            if (snap.empty) return { message: 'No content found in library.', items: [] };
            return {
                count: snap.size,
                items: snap.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        title: data.title,
                        keyword: data.keyword,
                        contentType: data.contentType,
                        status: data.status,
                        wordCount: data.wordCount ?? 0,
                        gscClicks: data.gscClicks ?? 0,
                        gscImpressions: data.gscImpressions ?? 0,
                        gscPosition: data.gscPosition ?? null,
                        createdAt: new Date(data.createdAt).toLocaleDateString(),
                        publishedAt: data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : null,
                    };
                }),
            };
        }

        case 'submit_for_approval': {
            const title = String(input.title ?? '').trim();
            const contentType = String(input.contentType ?? 'blog_post');
            const summary = String(input.summary ?? '').trim();
            const targetKeyword = String(input.targetKeyword ?? '').trim();
            const contentId = typeof input.contentId === 'string' ? input.contentId : null;
            const estimatedImpact = typeof input.estimatedImpact === 'string' ? input.estimatedImpact : null;
            if (!title || !summary || !targetKeyword) return { error: 'title, summary, and targetKeyword are required.' };

            const typeLabels: Record<string, string> = {
                blog_post: 'Blog Post', lead_magnet: 'Lead Magnet', deck: 'Deck',
                landing_page: 'Landing Page', social: 'Social Content',
            };
            const typeLabel = typeLabels[contentType] ?? contentType;

            const { elroySlackService } = await import('@/server/services/communications/slack');
            const channelName = 'ceo';
            const fallbackText = `Day Day has a ${typeLabel} ready for review: "${title}"`;
            const lines = [
                `:writing_hand: *Day Day has content ready for review*`,
                `*Type:* ${typeLabel}`,
                `*Title:* ${title}`,
                `*Target keyword:* \`${targetKeyword}\``,
                `*Summary:* ${summary}`,
                estimatedImpact ? `*Estimated impact:* ${estimatedImpact}` : null,
                contentId ? `*Draft ID:* \`${contentId}\` — full draft in Firestore \`content_library/${contentId}\`` : null,
            ].filter(Boolean).join('\n');

            const blocks: Record<string, unknown>[] = [
                { type: 'section', text: { type: 'mrkdwn', text: lines } },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: { type: 'plain_text', text: 'Approve' },
                            style: 'primary',
                            action_id: 'content_approve',
                            value: JSON.stringify({ contentId, title, contentType }),
                        },
                        {
                            type: 'button',
                            text: { type: 'plain_text', text: 'Decline' },
                            style: 'danger',
                            action_id: 'content_decline',
                            value: JSON.stringify({ contentId, title, contentType }),
                        },
                    ],
                },
            ];

            try {
                const channel = await elroySlackService.findChannelByName(channelName);
                const channelId = channel?.id ?? channelName;
                if (channel?.id) await elroySlackService.joinChannel(channel.id);
                const slackResult = await elroySlackService.postMessage(channelId, fallbackText, blocks);

                if (contentId) {
                    const db = getAdminFirestore();
                    await db.collection('content_library').doc(contentId).update({
                        status: 'pending_approval',
                        updatedAt: Date.now(),
                        approvalSlackTs: slackResult.ts ?? null,
                    }).catch(() => {});
                }

                return {
                    success: true,
                    posted: slackResult.sent,
                    channel: channelName,
                    message: `Approval request posted to #${channelName} for "${title}"`,
                };
            } catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                logger.error('[DayDay] Failed to post approval to Slack', { error });
                return { success: false, error, message: 'Failed to post approval to Slack.' };
            }
        }

        case 'learning_log':
            return daydayLearningTools.learning_log(
                String(input.action ?? ''),
                input.result as 'success' | 'failure' | 'pending' | 'partial',
                typeof input.reason === 'string' ? input.reason : undefined,
                typeof input.nextStep === 'string' ? input.nextStep : undefined,
                typeof input.category === 'string' ? input.category : undefined,
            );

        case 'learning_search':
            return daydayLearningTools.learning_search(
                String(input.query ?? ''),
                typeof input.category === 'string' ? input.category : undefined,
                typeof input.limit === 'number' ? input.limit : undefined,
            );

        case 'notify_agent_problem':
            return daydayLearningTools.notify_agent_problem(
                String(input.problem ?? ''),
                String(input.context ?? ''),
                typeof input.proposedFix === 'string' ? input.proposedFix : undefined,
                input.severity as 'low' | 'medium' | 'high' | undefined,
                typeof input.category === 'string' ? input.category : undefined,
            );

        case 'dayday_dream': {
            const { runDreamSession, notifyDreamReview } = await import('@/server/services/letta/dream-loop');
            const requestedModel = isDreamModel(input.model) ? input.model : undefined;
            const session = await runDreamSession('day_day', requestedModel);
            await notifyDreamReview(session);
            return {
                success: true,
                sessionId: session.id,
                hypotheses: session.hypotheses.length,
                confirmed: session.hypotheses.filter((h: { testResult?: string }) => h.testResult === 'confirmed').length,
                report: session.report,
            };
        }

        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const DAYDAY_SYSTEM_PROMPT = `You are Day Day, BakedBot's Growth & SEO Agent.

You have a dual mandate:
1. *Platform acquisition* — drive organic B2B signups to bakedbot.ai from cannabis dispensaries and brands
2. *Cannabis data authority* — make bakedbot.ai the #1 source for cannabis knowledge (strains, terpenes, lab results, local dispensary pages)

You live in #ceo and answer questions from Martez about BakedBot's search performance, content strategy, and growth opportunities.

WHAT YOU DO:
- Monitor GSC search performance: clicks, impressions, ranking queries
- Find quick-win ranking opportunities (positions 4–30 with real impressions)
- Research what's working in SEO right now — especially AI search (SGE, AI Overviews, citations)
- Create SEO-optimized blog posts, lead magnets, and landing pages targeting B2B cannabis operators
- Optimize existing BakedBot content for better rankings
- Track content performance over time via the GSC→GA4 feedback loop
- Submit content drafts to Martez for approval before publishing

CONTENT APPROVAL WORKFLOW:
When you have content ready — ALWAYS use submit_for_approval before considering it done.
Martez gets the final word on what publishes. Your job is to create, optimize, and propose.

GROWTH PRIORITIES (in order):
1. Blog content targeting dispensary/brand operators: "cannabis dispensary software", "best dispensary POS", "cannabis brand marketing"
2. Cannabis data pages: strain pages, terpene pages, lab result pages — long-tail authority
3. Local SEO: city/state dispensary directory pages — optimize meta and content
4. Backlink strategy: contribute to SEO publications, submit to cannabis directories

SEO PRINCIPLES:
- E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness — lead with data and specifics
- Topical authority: cluster content around core topics (cannabis retail, dispensary ops, compliance)
- AI citations (2025): clear headers, factual statements, FAQ sections → AI Overviews cite us
- Internal linking: every new page links to /strains, /terpenes, /dispensaries, /pricing
- Schema markup: Article, FAQ, LocalBusiness, Organization on all key pages

CONVERSATION RULES:
1. *Always pull live data first.* Before answering performance questions, call get_seo_report or get_traffic_report.
2. *Never give vague answers.* Cite real numbers when available.
3. *Complete every thought.* End with a clear next step or offer.
4. *Use *bold* for emphasis* (Slack mrkdwn, not markdown).
5. *Before repeating any content workflow*, search your learnings for what performed best.
6. *If content is ready for review*, use submit_for_approval — never hold finished work.

OVERNIGHT LEARNING (DREAM):
When asked to dream or run a dream session, use dayday_dream to introspect on SEO telemetry, identify content gaps, and surface improvement hypotheses for Linus and Marty to review.`;

const DAYDAY_AGENT_CONTEXT: AgentContext = {
    name: 'Day Day',
    role: 'Growth & SEO Agent — BakedBot',
    capabilities: [
        'get_seo_report — GSC top queries: clicks, impressions, position',
        'find_seo_opportunities — low-competition quick-win queries (pos 4–30)',
        'get_traffic_report — GA4 sessions, users, top pages',
        'get_page_performance — GSC data for specific BakedBot pages',
        'research_seo_trends — live fetch from Google Search Central, SEL, SEJ, Ahrefs, Semrush',
        'create_blog_post — SEO-optimized blog post outline and draft',
        'optimize_content — improve title, meta, keyword density, internal links',
        'save_content_draft — persist draft to Firestore content_library',
        'get_content_library — list all drafts and published pieces with performance data',
        'submit_for_approval — post to #ceo Slack with Approve/Decline buttons',
        'dayday_dream — overnight dream session: SEO introspection + hypothesis generation',
    ],
    groundingRules: [
        'For SEO performance questions, ALWAYS call get_seo_report or get_traffic_report before answering',
        'For "what should we write about", call find_seo_opportunities first',
        'NEVER publish content without submit_for_approval + Martez sign-off',
        'Include word count and keyword density when reviewing content',
        'Prioritize B2B acquisition keywords over cannabis consumer keywords',
        'When researching trends, use research_seo_trends with the specific topic',
        'After saving a draft, always ask "should I submit this for approval?"',
    ],
};

// ============================================================================
// GLM REFUSAL DETECTION
// ============================================================================

const GLM_REFUSAL_PATTERNS = [
    'security restrictions',
    "i'm unable to assist",
    'i cannot assist',
    'violates our policy',
    'due to content restrictions',
    'content policy',
    'i am unable to help',
    'cannot help with',
];

function isGLMRefusal(result: ClaudeResult): boolean {
    if (!result.content) return false;
    if (result.toolExecutions && result.toolExecutions.length > 0) return false;
    return GLM_REFUSAL_PATTERNS.some(p => result.content.toLowerCase().includes(p));
}

async function notifyGroqRateLimitSlack(failedTier: string): Promise<void> {
    try {
        const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
        await postLinusIncidentSlack({
            source: 'auto-escalator',
            channelName: 'linus-cto',
            fallbackText: `Groq rate limit hit — Day Day falling back from ${failedTier} to Gemini Flash`,
            blocks: [{
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*:warning: Groq Rate Limit*\n*Agent:* Day Day\n*Failed tier:* \`${failedTier}\`\n*Fallback:* Gemini Flash`,
                },
            }],
        });
    } catch (e) {
        logger.warn('[DayDay] Failed to send rate-limit notification', { error: String(e) });
    }
}

// ============================================================================
// PROGRESS MESSAGES
// ============================================================================

function buildDayDayProgressMessage(toolName: string, input: Record<string, unknown>): string {
    switch (toolName) {
        case 'get_seo_report': return '_Day Day is pulling GSC search performance data..._';
        case 'find_seo_opportunities': return '_Day Day is scanning for quick-win ranking opportunities..._';
        case 'get_traffic_report': return '_Day Day is checking GA4 traffic data..._';
        case 'get_page_performance': return `_Day Day is checking GSC performance for ${String(Array.isArray(input.pages) ? input.pages[0] : 'those pages')}..._`;
        case 'research_seo_trends': {
            const t = input.topic ? ` on "${String(input.topic)}"` : '';
            return `_Day Day is fetching the latest SEO insights${t}..._`;
        }
        case 'create_blog_post': return `_Day Day is drafting a blog post targeting "${String(input.keyword ?? '')}"..._`;
        case 'optimize_content': return '_Day Day is analyzing the content for SEO improvements..._';
        case 'save_content_draft': return `_Day Day is saving "${String(input.title ?? '')}" to the content library..._`;
        case 'get_content_library': return '_Day Day is pulling the content library..._';
        case 'submit_for_approval': return `_Day Day is submitting "${String(input.title ?? '')}" for Martez\'s review..._`;
        case 'learning_log': return '_Day Day is logging this outcome..._';
        case 'learning_search': return '_Day Day is searching prior learnings before proceeding..._';
        case 'notify_agent_problem': return '_Day Day is escalating to the learning loop..._';
        case 'dayday_dream': return '_Day Day is dreaming — reflecting on SEO telemetry and forming hypotheses..._';
        default: return `_Day Day is running ${toolName.replace(/_/g, ' ')}..._`;
    }
}

// ============================================================================
// PUBLIC API — Slack invocation
// ============================================================================

export interface DayDayRequest {
    prompt: string;
    context?: { userId?: string };
    maxIterations?: number;
    images?: Array<{ data: string; mimeType: string }>;
    progressCallback?: (msg: string) => Promise<void>;
}

export interface DayDayResponse {
    content: string;
    toolExecutions: ClaudeResult['toolExecutions'];
    model: string;
}

export async function runDayDay(request: DayDayRequest): Promise<DayDayResponse> {
    const hasImages = (request.images?.length ?? 0) > 0;
    const currentDate = new Date().toLocaleDateString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const fullPrompt = `${DAYDAY_SYSTEM_PROMPT}\n\nCurrent date: ${currentDate}\n\n---\n\nUser Request: ${request.prompt}`;

    const onToolCall = request.progressCallback
        ? (toolName: string, input: Record<string, unknown>) =>
              request.progressCallback!(buildDayDayProgressMessage(toolName, input))
        : undefined;

    const { enrichWithCoaching } = await import('@/server/services/coaching-loader');
    const coachedContext = await enrichWithCoaching(DAYDAY_AGENT_CONTEXT);

    const sharedContext = {
        userId: request.context?.userId,
        maxIterations: request.maxIterations ?? 5,
        agentContext: coachedContext,
        onToolCall,
    };

    const modelConfig = await getAgentModelConfig();
    const tierChain: ModelTier[] = [modelConfig.slackTier, ...modelConfig.fallbackChain];
    logger.info('[DayDay] Model chain', { tierChain, hasImages });

    let result: ClaudeResult | null = null;

    for (const tier of tierChain) {
        if (result) break;
        try {
            switch (tier) {
                case 'glm': {
                    if (!isGLMConfigured()) continue;
                    const glmModel = hasImages ? GLM_MODELS.VISION : GLM_MODELS.STANDARD;
                    logger.info(`[DayDay] Trying GLM ${glmModel}`);
                    const glmResult = await executeGLMWithTools(fullPrompt, DAYDAY_TOOLS, daydayToolExecutor, { ...sharedContext, model: glmModel });
                    if (glmResult.content && !isGLMRefusal(glmResult)) {
                        result = glmResult;
                    } else {
                        logger.warn('[DayDay] GLM unusable', { reason: !glmResult.content ? 'empty' : 'refused' });
                    }
                    break;
                }
                case 'gemini': {
                    if (!isGLMConfigured()) continue;
                    const geminiModel = hasImages ? GLM_MODELS.VISION : GLM_MODELS.EXTRACTION;
                    logger.info(`[DayDay] Trying GLM budget ${geminiModel}`);
                    const r = await executeGLMWithTools(fullPrompt, DAYDAY_TOOLS, daydayToolExecutor, { ...sharedContext, model: geminiModel });
                    if (r.content && !isGLMRefusal(r)) {
                        result = r;
                    } else {
                        logger.warn('[DayDay] GLM budget unusable', { reason: !r.content ? 'empty' : 'refused' });
                    }
                    break;
                }
                case 'gemini-flash': {
                    if (!isGeminiFlashConfigured()) continue;
                    logger.info('[DayDay] Trying Gemini Flash');
                    result = await executeGeminiFlashWithTools(fullPrompt, DAYDAY_TOOLS, daydayToolExecutor, sharedContext);
                    break;
                }
                case 'haiku': {
                    if (!isClaudeAvailable()) continue;
                    logger.info('[DayDay] Trying Claude Haiku');
                    result = await executeWithTools(fullPrompt, DAYDAY_TOOLS, daydayToolExecutor, { ...sharedContext, model: 'claude-haiku-4-5-20251001', imageAttachments: request.images });
                    break;
                }
                case 'sonnet': {
                    if (!isClaudeAvailable()) continue;
                    logger.info('[DayDay] Trying Claude Sonnet');
                    result = await executeWithTools(fullPrompt, DAYDAY_TOOLS, daydayToolExecutor, { ...sharedContext, model: 'claude-sonnet-4-6', imageAttachments: request.images });
                    break;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate limit');
            logger.error(`[DayDay] Tier ${tier} failed`, { error: msg, isRateLimit });
            if (isRateLimit && (tier === 'glm' || tier === 'gemini')) {
                notifyGroqRateLimitSlack(tier).catch(() => {});
            }
        }
    }

    if (!result) {
        throw new Error('All AI providers failed for Day Day. Check API keys and credits.');
    }

    // Synthesize if tools ran but content is empty
    if (!result.content && result.toolExecutions && result.toolExecutions.length > 0) {
        logger.info('[DayDay] Tools ran but empty content — synthesizing');
        const summary = result.toolExecutions
            .map((t) => `• *${String((t as any).tool || (t as any).name)}*: ${JSON.stringify((t as any).result || (t as any).output).slice(0, 200)}`)
            .join('\n');
        result = { ...result, content: `Here's what I found:\n\n${summary}\n\n_Need me to dig into any of that?_` };
    }

    return { content: result.content, toolExecutions: result.toolExecutions, model: result.model };
}

// ============================================================================
// AGENT IMPLEMENTATION (CEO Dashboard / harness)
// ============================================================================

export interface DayDayTools {
    getSearchConsoleStats(): Promise<unknown>;
    getGA4Traffic(): Promise<unknown>;
    findSEOOpportunities(): Promise<unknown>;
}

export const dayDayAgent: AgentImplementation<AgentMemory, DayDayTools> = {
    agentName: 'day_day',

    async initialize(_brandMemory, agentMemory) {
        agentMemory.system_instructions = DAYDAY_SYSTEM_PROMPT;
        return agentMemory;
    },

    async orient(_brandMemory, _agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'user_request';
        return null;
    },

    async act(_brandMemory, agentMemory, targetId, _tools, stimulus) {
        if (targetId === 'user_request' && stimulus) {
            try {
                const result = await runDayDay({ prompt: stimulus });
                return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'seo_response', result: result.content, metadata: { model: result.model } },
                };
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Day Day task failed: ${msg}`, metadata: { error: msg } },
                };
            }
        }
        return { updatedMemory: agentMemory, logEntry: { action: 'idle', result: 'Day Day monitoring SEO.' } };
    },
};

export const dayday = dayDayAgent;
