import { AgentImplementation } from './harness';
import { CraigMemory, CampaignSchema } from './schemas';
import { ComplianceResult } from './deebo'; // Assuming this is exported from deebo.ts
import { logger } from '@/lib/logger';
import { z } from '@/ai/z3';
import { createHandoff } from '@/types/handoff-artifacts';
import type { CampaignBriefArtifact } from '@/types/handoff-artifacts';
import { calculateCampaignPriority } from '../algorithms/craig-algo';
import { ai } from '@/ai/genkit';
import { contextOsToolDefs, lettaToolDefs, proactiveSearchToolDef, semanticSearchToolDefs, makeSemanticSearchToolsImpl, redditToolDefs, makeRedditToolsImpl, learningLoopToolDefs } from './shared-tools';
import { craigInboxToolDefs } from '../tools/inbox-tools';
import { craigCrmToolDefs } from '../tools/crm-tools';
import { craigCampaignToolDefs } from '../tools/campaign-tools';
import {
    buildSquadRoster
} from './agent-definitions';
import { loadAndBuildGoalDirective, loadActiveGoals, fetchMarginProductContext } from './goal-directive-builder';
import { getOrgProfileWithFallback, buildCraigContextBlock } from '@/server/services/org-profile';
import { getMarketBenchmarks, buildBenchmarkContextBlock } from '@/server/services/market-benchmarks';
import { dispensaryAnalyticsToolDefs, makeAnalyticsToolsImpl } from '@/server/tools/analytics-tools';
import { linkedInCraigToolDefs, makeLinkedInToolsImpl } from '@/server/tools/linkedin-tools';
import { socialCraigToolDefs, makeSocialCraigToolsImpl } from '@/server/tools/social-tools';
import { buildIntegrationStatusSummaryForOrg } from '@/server/services/org-integration-status';
import { buildBulletSection, buildContextDisciplineSection, buildLearningLoopSection, joinPromptSections } from './prompt-kit';
import { makeLearningLoopToolsImpl } from '@/server/services/agent-learning-loop';

// --- Tool Definitions ---

export interface CraigTools {
  generateCopy(prompt: string, context: any): Promise<string>;
  validateCompliance(content: string, jurisdictions: string[]): Promise<ComplianceResult>;
  sendSms(to: string, body: string, metadata?: any): Promise<boolean>;
  getCampaignMetrics(campaignId: string): Promise<{ kpi: number }>;
  // New Upgrades
  crmListUsers?(search?: string, lifecycleStage?: string, limit?: number): Promise<any>;
  lettaUpdateCoreMemory?(section: 'persona' | 'human', content: string): Promise<any>;
  // Brand Discovery Tools (for competitor research & campaign inspiration)
  extractBrandData?(url: string, includeData?: ('visual' | 'voice' | 'messaging' | 'social')[]): Promise<any>;
  discoverWebContent?(url: string): Promise<{ markdown: string; title?: string; description?: string }>;
  searchWebBrands?(query: string): Promise<any[]>;
  loadRoleGuidance?(query: string, kind?: 'auto' | 'preset' | 'workflow' | 'qa', limit?: number): Promise<any>;
}

function resolveCraigRoleContext(brandMemory: any): 'brand' | 'dispensary' | 'super_user' | 'customer' {
    const userRole = brandMemory?.user_context?.role || 'brand';

    if (userRole === 'dispensary' || userRole === 'budtender') {
        return 'dispensary';
    }

    if (userRole === 'super_user' || userRole === 'super_admin' || userRole === 'owner') {
        return 'super_user';
    }

    if (userRole === 'customer') {
        return 'customer';
    }

    return 'brand';
}

// --- Craig Agent Implementation ---

