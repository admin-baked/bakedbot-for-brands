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

    {
        name: 'generate_hooks',
        description: 'Generate 10 compelling hooks for any content using 8 proven copywriting frameworks. Each hook is labeled with its framework. Use for email subject lines, social openers, ad headlines, landing page H1s, blog titles, and video intros.',
        input_schema: {
            type: 'object' as const,
            properties: {
                topic: { type: 'string', description: 'The content topic or main message' },
                contentType: { type: 'string', enum: ['email', 'social', 'ad', 'landing_page', 'video', 'blog_title'], description: 'Type of content the hook is for' },
                targetAudience: { type: 'string', description: 'Who this content is for (e.g., "cannabis dispensary owners")' },
                mainBenefit: { type: 'string', description: 'The main promise or benefit to the reader' },
                tone: { type: 'string', enum: ['professional', 'casual', 'urgent', 'playful'], description: 'Desired tone (default: professional)' },
            },
            required: ['topic', 'targetAudience', 'mainBenefit'],
        },
    },

    {
        name: 'optimize_for_aeo',
        description: 'Score content for AI search engine citation potential (ChatGPT, Claude, Perplexity, Gemini). Returns AEO score 1-10, structural weaknesses, 5 specific fixes, Q&A pairs to add, and a rewritten opening section optimized for direct AI citation.',
        input_schema: {
            type: 'object' as const,
            properties: {
                content: { type: 'string', description: 'Full content text to analyze' },
                primaryQuery: { type: 'string', description: 'The primary search query this content should answer (e.g., "dispensary marketing automation")' },
                contentFormat: { type: 'string', enum: ['blog_post', 'landing_page', 'faq', 'product_page', 'guide'], description: 'Content format (default: blog_post)' },
            },
            required: ['content', 'primaryQuery'],
        },
    },

    {
        name: 'build_keyword_strategy',
        description: 'Build a prioritized keyword plan for a topic area. Returns primary keywords with intent + difficulty, long-tail variations, question-based queries, semantic clusters with content angles, and a 30-day content calendar.',
        input_schema: {
            type: 'object' as const,
            properties: {
                topicArea: { type: 'string', description: 'Topic area or product category (e.g., "dispensary CRM", "cannabis loyalty software")' },
                audience: { type: 'string', description: 'Target audience (e.g., "dispensary owners", "cannabis brand managers")' },
                competitorUrls: { type: 'array', items: { type: 'string' }, description: 'Optional competitor URLs to benchmark against' },
                contentTypes: { type: 'array', items: { type: 'string' }, description: 'Content types available (e.g., ["blog_post", "landing_page", "comparison"])' },
            },
            required: ['topicArea', 'audience'],
        },
    },

    {
        name: 'analyze_site_architecture',
        description: 'Review BakedBot\'s content structure and internal linking. Recommends topic clusters, pillar pages, and internal link opportunities. Outputs a prioritized fix order with expected SEO impact.',
        input_schema: {
            type: 'object' as const,
            properties: {
                topPages: { type: 'array', items: { type: 'string' }, description: 'Top page paths to anchor the architecture around (e.g., ["/pricing", "/dispensary-crm"])' },
                primaryTopics: { type: 'array', items: { type: 'string' }, description: 'Main topics the site should own (e.g., ["dispensary CRM", "cannabis loyalty", "dispensary marketing automation"])' },
                contentGoal: { type: 'string', enum: ['acquisition', 'authority', 'mixed'], description: 'Primary content goal (default: acquisition)' },
            },
            required: ['primaryTopics'],
        },
    },

    {
        name: 'identify_content_gaps',
        description: 'Analyze what content competitors have that BakedBot is missing. Returns a competitor strengths table, prioritized gap opportunities by impact, top 10 quick-win content ideas, and long-term pillar opportunities. Always run before creating new content.',
        input_schema: {
            type: 'object' as const,
            properties: {
                competitorUrls: { type: 'array', items: { type: 'string' }, description: 'Competitor URLs to analyze (e.g., ["dutchie.com", "springbig.com", "alpineiq.com"])' },
                myTopics: { type: 'array', items: { type: 'string' }, description: 'Topics BakedBot already covers — used to identify true gaps' },
                contentGoal: { type: 'string', description: 'What gap-filling success looks like (e.g., "operator acquisition keywords", "comparison pages")' },
            },
            required: ['competitorUrls'],
        },
    },

    {
        name: 'repurpose_content',
        description: 'Turn an approved blog post or content piece into platform-specific assets. Returns ready-to-use LinkedIn post, Twitter/X thread structure, newsletter section, and Instagram caption brief. Use after a draft is approved via submit_for_approval.',
        input_schema: {
            type: 'object' as const,
            properties: {
                title: { type: 'string', description: 'Content title' },
                content: { type: 'string', description: 'Full content to repurpose' },
                keyword: { type: 'string', description: 'Primary keyword / topic' },
                platforms: { type: 'array', items: { type: 'string', enum: ['linkedin', 'twitter', 'newsletter', 'instagram'] }, description: 'Platforms to repurpose for (default: all four)' },
                cta: { type: 'string', description: 'Primary CTA for repurposed content (e.g., "Book a demo at bakedbot.ai/book")' },
            },
            required: ['title', 'content', 'keyword'],
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
            const hasH2 = (content.match(/^#{2}\s/gm) || []).length;
            const hasFaq = /faq|frequently asked/i.test(content);
            const hasInternalLinks = content.includes('bakedbot.ai') || content.includes('/pricing') || content.includes('/book');
            const hasMetaDescription = content.toLowerCase().includes('meta description');

            // SEO score 1-10
            let seoScore = 0;
            if (densityNum >= 0.5 && densityNum <= 2.5) seoScore += 2;
            else if (densityNum > 0 && densityNum < 0.5) seoScore += 1;
            if (wordCount >= 1000) seoScore += 2;
            else if (wordCount >= 600) seoScore += 1;
            if (hasH2 >= 3) seoScore += 2;
            else if (hasH2 >= 1) seoScore += 1;
            if (hasFaq) seoScore += 2;
            if (hasInternalLinks) seoScore += 1;
            if (hasMetaDescription) seoScore += 1;
            seoScore = Math.min(10, seoScore);

            const structuralWeaknesses: string[] = [];
            if (!hasFaq) structuralWeaknesses.push('No FAQ section — required for AI Overview eligibility and long-tail question coverage');
            if (hasH2 < 3) structuralWeaknesses.push(`Only ${hasH2} H2 headings — need 4-6 descriptive sections for topical depth`);
            if (wordCount < 800) structuralWeaknesses.push(`${wordCount} words — expand to 800+ for competitive depth`);
            if (densityNum < 0.5) structuralWeaknesses.push(`Keyword density ${density}% is too low — target 0.5-1.5%`);
            if (!hasInternalLinks) structuralWeaknesses.push('No internal links to BakedBot commercial pages (/pricing, /book, /ai-retention-audit)');

            return {
                currentUrl,
                targetKeyword,
                seoScore,
                seoScoreLabel: seoScore >= 8 ? 'Strong' : seoScore >= 5 ? 'Moderate' : 'Needs Work',
                analysis: {
                    wordCount,
                    keywordOccurrences: occurrences,
                    keywordDensityPercent: density,
                    densityStatus: densityNum < 0.5 ? 'too_low' : densityNum > 2.5 ? 'too_high' : 'good',
                    h2Count: hasH2,
                    hasFaq,
                    hasInternalLinks,
                },
                topWeaknesses: structuralWeaknesses.slice(0, 3),
                recommendations: [
                    densityNum < 0.5 ? `Increase "${targetKeyword}" usage — only ${occurrences} occurrences in ${wordCount} words (target 0.5-1.5%)` : null,
                    `Add "${targetKeyword}" in the first 100 words if not already there`,
                    wordCount < 800 ? 'Expand content to 800+ words for topical depth' : null,
                    !hasFaq ? 'Add FAQ section (3-5 Q&A pairs) — critical for AI Overview and voice search' : null,
                    !hasInternalLinks ? 'Add internal links to /pricing, /book, /ai-retention-audit, /dispensary-crm' : null,
                    `Meta description: include "${targetKeyword}", 150-160 characters, end with a benefit statement`,
                    'Add Article schema + BreadcrumbList schema markup',
                    'Run optimize_for_aeo next to check AI citation readiness',
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

        case 'generate_hooks': {
            const topic = String(input.topic ?? '').trim();
            const contentType = String(input.contentType ?? 'social');
            const targetAudience = String(input.targetAudience ?? '').trim();
            const mainBenefit = String(input.mainBenefit ?? '').trim();
            const tone = String(input.tone ?? 'professional');
            if (!topic) return { error: 'topic is required.' };
            if (!targetAudience) return { error: 'targetAudience is required.' };
            if (!mainBenefit) return { error: 'mainBenefit is required.' };

            return {
                status: 'hook_brief',
                topic,
                contentType,
                targetAudience,
                mainBenefit,
                tone,
                frameworks: [
                    { name: 'Curiosity Gap', instruction: 'Hint at information without revealing it. Make the reader feel they\'re missing something important.' },
                    { name: 'Pain-Agitation-Solution', instruction: 'Name the pain, amplify why it hurts, then hint at the solution.' },
                    { name: 'Benefit-Driven', instruction: 'Lead with the specific concrete outcome the reader will get. No vague promises.' },
                    { name: 'Contrarian', instruction: 'Challenge a common assumption in the target audience\'s world. Be provocative but defensible.' },
                    { name: 'Specific Numbers', instruction: 'Use a precise number or stat for instant credibility (e.g., "3.4x", "$12,000", "47%").' },
                    { name: 'Question + Benefit', instruction: 'Ask a yes-inducing question that implies the benefit.' },
                    { name: 'Social Proof', instruction: 'Reference what peers or successful operators are doing that makes this urgent.' },
                    { name: 'Urgency/FOMO', instruction: 'Show what they\'ll lose or fall behind on by not knowing this now.' },
                ],
                rules: [
                    'Generate exactly 10 hooks, label each with [Framework Name]',
                    'Under 100 characters when possible',
                    `At least 2 hooks must challenge ${targetAudience} category norms`,
                    'Never use: "game-changer," "revolutionary," "unlock," "dive into," or "leverage"',
                    `Tone: ${tone}`,
                    `Content type guidance for ${contentType}: ${{ email: 'These are subject lines — stop the inbox scroll', social: 'First line before the "more" button — 2 seconds to earn the click', ad: 'Headline competing with everything else on screen', landing_page: 'H1 — first thing the visitor reads after clicking an ad', video: 'First 3 words or video title', blog_title: 'Must signal value AND support keyword ranking' }[contentType] ?? 'Adapt to platform norms'}`,
                ],
                instruction: `Generate 10 hooks for this content. Topic: "${topic}". Main benefit: "${mainBenefit}". Target audience: ${targetAudience}. Use each of the 8 frameworks at least once (use 2 frameworks twice). Label every hook with [Framework Name] in brackets.`,
            };
        }

        case 'optimize_for_aeo': {
            const content = String(input.content ?? '').trim();
            const primaryQuery = String(input.primaryQuery ?? '').trim();
            const contentFormat = String(input.contentFormat ?? 'blog_post');
            if (!content) return { error: 'Provide content to analyze.' };
            if (!primaryQuery) return { error: 'Provide the primary query this content should answer.' };

            const wordCount = content.split(/\s+/).length;
            const questionCount = (content.match(/\?/g) || []).length;
            const headingCount = (content.match(/^#{1,4}\s/gm) || []).length;
            const listCount = (content.match(/^[-*•]\s/gm) || []).length;
            const hasDirectAnswer = content.toLowerCase().slice(0, 300).includes(primaryQuery.toLowerCase().split(' ')[0]);
            const queryWords = primaryQuery.toLowerCase().split(/\s+/);
            const queryPresence = queryWords.filter(w => w.length > 3 && content.toLowerCase().includes(w)).length / queryWords.filter(w => w.length > 3).length;
            const hasDataCitation = /\d+%|\d+x|\$[\d,]+|\baccording to\b|\bstudy shows\b|\bresearch shows\b/i.test(content);
            const hasFaq = /faq|frequently asked/i.test(content);
            const hasSchema = /schema|json-ld|structured data/i.test(content);

            let aeoScore = 0;
            if (questionCount >= 3) aeoScore += 2; else if (questionCount >= 1) aeoScore += 1;
            if (headingCount >= 4) aeoScore += 2; else if (headingCount >= 2) aeoScore += 1;
            if (wordCount >= 1000) aeoScore += 2; else if (wordCount >= 600) aeoScore += 1;
            if (queryPresence >= 0.8) aeoScore += 2; else if (queryPresence >= 0.5) aeoScore += 1;
            if (hasDirectAnswer) aeoScore += 1;
            if (hasDataCitation) aeoScore += 1;
            if (hasFaq) aeoScore += 1;
            if (listCount >= 3) aeoScore += 1;
            aeoScore = Math.min(10, aeoScore);

            const weaknesses: string[] = [];
            if (!hasDirectAnswer) weaknesses.push('No direct answer in the opening — AI models pull the first clear definition or answer as the summary');
            if (questionCount < 3) weaknesses.push('Fewer than 3 explicit questions — AEO requires content that states and answers questions directly');
            if (headingCount < 4) weaknesses.push('Sparse headings — need 4+ descriptive H2/H3s matching likely search queries');
            if (!hasDataCitation) weaknesses.push('No data citations — AI models prefer content with specific numbers, percentages, or named sources');
            if (!hasFaq) weaknesses.push('No FAQ section — Q&A format is the highest-probability AEO citation trigger');
            if (queryPresence < 0.8) weaknesses.push(`Primary query "${primaryQuery}" weakly covered — strengthen semantic density`);

            return {
                primaryQuery,
                contentFormat,
                aeoScore,
                aeoScoreLabel: aeoScore >= 8 ? 'Strong (likely to be cited)' : aeoScore >= 5 ? 'Moderate (partial citation risk)' : 'Weak (unlikely to be cited)',
                contentMetrics: { wordCount, questionCount, headingCount, listCount, hasDirectAnswer, hasDataCitation, hasFaq },
                topWeaknesses: weaknesses.slice(0, 3),
                fiveImmediateFixes: [
                    `Add a 2-3 sentence direct answer to "${primaryQuery}" at the very top (before any other content) — AI models pull this as the summary snippet`,
                    hasFaq ? 'Expand the FAQ section to 5-7 Q&A pairs using exact question phrasing from search queries' : 'Add a "Frequently Asked Questions" section at the bottom with 5 Q&A pairs — format: **Q:** ... **A:** ...',
                    headingCount < 4 ? 'Convert at least 3 headings to question format: "What is X?" instead of "X Overview"' : 'Add "Who should use X?" and "When does X make sense?" as H2 questions',
                    !hasDataCitation ? 'Add at least one specific stat or data point (e.g., Thrive Syracuse metrics, or a cited industry benchmark)' : 'Move the most compelling data point into the first 150 words',
                    `Add entity-based language: name specific tools (Alleaves, Dutchie, Treez), locations, and standards related to "${primaryQuery}"`,
                ],
                qaPairsToAdd: [
                    { q: `What is ${primaryQuery}?`, a: `[2-sentence definition written for ${contentFormat === 'landing_page' ? 'a buyer' : 'a general reader'} — lead with outcome, not features]` },
                    { q: `How does ${primaryQuery} work?`, a: '[3-5 step process or mechanism explanation]' },
                    { q: `Why do cannabis dispensaries need ${primaryQuery}?`, a: '[Outcome-focused answer. Reference Thrive Syracuse if applicable.]' },
                    { q: `What\'s the difference between ${primaryQuery} and manual processes?`, a: '[Specific comparison with at least one quantified difference]' },
                    { q: `How much does ${primaryQuery} cost?`, a: '[Honest range answer — direct to /pricing for details]' },
                ],
                instruction: `AEO score is ${aeoScore}/10. Review the top weaknesses and 5 fixes. Rewrite the opening paragraph as a direct authoritative answer to "${primaryQuery}". Then generate the 5 Q&A pairs above formatted for inclusion at the end of the content. Run save_content_draft after revision, then submit_for_approval.`,
            };
        }

        case 'build_keyword_strategy': {
            const topicArea = String(input.topicArea ?? '').trim();
            const audience = String(input.audience ?? '').trim();
            const contentTypes = Array.isArray(input.contentTypes) ? input.contentTypes.map(String) : ['blog_post', 'landing_page'];
            if (!topicArea) return { error: 'topicArea is required.' };
            if (!audience) return { error: 'audience is required.' };

            const slug = topicArea.toLowerCase().replace(/\s+/g, '-');
            return {
                topicArea,
                audience,
                strategy: {
                    primaryKeywords: [
                        { keyword: topicArea, intent: 'commercial', difficulty: 'medium', volume: 'low-medium', angle: `What ${audience} need to know about ${topicArea}` },
                        { keyword: `best ${topicArea}`, intent: 'commercial', difficulty: 'medium', volume: 'low', angle: 'Comparison and selection guide' },
                        { keyword: `${topicArea} for dispensaries`, intent: 'commercial', difficulty: 'low-medium', volume: 'low', angle: 'Cannabis-specific use case guide' },
                        { keyword: `how to choose ${topicArea}`, intent: 'informational', difficulty: 'low', volume: 'low', angle: "Buyer's guide with decision criteria" },
                        { keyword: `${topicArea} ROI cannabis`, intent: 'commercial', difficulty: 'low', volume: 'low', angle: 'Data-backed proof story with Thrive Syracuse' },
                    ],
                    longTailVariations: [
                        `${topicArea} for small cannabis dispensaries`,
                        `affordable ${topicArea} dispensary`,
                        `${topicArea} Alleaves integration`,
                        `${topicArea} Dutchie integration`,
                        `how does ${topicArea} work cannabis retail`,
                        `${topicArea} vs manual process dispensary`,
                        `cannabis dispensary ${topicArea} guide 2026`,
                    ],
                    questionKeywords: [
                        `what is ${topicArea}`,
                        `why do dispensaries need ${topicArea}`,
                        `how much does ${topicArea} cost`,
                        `does ${topicArea} work with Alleaves`,
                        `best ${topicArea} for cannabis dispensaries`,
                        `how to set up ${topicArea} dispensary`,
                    ],
                    semanticClusters: [
                        { cluster: `${topicArea} basics`, pillar: `/${slug}`, pillarTitle: `What is ${topicArea}`, supporting: ['how-it-works', 'key-features', 'common-questions'] },
                        { cluster: `${topicArea} for cannabis`, pillar: `/${slug}-for-dispensaries`, pillarTitle: `${topicArea} for Dispensaries`, supporting: ['compliance', 'state-specific-needs', 'pos-integration'] },
                        { cluster: `${topicArea} proof`, pillar: `/${slug}-roi`, pillarTitle: `${topicArea} ROI`, supporting: ['case-studies', 'benchmarks', 'thrive-syracuse'] },
                        { cluster: `${topicArea} comparison`, pillar: `/vs/${slug}`, pillarTitle: `Best ${topicArea} Comparison`, supporting: ['vs-competitors', 'features-matrix', 'pricing-comparison'] },
                    ],
                    contentAngles: Object.fromEntries(contentTypes.map(ct => [ct, ({
                        blog_post: `Educational guides for informational intent — rank for "how to" and "what is" queries`,
                        landing_page: `Operator acquisition pages — exact-match commercial intent, Thrive proof point, CTA to /book or /ai-retention-audit`,
                        comparison: `Vs. and alternative pages — capture high-intent buyers comparing options`,
                        case_study: `Thrive Syracuse proof — ${topicArea} impact in real numbers with operator quotes`,
                        faq: `Long-tail question coverage — captures voice search and AI Overview traffic`,
                    } as Record<string, string>)[ct] ?? `${ct} adapted to ${audience}`])),
                    thirtyDayCalendar: [
                        { week: 1, task: 'Index hygiene audit', output: 'Fix list for broken/stale pages blocking rankings', priority: 'P0' },
                        { week: 2, task: 'Primary landing page', output: `Draft: "${topicArea} for Cannabis Dispensaries" — operator acquisition page`, priority: 'P1' },
                        { week: 3, task: 'Supporting blog post', output: `Draft: "How ${topicArea} increases repeat visits at cannabis dispensaries" — proof-driven`, priority: 'P1' },
                        { week: 4, task: 'Comparison page', output: `Draft: "BakedBot vs [top competitor] for ${topicArea}" — comparison intent`, priority: 'P2' },
                    ],
                },
                instruction: `Review this strategy. Run find_seo_opportunities first to validate which clusters already have traction in GSC. Then prioritize bottom-funnel landing pages before blog posts. Always run identify_content_gaps before creating new content to confirm the gap exists.`,
            };
        }

        case 'analyze_site_architecture': {
            const topPages = Array.isArray(input.topPages) ? input.topPages.map(String) : [];
            const primaryTopics = Array.isArray(input.primaryTopics) ? input.primaryTopics.map(String) : [];
            const contentGoal = String(input.contentGoal ?? 'acquisition');
            if (!primaryTopics.length) return { error: 'Provide at least one primary topic.' };

            const commercialPages = ['/pricing', '/book', '/ai-retention-audit', '/dispensary-crm'];
            return {
                primaryTopics,
                contentGoal,
                currentDiagnosis: {
                    acquisitionStrength: 'Needs bottom-funnel landing pages for exact operator queries — current structure skews toward generic pages',
                    internalLinking: `Commercial pages (${commercialPages.join(', ')}) need 2+ inbound links from high-traffic content pages`,
                    missingPages: primaryTopics.map(t => `/${t.toLowerCase().replace(/\s+/g, '-')}-for-dispensaries — dedicated operator acquisition page`),
                    indexHygieneRisks: [
                        '/signin, /super-admin, /baked-crm/ — should be noindex',
                        'Any stale pricing pages referencing legacy tiers (Scout/Pro/Growth/Empire) — update or noindex',
                        'Check for trailing-slash duplication: /pricing and /pricing/ should not both be indexed with different content',
                    ],
                },
                topicClusters: primaryTopics.map(topic => {
                    const slug = topic.toLowerCase().replace(/\s+/g, '-');
                    return {
                        pillarPage: `/${slug}-for-dispensaries`,
                        pillarTitle: `${topic} for Cannabis Dispensaries`,
                        intent: 'commercial',
                        supporting: [`/blog/${slug}-guide`, `/blog/${slug}-roi`, `/blog/${slug}-vs-manual`],
                        inboundLinksNeeded: ['/blog/*', '/strains/*'],
                        outboundLinksRequired: [...commercialPages],
                    };
                }),
                internalLinkMap: {
                    fromHighTraffic: topPages.length ? topPages : ['/blog/*', '/strains/*', '/terpenes/*'],
                    toCommercial: commercialPages,
                    rule: 'Every data/authority page must contain at least 2 links to commercial acquisition pages',
                    anchorTextGuidance: 'Use descriptive anchor text matching operator queries (e.g., "dispensary loyalty software" not "click here")',
                },
                priorityFixOrder: [
                    { priority: 1, action: 'Run index hygiene audit — flag noindex candidates and broken pages before creating any new content', impact: 'Unblocks existing pages from ranking' },
                    { priority: 2, action: `Create pillar page for primary topic: /${primaryTopics[0]?.toLowerCase().replace(/\s+/g, '-')}-for-dispensaries`, impact: 'Bottom-funnel acquisition traffic' },
                    { priority: 3, action: 'Add 2 internal links from /blog/* to each commercial page', impact: 'Passes authority to conversion pages' },
                    { priority: 4, action: 'Create comparison page: /vs/[top-competitor]', impact: 'High-intent buyer traffic' },
                    { priority: 5, action: 'Add BreadcrumbList schema to all pages for hierarchy clarity', impact: 'AEO + SERP rich result eligibility' },
                ],
            };
        }

        case 'identify_content_gaps': {
            const competitorUrls = Array.isArray(input.competitorUrls) ? input.competitorUrls.map(String) : [];
            const myTopics = Array.isArray(input.myTopics) ? input.myTopics.map(String) : [];
            const contentGoal = String(input.contentGoal ?? 'operator acquisition');
            if (!competitorUrls.length) return { error: 'Provide at least one competitor URL.' };

            const knownPatterns: Record<string, string[]> = {
                'dutchie': ['POS integration guides', 'cannabis ecommerce menu', 'dispensary operations', 'online ordering'],
                'springbig': ['SMS loyalty marketing', 'dispensary marketing automation', 'customer retention cannabis', 'loyalty program setup'],
                'alpineiq': ['loyalty analytics', 'customer data platform cannabis', 'dispensary segmentation', 'retention campaigns'],
                'treez': ['POS software dispensary', 'inventory management cannabis', 'cannabis retail analytics', 'dispensary software'],
                'cova': ['cannabis POS', 'compliance software', 'dispensary operations'],
                'flowhub': ['dispensary software', 'cannabis retail platform', 'POS cannabis'],
            };

            const competitorStrengths = competitorUrls.map(url => {
                const domain = url.replace(/https?:\/\//, '').split('/')[0].toLowerCase();
                const match = Object.entries(knownPatterns).find(([k]) => domain.includes(k));
                return {
                    url,
                    domain,
                    knownContentStrengths: match ? match[1] : ['Check their /blog and /resources pages — use research_seo_trends with their domain name'],
                    weakness: 'Most cannabis SaaS competitors focus on features, not operator outcomes — BakedBot\'s proof-first approach (Thrive Syracuse) is differentiating',
                };
            });

            return {
                competitorUrls,
                contentGoal,
                competitorStrengths,
                gapOpportunities: [
                    { topic: 'Cannabis dispensary marketing automation comparison', gapType: 'No competitor owns the comparison with real outcome data', difficulty: 'medium', impact: 'high', angle: 'BakedBot vs. Springbig vs. Alpine IQ — Thrive Syracuse results vs. industry averages', keyword: 'dispensary marketing automation comparison' },
                    { topic: 'Dispensary customer retention strategies 2026', gapType: 'Competitors have thin, outdated guides', difficulty: 'low', impact: 'high', angle: 'Data-backed with Thrive retention metrics', keyword: 'dispensary customer retention strategies' },
                    { topic: 'Cannabis loyalty program ROI calculator', gapType: 'Nobody has an interactive tool', difficulty: 'medium', impact: 'high', angle: 'Embed calculator at /ai-retention-audit', keyword: 'cannabis loyalty program ROI' },
                    { topic: 'Dispensary CRM for Alleaves users', gapType: 'No competitor content targets Alleaves-specific operators', difficulty: 'low', impact: 'medium', angle: 'BakedBot + Alleaves integration guide — practical for our actual customers', keyword: 'dispensary CRM Alleaves integration' },
                    { topic: 'Cannabis SMS compliance by state 2026', gapType: 'Most compliance guides are 2023-era and TCPA-generic', difficulty: 'medium', impact: 'medium', angle: 'Deebo-verified state-by-state guide', keyword: 'cannabis SMS marketing compliance' },
                ],
                topTenQuickWins: [
                    ...(myTopics.slice(0, 3).map(t => ({ title: `${t} — the operator guide`, reason: 'Already have existing authority or page to upgrade', difficulty: 'low', keyword: t }))),
                    { title: 'BakedBot vs Springbig — which is right for your dispensary?', reason: 'High commercial intent, Springbig is direct competitor', difficulty: 'low', keyword: 'springbig alternative dispensary' },
                    { title: 'How to increase dispensary repeat visits by 30%', reason: 'Thrive Syracuse data makes this defensible', difficulty: 'low', keyword: 'increase dispensary repeat customers' },
                    { title: 'Cannabis loyalty program ideas that drive repeat visits', reason: 'High search volume, weak competitor content', difficulty: 'low', keyword: 'cannabis loyalty program ideas dispensary' },
                    { title: 'What is dispensary CRM software (and do you need one)?', reason: 'Top-of-funnel awareness, no strong owner in SERPs', difficulty: 'low', keyword: 'dispensary CRM software' },
                    { title: 'Alleaves POS review 2026 — is it right for your dispensary?', reason: 'Our customers use Alleaves — high relevance, low competition', difficulty: 'low', keyword: 'Alleaves POS review' },
                    { title: 'Cannabis customer segmentation: beginner\'s guide for dispensaries', reason: 'Informational + feeds commercial pages', difficulty: 'low', keyword: 'cannabis customer segmentation dispensary' },
                    { title: 'How BakedBot drove 23% more repeat visits at Thrive Syracuse', reason: 'Case study — hardest to compete with, builds trust', difficulty: 'low', keyword: 'dispensary customer retention case study' },
                ].slice(0, 10),
                longTermPillarOpportunities: [
                    'Dispensary Marketing Hub — pillar covering acquisition, retention, and campaigns with 8-10 supporting articles',
                    'Cannabis Loyalty & Retention Center — all retention content in a topical cluster with Thrive as anchor proof',
                    'Dispensary Software Comparison Hub — vs. pages for Springbig, Alpine IQ, Dutchie, Treez, Cova',
                ],
                instruction: 'Use research_seo_trends to validate the top 3 gap opportunities with real search data. Then prioritize by: (1) bottom-funnel commercial intent first, (2) pages where Thrive Syracuse data gives unique defensibility, (3) comparison pages for known competitors. Create briefs with build_keyword_strategy, then draft via create_blog_post, then submit_for_approval.',
            };
        }

        case 'repurpose_content': {
            const title = String(input.title ?? '').trim();
            const content = String(input.content ?? '').trim();
            const keyword = String(input.keyword ?? '').trim();
            const platforms = Array.isArray(input.platforms) ? input.platforms.map(String) : ['linkedin', 'twitter', 'newsletter', 'instagram'];
            const cta = typeof input.cta === 'string' ? input.cta : 'Learn more at bakedbot.ai/book';
            if (!title || !content || !keyword) return { error: 'title, content, and keyword are required.' };

            const wordCount = content.split(/\s+/).length;
            const firstParagraph = content.split(/\n+/).find(p => p.trim().length > 50)?.trim().slice(0, 300) ?? content.slice(0, 300);

            const platformBriefs: Record<string, unknown> = {};
            if (platforms.includes('linkedin')) {
                platformBriefs['linkedin'] = {
                    format: 'Insight-driven post, 150-300 words',
                    hookRule: `Start with a bold claim or surprising stat from "${title}". No "I'm excited to share" openers.`,
                    structure: ['Hook (1-2 sentences — most contrarian or specific claim)', '3-4 key takeaways as short paragraphs or bullet points', 'One real data point or operator outcome', `CTA: "${cta}"`],
                    hashtagNote: '3-5 hashtags max: #cannabis #dispensary #cannabisbusiness + 1 keyword-specific',
                    charLimit: 3000,
                };
            }
            if (platforms.includes('twitter')) {
                platformBriefs['twitter'] = {
                    format: '6-8 tweet thread, each tweet under 240 chars',
                    hookRule: `Tweet 1: The most surprising claim or stat in "${title}". Make it stand alone.`,
                    structure: ['Tweet 1: Hook — bold claim that earns the thread', 'Tweets 2-6: One key point each (short, punchy)', 'Tweet 7: Synthesis or "the real insight is..."', `Tweet 8: CTA with link — "${cta}"`],
                    hashtagNote: '1-2 hashtags only, in the CTA tweet',
                };
            }
            if (platforms.includes('newsletter')) {
                platformBriefs['newsletter'] = {
                    format: '120-150 words max, warm but sharp tone',
                    structure: [`Subject line: curiosity-driving about ${keyword} (under 50 chars)`, 'Opening: why this matters right now (1-2 sentences)', `Body: the single most actionable insight from "${title}" (3-5 sentences)`, `CTA: "${cta}" — make it feel like a natural next step, not a pitch`],
                    wordLimit: 150,
                    note: 'One idea only. If there are 3 insights, save the other 2 for future issues.',
                };
            }
            if (platforms.includes('instagram')) {
                platformBriefs['instagram'] = {
                    format: 'Caption 125-150 words + carousel concept',
                    hookRule: `First line must work without the "more" button. Use the biggest stat or insight from "${title}".`,
                    captionStructure: ['Hook — bold first line (under 125 chars)', '3-4 short insight lines', `CTA: "${cta}"`],
                    carouselConcept: {
                        slide1: 'Hook — same as first caption line (large text on brand background)',
                        slides2to5: 'Key point per slide — short sentence + visual/icon',
                        lastSlide: `CTA — "${cta}" with swipe-up or link-in-bio`,
                    },
                    hashtagNote: '20-25 hashtags in the FIRST COMMENT, not the caption',
                };
            }

            return {
                sourceTitle: title,
                keyword,
                wordCount,
                firstParagraph,
                platformBriefs,
                suggestedHook: `The ${keyword} insight most dispensary operators miss: [strongest claim from "${title}"]`,
                instruction: `Use the platform briefs above to generate each asset from the source content. Vary the angle across platforms — same insight, different framing. Once assets are ready, pass social content to Craig via the agent collaboration channel for posting. Do NOT post directly — Craig handles publication.`,
            };
        }

        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const DAYDAY_SYSTEM_PROMPT = `You are Day Day, BakedBot's Growth & SEO Agent and organic pipeline operator.

You have a dual mandate, but the order matters:
1. *Platform acquisition* — earn qualified organic pipeline from dispensary operators searching for solutions
2. *Cannabis data authority* — build a moat of operator-relevant knowledge that feeds the commercial pages above

You live in #ceo and answer questions from Martez about BakedBot's search performance, SEO health, content strategy, and growth opportunities.

=== NORTH STAR: QUALIFIED ORGANIC PIPELINE ===
Track these metrics first: demo/audit requests from organic, qualified opportunities created, ARR influenced.
Track impressions, clicks, rankings second. Raw traffic from strain/terpene pages that never converts is noise.

=== WORK SPLIT (until query volume matures) ===
- 40% Index hygiene — find and surface broken, duplicate, stale, or leaking pages for dev to fix
- 40% Bottom-funnel landing pages — exact-match operator acquisition pages
- 15% Comparison + integration pages — Dutchie, Springbig, Alpine IQ, Treez, Alleaves
- 5% Authority/moat pages — only when they feed operator pages via internal links

=== GROWTH PRIORITIES (in order) ===
1. *Index hygiene first.* Spot and report: broken pages (SERP promise → 404/error), slash/no-slash duplication, stale pricing pages with wrong offer stack, age-gated B2B routes, indexed admin/internal routes (/baked-crm/, /signin, /super-admin), legacy pricing models (Scout/Pro/Growth/Empire tier pages that contradict current offer stack), broken programmatic city/state links. Surface these as a prioritized fix list to Martez before creating new content.
2. *Bottom-funnel landing pages.* Target exact operator search queries: "dispensary crm", "dispensary marketing automation", "dispensary retention software", "dispensary loyalty software", "cannabis customer data platform", "dispensary software". Each page must have a real proof point (Thrive Syracuse) and a clear CTA → /ai-retention-audit or /book.
3. *Comparison + integration pages.* Operators compare tools. Pages like /integrations/dutchie, /vs/springbig, /vs/alpine-iq earn high-intent traffic and internally link to the commercial offer.
4. *Rescue high-value legacy content.* Before creating anything new, check if an old post covers this topic at a broken or stale URL. Redirecting + updating beats publishing duplicate content.
5. *Authority/moat pages last.* A strain or terpene page is only worth building if it: (a) includes dispensary availability context, (b) internally links to at least one operator acquisition page, (c) supports a local market page. Generic consumer strain reviews are out of scope.

=== PUBLISHING GATE (every page must pass before going live) ===
Before submitting any page for approval, verify:
- [ ] Target URL is live (not 404, age-gated, or behind a login)
- [ ] No trailing-slash duplication (both /page and /page/ don't both exist with different content)
- [ ] No placeholder text, plugin failure messages ("install TablePress"), or template detritus
- [ ] Has real byline ("BakedBot Team" minimum, named author preferred for E-E-A-T)
- [ ] Has at least one proof point (Thrive Syracuse metrics, or specific operator outcome)
- [ ] Has explicit CTA path → /ai-retention-audit, /book, or /pricing
- [ ] Schema type is declared in the brief (Organization + BreadcrumbList for most; LocalBusiness on city/state pages; Product only on true product pages — NOT generic FAQ schema on B2B pages)
- [ ] Internal links: at least 2 inbound from existing high-traffic pages, at least 2 outbound to commercial pages

=== PAGE SPEC TEMPLATE (required for every page brief) ===
Primary keyword | Search intent category (informational/commercial/transactional) | Target persona | Exact H1 promise | Proof asset needed | Internal links in + out | CTA | Schema type

=== SEO PRINCIPLES ===
- E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness — lead with Thrive data, not vague claims
- People-first content: write for dispensary operators with real problems, not for keyword density
- AI Overviews/AI Mode: no special hacks needed — just strong foundations + indexable pages that deserve to be shown
- Schema focus: BreadcrumbList (hierarchy), Organization (company clarity), LocalBusiness (city/state/location pages). Do NOT stuff generic B2B pages with FAQ schema expecting SERP real estate — Google restricts FAQ rich results to health/gov sites
- Internal linking: commercial acquisition pages are the castle; data/moat pages are the walls that feed the castle

=== INDEX HYGIENE RULES ===
The following pages SHOULD be noindex or blocked (flag immediately if you find them live and indexed):
- /baked-crm/ — internal CRM interface
- /signin — auth page (no SEO value)
- /super-admin — internal access page
- Any page with placeholder content or plugin error messages
- Any stale pricing page referencing Scout/Pro/Growth/Empire tiers (legacy, contradicts current offer)
- Any /pricing/[variant] URL that isn't the canonical pricing page

=== CONSUMER CONTENT RULE ===
Consumer strain/terpene content competes with Weedmaps, Leafly, and AllBud — entrenched authorities BakedBot cannot outrank head-to-head. Only build these pages if they: support a local market page, internally link to operator acquisition pages, include dispensary availability context. Never pitch "best indica for sleep" as a BakedBot content play.

=== CONTENT SKILLS ===
You now have a full content skill suite. Use these in order for any new content:
1. *identify_content_gaps* — confirm the gap exists before creating anything new
2. *build_keyword_strategy* — build the semantic cluster and content angle
3. *generate_hooks* — generate 10 hook options before finalizing H1 or title
4. *create_blog_post* — draft the post with the winning hook as H1
5. *optimize_content* — score SEO (1-10) and get prioritized fixes
6. *optimize_for_aeo* — score AEO (1-10) and get AI citation fixes + Q&A pairs
7. *save_content_draft* → *submit_for_approval* — always end with approval request
8. *repurpose_content* — after approval, generate LinkedIn/Twitter/newsletter/Instagram versions and hand off to Craig

For site structure work: *analyze_site_architecture* maps pillar pages, internal links, and index hygiene by topic cluster.

=== CONTENT APPROVAL WORKFLOW ===
When you have content ready — ALWAYS use submit_for_approval before considering it done.
Martez gets the final word on what publishes. Your job is to create, optimize, and propose.

=== CONVERSATION RULES ===
1. *Always pull live data first.* Before answering performance questions, call get_seo_report or get_traffic_report.
2. *Hygiene before creation.* Before proposing new content, check for broken/stale pages to fix first.
3. *Never give vague answers.* Cite real numbers, real URLs, real search volumes when available.
4. *Complete every thought.* End with a specific next step or action item.
5. *Use *bold* for emphasis* (Slack mrkdwn format).
6. *Before repeating any content workflow*, search your learnings for what performed best.
7. *If content is ready for review*, use submit_for_approval — never hold finished work.

=== OVERNIGHT LEARNING (DREAM) ===
When asked to dream or run a dream session, use dayday_dream to: (1) scan for index hygiene issues first, (2) identify missing bottom-funnel pages, (3) surface optimization opportunities on existing commercial pages, (4) generate hypotheses for Linus and Marty to review.`;

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
        'optimize_content — SEO score 1-10, keyword density, structural weaknesses, fixes',
        'optimize_for_aeo — AEO score 1-10, Q&A pairs, AI citation fixes (Skill 11)',
        'generate_hooks — 10 hooks across 8 frameworks for any content type (Skill 1)',
        'build_keyword_strategy — semantic clusters, primary/long-tail keywords, 30-day calendar (Skill 13)',
        'analyze_site_architecture — topic clusters, pillar pages, internal link map (Skill 12)',
        'identify_content_gaps — competitor gap analysis, 10 quick-win ideas, pillar opportunities (Skill 20)',
        'repurpose_content — LinkedIn, Twitter, newsletter, Instagram briefs from approved posts (Skill 4)',
        'save_content_draft — persist draft to Firestore content_library',
        'get_content_library — list all drafts and published pieces with performance data',
        'submit_for_approval — post to #ceo Slack with Approve/Decline buttons',
        'dayday_dream — overnight dream session: SEO introspection + hypothesis generation',
    ],
    groundingRules: [
        'For SEO performance questions, ALWAYS call get_seo_report or get_traffic_report before answering',
        'Before creating any new page, check if a broken or stale page already covers that topic — fix beats duplicate',
        'Before proposing content, run find_seo_opportunities AND check for index hygiene issues first',
        'NEVER publish content without submit_for_approval + Martez sign-off',
        'Run the publishing gate checklist (7 items) before submitting any page for approval',
        'Bottom-funnel operator landing pages take priority over blog posts, strain pages, and terpene pages',
        'B2B pricing and acquisition pages (/pricing, /about, /dispensary-crm, etc.) must never be age-gated — flag to Martez if you find them behind an age wall',
        'Consumer strain/terpene content is only in scope if it feeds an operator acquisition page via internal links',
        'Prioritize B2B acquisition keywords over cannabis consumer keywords',
        'When researching trends, use research_seo_trends with the specific topic',
        'After saving a draft, always ask "should I submit this for approval?"',
        'Index hygiene issues (broken pages, stale pricing, indexed admin routes, slash duplication) should be flagged as a prioritized fix list — they block ranking more than missing content',
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