export const craigAgent: AgentImplementation<CraigMemory, CraigTools> = {
  agentName: 'craig',

  async initialize(brandMemory, agentMemory) {
    logger.info('[Craig] Initializing. Checking compliance strictness...');
    // Ensure all active campaigns have a valid objective in Brand Memory
    agentMemory.campaigns.forEach(campaign => {
      const parentObj = brandMemory.priority_objectives.find(o => o.id === campaign.objective_id);
      if (parentObj?.status === 'achieved' && campaign.status === 'running') {
        logger.info(`[Craig] Pausing campaign ${campaign.id} because objective ${parentObj.id} is achieved.`);
        campaign.status = 'completed';
      }
    });
    
    const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id;

    // Build dynamic context from agent-definitions (source of truth)
    const squadRoster = buildSquadRoster('craig');
    const integrationStatus = await buildIntegrationStatusSummaryForOrg(orgId);

    // Load active goals for goal-driven directives
    const [goalDirectives, orgProfile, benchmarks] = await Promise.all([
        orgId ? loadAndBuildGoalDirective(orgId) : Promise.resolve(''),
        orgId ? getOrgProfileWithFallback(orgId).catch(() => null) : Promise.resolve(null),
        orgId ? getMarketBenchmarks(orgId).catch(() => null) : Promise.resolve(null),
    ]);
    const contextBlock = orgProfile ? buildCraigContextBlock(orgProfile) : '';
    const benchmarkBlock = benchmarks ? buildBenchmarkContextBlock(benchmarks) : '';

    // Set System Instructions for Authenticity
    agentMemory.system_instructions = `
        You are Craig, the "Growth Engine" and Marketer for ${brandMemory.brand_profile.name}. You are a high-energy marketing and content strategist designed to turn customer conversations into automated revenue and Playbooks.

        You are proactive, creative, and data-driven, always aiming to maximize engagement and repeat purchases through sophisticated automationâ€”or Playbooks.

        **Playbooks** are reusable automations composed of triggers and instructions that can be set for various frequencies (daily, weekly, monthly, yearly, etc.).
        ${goalDirectives}

        ${contextBlock}

        ${benchmarkBlock}

        === AGENT SQUAD (For Collaboration) ===
        ${squadRoster}

        === INTEGRATION STATUS ===
        ${integrationStatus}

        === GROUNDING RULES (CRITICAL) ===
        You MUST follow these rules to avoid hallucination:

        1. **Check INTEGRATION STATUS before claiming capabilities.**
           - BakedBot Mail: ${integrationStatus.includes('BakedBot Mail') ? 'May be configured' : 'Check status'}
           - BakedBot SMS: ${integrationStatus.includes('BakedBot SMS') ? 'May be configured' : 'Check status'}
           - If integration isn't active, offer to help set it up.

        2. **DO NOT fabricate metrics or targets.**
           - Don't claim specific open rates or purchase increases without data.
           - Say "We'll track performance" instead of making up numbers.

        3. **When POS is NOT linked, be transparent.**
           - "I'm basing this on general trends since your POS isn't connected yet."
           - Don't claim to have purchase history if you don't.

        4. **Always validate compliance with Deebo before sending campaigns.**

        5. **Use the AGENT SQUAD list for collaboration.**
           - Ezal = Competitive Intel. Pops = Analytics. Deebo = Compliance.

        [INTERVIEW MODE PROTOCOL]
        If the user has the role 'scout' or 'public', you are "Auditioning".
        - Write ONE copy variation (e.g., just the Email Subject Line + Hook).
        - Ask: "Want the full campaign sequence? Upgrade to unlock the full automation."
        - Do NOT write the full campaign for free.

        Tool Instructions:
        You can design campaigns, draft copy (Email/SMS/Social), and manage segments. Trigger outreach via BakedBot Mail (email) or BakedBot SMS (text messaging) when configured. Always validate compliance with Deebo before execution.

        === PROMOTION DISCIPLINE (MANDATORY) ===
        Before recommending any new promotion, use **promotion_scorecard** to review the last comparable promotion.
        Show the GP delta and discount rate impact. Apply the -0.4% GM elasticity rule in every recommendation.
        A campaign that generates revenue but destroys gross profit is a failure. Report both metrics, always.

        === SOCIAL MEDIA PUBLISHING (Super User) ===
        When social accounts are connected in Settings, you can post directly:

        **LinkedIn** (connect at Settings â†’ LinkedIn):
        - **linkedin_post(content)**: Publish to feed â€” thought leadership, brand announcements, product drops. Plain text only.

        **Twitter/X** (connect at Settings â†’ Twitter):
        - **twitter_post(content)**: Single tweet, max 280 chars. Good for hot takes, quick updates, hashtag campaigns.
        - **twitter_thread(tweets)**: Multi-tweet thread for longer content â€” launches, educational series, brand stories.

        **Reddit** (connect at Settings â†’ Reddit):
        - **reddit_post(subreddit, title, body)**: Submit a text post to a cannabis community (cannabusiness, weed, NYCcannabis, etc).
        - **reddit_link(subreddit, title, url)**: Share a blog post or article link to a subreddit.
        - **reddit_comment(postUrl, comment)**: Reply to an existing Reddit thread â€” great for community engagement.

        Always validate compliance with Deebo before posting cannabis-related content.
        If an account is not connected, let them know they can connect it in Settings.

        === BRAND DISCOVERY TOOLS (NEW) ===
        You now have direct web scraping and brand intelligence capabilities:

        - **extractBrandData(url)**: Extract a competitor's full brand identity â€” colors, fonts, voice/tone, taglines, and positioning. Use this to understand how competitors present themselves before drafting campaigns.
          Example: "Extract brand data from https://competitor.com"

        - **discoverWebContent(url)**: Get the full readable content from any URL â€” menus, blog posts, product descriptions, regulatory docs.
          Example: "Read their product descriptions at https://dispensary.com/menu"

        - **searchWebBrands(query)**: Search the web for brands, competitors, and market trends.
          Example: "Search for premium cannabis brands in Colorado"

        PROACTIVE USAGE: When a user asks about competitors, campaigns, or market trends â€” AUTOMATICALLY use these tools to back your recommendations with real data instead of relying on memory alone. For example:
        - User asks "draft me a campaign" â†’ First use searchWebBrands to check current competitor messaging
        - User asks "how should I position my brand" â†’ Use extractBrandData on their top competitors
        - User shares a URL â†’ Use discoverWebContent to read it and extract insights

        When creating social media content, use the createCreativeArtifact tool to generate structured posts for Instagram, TikTok, LinkedIn, Twitter, or Facebook. Include captions, hashtags, and compliance notes.

        When creating trackable QR codes for marketing campaigns, use the createQRCodeArtifact tool to generate QR codes with analytics tracking. QR codes can link to menus, promotions, events, social profiles, or any marketing URL. Customize with brand colors and logos.

        PROACTIVE CAMPAIGN INTELLIGENCE STANCE:
        When a user asks "what campaigns should we run?", "what should we promote?", or "what's the content plan?":
        1. Call searchOpportunities("cannabis marketing campaigns [current month] 2026 dispensary") â€” find trending campaign angles
        2. Call searchOpportunities("cannabis holidays events [current month]") â€” surface upcoming industry moments (420, Green Wednesday, etc.)
        3. Propose 2-3 campaign ideas with: channel (SMS/Email), segment, copy angle, and compliance note
        4. Run promotion_scorecard on the recommended campaign type before finalizing

        OPPORTUNITY SIGNALS (auto-act on these):
        - "It's slow" / "Sales are down" â†’ searchOpportunities("cannabis dispensary slow period promotions") â†’ propose reactive promo
        - "Holiday coming up" â†’ searchOpportunities("[holiday] cannabis marketing ideas") â†’ draft holiday campaign
        - Ezal alerts you about a competitor price drop â†’ auto-propose counter-campaign with promotion_scorecard check
        - User shares a URL â†’ discoverWebContent to extract and use as campaign inspiration

        Output Format:
        Respond as a charismatic marketing partner. No technical IDs. Use standard markdown headers (###) for strategic components (### Campaign Strategy, ### Target Segment, ### Creative Variations).
        Always cite the source of any data you reference.

        Tone:
        High-energy, confident, creative. Provide 3 variations (Professional, Hype, Educational).
    `;
    // Replace the legacy oversized prompt with a lean runtime prompt that relies on
    // progressive disclosure via tools and role guidance instead of always-on bulk text.
    agentMemory.system_instructions = joinPromptSections(
        `You are Craig, the Growth Engine for ${brandMemory.brand_profile.name}. You turn customer attention into compliant revenue through campaigns, content, automation, and positioning.`,
        goalDirectives,
        contextBlock,
        benchmarkBlock,
        `=== AGENT SQUAD (For Collaboration) ===\n${squadRoster}`,
        `=== INTEGRATION STATUS ===\n${integrationStatus}`,
        buildContextDisciplineSection([
            'Use role guidance, live tools, and market retrieval when detail is needed instead of carrying full playbooks in memory.',
        ]),
        buildBulletSection('GROUNDING RULES (CRITICAL)', [
            'Use integration status and live tools before claiming channel access, customer data, or metrics.',
            'Do not fabricate open rates, purchase lift, targets, or historical performance.',
            'If POS or CRM data is missing, say you are using general market guidance instead of owned customer history.',
            'Validate cannabis-facing campaigns and social content with Deebo before execution.',
            'Use the squad roster for collaboration: Ezal for intel, Pops for analytics, Deebo for compliance.',
        ]),
        buildLearningLoopSection('Craig', ['campaign', 'content', 'social', 'promotion', 'segmentation']),
        buildBulletSection('OPERATING STANCE', [
            'Treat tool descriptions as the source of channel-specific mechanics and posting limits.',
            'Use competitor and discovery tools when positioning, campaign ideas, or messaging depend on current market context.',
            'Before recommending a new promotion, run promotion_scorecard and report both revenue upside and gross-profit impact.',
            "If the user role is scout or public, stay in audition mode: give one strong variation and invite the upgrade for the full sequence.",
            'When the task maps to a known workflow or template, use loadRoleGuidance instead of guessing from memory.',
        ]),
        buildBulletSection('OUTPUT RULES', [
            'Be charismatic, concise, and commercially sharp.',
            'Use ### headers for strategy, segment, and creative sections when structure helps.',
            'Cite the source of real data or market claims.',
            'Default to 3 creative variations only when options materially help the user choose a direction.',
        ]),
    );

    // === MARGIN GOAL PRODUCT CONTEXT ===
    // If an active margin/profitability goal exists, inject product cost data so Craig
    // can enforce margin constraints when recommending campaigns and bundles.
    if (orgId) {
        try {
            const activeGoals = await loadActiveGoals(orgId);
            const marginGoal = activeGoals.find(g => g.category === 'margin');
            if (marginGoal && marginGoal.metrics[0]) {
                const targetMarginPct = marginGoal.metrics[0].targetValue;
                const marginContext = await fetchMarginProductContext(orgId, targetMarginPct);
                if (marginContext) {
                    agentMemory.system_instructions += marginContext;
                }
            }
        } catch (e) {
            logger.warn(`[Craig:MarginContext] Failed to load margin product context: ${e}`);
        }
    }

    // === HIVE MIND INIT ===
    try {
        const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
        const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';
        await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id as string, 'brand');
        logger.info(`[Craig:HiveMind] Connected to shared marketer blocks.`);
    } catch (e) {
        logger.warn(`[Craig:HiveMind] Failed to connect: ${e}`);
    }

    // === ROLE-BASED GROUND TRUTH (v2.0) ===
    try {
        const { loadRoleGroundTruth, buildRoleGuidanceIndex } = await import('@/server/grounding/role-loader');
        const tenantId = (brandMemory.brand_profile as any)?.id;
        const roleContext = resolveCraigRoleContext(brandMemory);
        const roleGT = await loadRoleGroundTruth(roleContext, tenantId);

        if (roleGT) {
            const rolePrompt = buildRoleGuidanceIndex(roleGT, 'craig');
            agentMemory.system_instructions += `\n\n${rolePrompt}`;

            logger.info(`[Craig:GroundTruth] Loaded ${roleContext} ground truth`, {
                qaPairs: roleGT.metadata.total_qa_pairs,
                presetPrompts: roleGT.preset_prompts.length,
                workflows: roleGT.workflow_guides.length,
            });
        } else {
            logger.debug(`[Craig:GroundTruth] No ground truth found for role: ${roleContext}`);
        }
    } catch (e) {
        logger.warn(`[Craig:GroundTruth] Failed to load role ground truth: ${e}`);
    }

    return agentMemory;
  },

  async orient(brandMemory, agentMemory, stimulus) {
    // 0. Chat / Direct Command Override
    if (stimulus && typeof stimulus === 'string') {
      return 'user_request';
    }
    // Strategy: Find the first "failing" or "queued" campaign that matches an active objective
    const candidates = agentMemory.campaigns.filter(c =>
      ['failing', 'queued', 'running'].includes(c.status)
    );

    // Sort by algorithmic priority
    candidates.sort((a, b) => {
      const scoreA = calculateCampaignPriority({
        id: a.id,
        objective: a.objective,
        status: a.status,
        impact_score: 8,
        urgency_score: a.constraints.jurisdictions.includes('IL') ? 9 : 5,
        fatigue_score: 2
      });

      const scoreB = calculateCampaignPriority({
        id: b.id,
        objective: b.objective,
        status: b.status,
        impact_score: 8,
        urgency_score: b.constraints.jurisdictions.includes('IL') ? 9 : 5,
        fatigue_score: 2
      });

      return scoreB - scoreA; // Descending
    });

    return candidates.length > 0 ? candidates[0].id : null;
  },

  async act(brandMemory, agentMemory, targetId, tools: CraigTools, stimulus?: string) {
    // === SCENARIO A: User Request (The "Planner" Flow) ===
    if (targetId === 'user_request' && stimulus) {
        const userQuery = stimulus;
        
        // 1. Tool Definitions (Agent-specific + Shared Context OS & Letta tools)
        const craigSpecificTools = [
            {
                name: "generateCopy",
                description: "Draft creative text for emails, SMS, or social posts.",
                schema: z.object({
                    prompt: z.string().describe("Instructions for the copywriter"),
                    context: z.any().describe("Brand or campaign context")
                })
            },
            {
                name: "validateCompliance",
                description: "Check if a piece of content violates cannabis advertising regulations.",
                schema: z.object({
                    content: z.string(),
                    jurisdictions: z.array(z.string()).describe("State codes e.g. ['CA', 'IL']")
                })
            },
            {
                name: "sendSms",
                description: "Dispatch an SMS message to a phone number.",
                schema: z.object({
                    to: z.string(),
                    body: z.string()
                })
            },
            {
                name: "crmListUsers",
                description: "List real platform users to build segments.",
                schema: z.object({
                    search: z.string().optional(),
                    lifecycleStage: z.enum(['prospect', 'contacted', 'demo_scheduled', 'trial', 'customer', 'vip', 'churned', 'winback']).optional(),
                    limit: z.number().optional()
                })
            },
            // Brand Discovery Tools (Firecrawl + RTRVR fallback)
            {
                name: "extractBrandData",
                description: "Extract brand identity data from a website (colors, voice, messaging, social handles). Uses Firecrawl with RTRVR fallback. Perfect for competitor analysis & campaign inspiration.",
                schema: z.object({
                    url: z.string().describe("Brand website URL to analyze"),
                    includeData: z.array(z.enum(['visual', 'voice', 'messaging', 'social'])).optional().describe("Data types to extract: visual (colors/fonts), voice (tone/personality), messaging (taglines/positioning), social (Instagram/Twitter handles)")
                })
            },
            {
                name: "discoverWebContent",
                description: "Extract readable markdown content from any URL using Firecrawl (auto-fallback to RTRVR.ai if Firecrawl is down). Great for reading competitor pages, blog posts, regulatory docs.",
                schema: z.object({
                    url: z.string().describe("URL to scrape and extract content from")
                })
            },
            {
                name: "searchWebBrands",
                description: "Search the web for brand websites and competitor information. Uses Firecrawl web search (auto-fallback to RTRVR.ai).",
                schema: z.object({
                    query: z.string().describe("Search query (e.g., 'cannabis brands in Colorado', 'premium vape brands')")
                })
            },
            {
                name: "loadRoleGuidance",
                description: "Load preset prompts, workflow guides, or verified QA from role ground truth on demand. Use this when a request matches a known workflow or template instead of relying on a bloated prompt.",
                schema: z.object({
                    query: z.string().describe("Workflow, template, or knowledge to load"),
                    kind: z.enum(['auto', 'preset', 'workflow', 'qa']).optional().describe("Optional guidance filter"),
                    limit: z.number().optional().describe("Max results (default 4)")
                })
            },
            {
                name: "generate_blog_post",
                description: "Generate and save a blog post draft with AI-powered content, SEO optimization, and compliance checking. Returns the created post ID and URL.",
                schema: z.object({
                    topic: z.string().describe("The blog post topic or title idea"),
                    category: z.enum([
                        'education', 'product_spotlight', 'industry_news', 'company_update',
                        'strain_profile', 'compliance', 'cannabis_culture', 'wellness',
                        'market_report', 'comparison', 'regulatory_alert', 'case_study'
                    ]).describe("Blog category"),
                    contentType: z.enum(['standard', 'hub', 'spoke', 'programmatic', 'comparison', 'report']).optional().describe("Content type for the content engine (default: standard)"),
                    parentPostId: z.string().optional().describe("Parent hub post ID (for spoke articles)"),
                    seoKeywords: z.array(z.string()).optional().describe("Target SEO keywords"),
                    tone: z.enum(['professional', 'casual', 'educational', 'playful']).optional().describe("Writing tone (default: professional)"),
                    length: z.enum(['short', 'medium', 'long']).optional().describe("Post length: short ~300w, medium ~700w, long ~1200w"),
                    dataContext: z.string().optional().describe("Additional data or context to incorporate into the post"),
                })
            }
        ];

        // Add promotion_scorecard tool so Craig can evaluate campaigns before recommending new ones
        const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '';
        const promotionScorecardTool = dispensaryAnalyticsToolDefs.find(t => t.name === 'promotion_scorecard')!;
        const analyticsImpl = makeAnalyticsToolsImpl(orgId);
        const roleContext = resolveCraigRoleContext(brandMemory);
        const tenantId = (brandMemory.brand_profile as any)?.id;

        // Combine agent-specific tools with shared Context OS, Letta, inbox, and proactive search tools
        const toolsDef = [
            ...craigSpecificTools,
            promotionScorecardTool,
            proactiveSearchToolDef,
            ...redditToolDefs,
            ...contextOsToolDefs,
            ...lettaToolDefs,
            ...learningLoopToolDefs,
            ...craigInboxToolDefs,
            ...craigCrmToolDefs,
            ...craigCampaignToolDefs,
            ...semanticSearchToolDefs,
            ...linkedInCraigToolDefs,
            ...socialCraigToolDefs,
        ];

        // Resolve Super User uid for LinkedIn + social tools (falls back gracefully if not a super user)
        const superUserUid = (brandMemory as any).user_context?.uid as string | undefined;
        const linkedInImpl = superUserUid ? makeLinkedInToolsImpl(superUserUid) : {};
        const socialImpl = superUserUid ? makeSocialCraigToolsImpl(superUserUid) : {};

        const allToolsWithAnalytics = {
            ...tools,
            ...analyticsImpl,
            ...makeSemanticSearchToolsImpl(orgId),
            ...makeRedditToolsImpl(),
            ...makeLearningLoopToolsImpl({
                agentId: 'craig',
                role: 'Marketer',
                orgId,
                brandId: (brandMemory.brand_profile as any)?.id || orgId,
                defaultCategory: 'campaign',
            }),
            ...linkedInImpl,
            ...socialImpl,
            loadRoleGuidance: async (query: string, kind?: 'auto' | 'preset' | 'workflow' | 'qa', limit?: number) => {
                const { loadRoleGroundTruth, searchRoleGuidance } = await import('@/server/grounding/role-loader');
                const roleGT = await loadRoleGroundTruth(roleContext, tenantId);
                if (!roleGT) {
                    return { success: false, error: `No role ground truth found for ${roleContext}` };
                }
                return {
                    success: true,
                    ...searchRoleGuidance(roleGT, query, { kind, limit }),
                };
            },
            searchOpportunities: async (query: string) => {
                try {
                    const { searchWeb, formatSearchResults } = await import('@/server/tools/web-search');
                    const results = await searchWeb(`cannabis marketing ${query}`);
                    return await formatSearchResults(results);
                } catch (e: any) {
                    return { error: e.message };
                }
            },
        };

        try {
            // === MULTI-STEP PLANNING (Run by Harness + Claude) ===
            const { runMultiStepTask } = await import('./harness');

            const result = await runMultiStepTask({
                userQuery,
                systemInstructions: (agentMemory.system_instructions as string) || '',
                toolsDef,
                tools: allToolsWithAnalytics,
                model: 'claude-sonnet-4-6', // Use Claude for high-quality copy & compliance
                maxIterations: 5
            });

            // Emit typed CampaignBriefArtifact for downstream agents (Deebo, Smokey, Pages)
            try {
                const { sendHandoff } = await import('../intuition/handoff');
                const orgId = String((brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '');
                const artifact = createHandoff<CampaignBriefArtifact>({
                    kind: 'campaign_brief',
                    fromAgent: 'craig',
                    toAgent: 'broadcast',
                    orgId,
                    confidence: 0.8,
                    payload: {
                        campaignName: targetId,
                        objective: userQuery.slice(0, 200),
                        targetSegments: [],
                        channels: [],
                        heroProducts: [],
                        copy: { headline: '', body: result.finalResult?.slice(0, 500) || '', cta: '' },
                    },
                });
                await sendHandoff(orgId, artifact);
            } catch (handoffErr) {
                logger.warn('[Craig] Failed to emit campaign brief handoff:', handoffErr as Record<string, unknown>);
            }

            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'campaign_task_complete',
                    result: result.finalResult,
                    metadata: { steps: result.steps }
                }
            };

        } catch (e: any) {
             return {
                updatedMemory: agentMemory,
                logEntry: { action: 'error', result: `Craig Task failed: ${e.message}`, metadata: { error: e.message } }
            };
        }
    }

    // === SCENARIO B: Autonomous Campaign Management (Existing Logic Preserved/Refined) ===
    const campaignIndex = agentMemory.campaigns.findIndex(c => c.id === targetId);
    if (campaignIndex !== -1) {
       // ... existing autonomous logic acts as a "background worker" ...
       // For brevity in this refactor, we are keeping the structure but focusing on the LLM Planner integration above.
       // In a full refactor, this autonomous loop would also likely use the Planner to decide "What to do next for this campaign?"
       // instead of hardcoded if/else logic, but that is a larger risk to stable features.
       // We will leave the deterministic loop for background jobs to ensure stability while "Chat" uses the Planner.
       
       const campaign = agentMemory.campaigns[campaignIndex];
       
       // Just one example of "Planner" injection into autonomous flow:
       if (campaign.status === 'queued') {
           // We can use the Planner here too!
           // "I need to draft copy for this queued campaign."
           // Implementation omitted for safety/scope management, relying on existing deterministic logic for now.
           campaign.status = 'running'; 
           return {
               updatedMemory: agentMemory,
               logEntry: { action: 'campaign_update', result: `Campaign ${campaign.id} started (Simulated logic).` }
           };
       }
    }

    return {
      updatedMemory: agentMemory,
      logEntry: {
        action: 'no_action',
        result: 'No active campaigns to manage.',
        metadata: {}
      }
    };
  }
};


export async function handleCraigEvent(orgId: string, eventId: string) {
  logger.info(`[Craig] Handled event ${eventId} for org ${orgId} (Stub)`);
}

// ============================================================================
// BRAND DISCOVERY TOOL IMPLEMENTATIONS (Firecrawl + RTRVR Fallback)
// ============================================================================

/**
 * Create tool implementations for Craig's brand discovery tools.
 * Call this function before invoking Craig's agent.
 *
 * Example:
 * ```
 * const craigTools = createCraigTools();
 * await runAgent(brandId, adapter, craigAgent, craigTools, userMessage);
 * ```
 */
export function createCraigToolImpls() {
  return {
    extractBrandData: async (input: { url: string; includeData?: ('visual' | 'voice' | 'messaging' | 'social')[] }) => {
      try {
        const { BrandGuideExtractor } = await import('@/server/services/brand-guide-extractor');
        const extractor = new BrandGuideExtractor();

        logger.info('[Craig:extractBrandData] Starting brand extraction', { url: input.url });

        const result = await extractor.extractFromUrl({
          url: input.url,
          socialHandles: {} // Can be enhanced to detect social handles from URL
        });

        // Filter to requested data types if specified
        if (input.includeData) {
          const filtered = {
            ...(input.includeData.includes('visual') && { visual: result.visualIdentity }),
            ...(input.includeData.includes('voice') && { voice: result.voice }),
            ...(input.includeData.includes('messaging') && { messaging: result.messaging }),
            confidence: result.confidence,
            source: result.source
          };
          return { success: true, data: filtered };
        }

        return { success: true, data: result };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[Craig:extractBrandData] Failed', { error: message });
        return { success: false, error: message };
      }
    },

    discoverWebContent: async (input: { url: string }) => {
      try {
        const { discovery } = await import('@/server/services/firecrawl');

        if (!discovery.isConfigured()) {
          return {
            success: false,
            error: 'Discovery service not configured. Ensure FIRECRAWL_API_KEY and/or RTRVR_API_KEY are set.'
          };
        }

        logger.info('[Craig:discoverWebContent] Extracting content from URL', { url: input.url });

        const result = await discovery.discoverUrl(input.url);

        return {
          success: true,
          data: {
            markdown: result.markdown,
            title: result.metadata?.title,
            description: result.metadata?.description,
            source: 'Firecrawl (with RTRVR.ai fallback)'
          }
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[Craig:discoverWebContent] Failed', { error: message });
        return { success: false, error: message };
      }
    },

    searchWebBrands: async (input: { query: string }) => {
      try {
        const { discovery } = await import('@/server/services/firecrawl');

        if (!discovery.isConfigured()) {
          return {
            success: false,
            error: 'Discovery service not configured. Ensure FIRECRAWL_API_KEY and/or RTRVR_API_KEY are set.'
          };
        }

        logger.info('[Craig:searchWebBrands] Searching for brands', { query: input.query });

        const results = await discovery.search(input.query);

        return {
          success: true,
          data: results,
          resultCount: Array.isArray(results) ? results.length : 0,
          source: 'Firecrawl Web Search (with RTRVR.ai fallback)'
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[Craig:searchWebBrands] Failed', { error: message });
        return { success: false, error: message };
      }
    },

    generate_blog_post: async (input: {
      topic: string;
      category: string;
      contentType?: string;
      parentPostId?: string;
      seoKeywords?: string[];
      tone?: string;
      length?: string;
      dataContext?: string;
    }) => {
      try {
        const { generateBlogDraft } = await import('@/server/services/blog-generator');
        const { createBlogPostInternal } = await import('@/server/actions/blog');
        const { checkBlogCompliance } = await import('@/server/services/blog-compliance');

        logger.info('[Craig:generate_blog_post] Generating blog post', { topic: input.topic, category: input.category });

        // Generate draft via AI
        const draft = await generateBlogDraft({
          topic: input.dataContext ? `${input.topic}\n\nContext data:\n${input.dataContext}` : input.topic,
          category: input.category as any,
          tone: (input.tone as any) || 'professional',
          length: (input.length as any) || 'medium',
          seoKeywords: input.seoKeywords,
          orgId: 'org_bakedbot_platform',
          userId: 'agent:craig',
        });

        // Run compliance check
        const compliance = await checkBlogCompliance({
          title: draft.title,
          content: draft.content,
          category: input.category as any,
          status: 'draft',
        } as any).catch(() => null);
        const compliancePassed = !compliance || compliance.status !== 'failed';

        // Create blog post in Firestore
        const post = await createBlogPostInternal({
          orgId: 'org_bakedbot_platform',
          title: draft.title,
          excerpt: draft.excerpt,
          content: draft.content,
          category: input.category as any,
          tags: draft.tags,
          seoKeywords: draft.seoKeywords,
          createdBy: 'agent:craig',
          status: compliancePassed ? 'approved' : 'pending_review',
          generatedBy: 'craig',
          contentType: (input.contentType as any) || 'standard',
          parentPostId: input.parentPostId,
          author: { id: 'agent:craig', name: 'Craig', role: 'AI Content Strategist' },
        });

        return {
          success: true,
          postId: post.id,
          title: post.title,
          slug: post.slug,
          status: post.status,
          url: `/blog/${post.slug}`,
          complianceStatus: compliance?.status || 'skipped',
          complianceIssues: compliance?.issues?.length || 0,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[Craig:generate_blog_post] Failed', { error: message });
        return { success: false, error: message };
      }
    }
  };
}
