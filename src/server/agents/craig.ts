import { AgentImplementation } from './harness';
import { CraigMemory, CampaignSchema } from './schemas';
import { ComplianceResult } from './deebo'; // Assuming this is exported from deebo.ts
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { calculateCampaignPriority } from '../algorithms/craig-algo';
import { ai } from '@/ai/genkit';
import { contextOsToolDefs, lettaToolDefs } from './shared-tools';
import { craigInboxToolDefs } from '../tools/inbox-tools';
import { craigCrmToolDefs } from '../tools/crm-tools';
import { craigCampaignToolDefs } from '../tools/campaign-tools';
import {
    buildSquadRoster,
    buildIntegrationStatusSummary
} from './agent-definitions';
import { loadAndBuildGoalDirective, loadActiveGoals, fetchMarginProductContext } from './goal-directive-builder';
import { getBrandGuide } from '@/server/actions/brand-guide';
import { buildBrandBrief } from '@/lib/brand-guide-prompt';
import { getIntentProfile, buildCraigIntentBlock } from '@/server/services/intent-profile';

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
    
    // Build dynamic context from agent-definitions (source of truth)
    const squadRoster = buildSquadRoster('craig');
    const integrationStatus = buildIntegrationStatusSummary();

    // Load active goals for goal-driven directives
    const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id;
    const [goalDirectives, brandGuideResult, intentProfile] = await Promise.all([
        orgId ? loadAndBuildGoalDirective(orgId) : Promise.resolve(''),
        orgId ? getBrandGuide(orgId).catch(() => ({ success: false })) : Promise.resolve({ success: false }),
        orgId ? getIntentProfile(orgId).catch(() => null) : Promise.resolve(null),
    ]);
    const brandBrief = buildBrandBrief(
        (brandGuideResult as any).success ? (brandGuideResult as any).brandGuide : null
    );
    const intentBlock = intentProfile ? buildCraigIntentBlock(intentProfile) : '';

    // Set System Instructions for Authenticity
    agentMemory.system_instructions = `
        You are Craig, the "Growth Engine" and Marketer for ${brandMemory.brand_profile.name}. You are a high-energy marketing and content strategist designed to turn customer conversations into automated revenue and Playbooks.

        You are proactive, creative, and data-driven, always aiming to maximize engagement and repeat purchases through sophisticated automation—or Playbooks.

        **Playbooks** are reusable automations composed of triggers and instructions that can be set for various frequencies (daily, weekly, monthly, yearly, etc.).
        ${goalDirectives}

        ${brandBrief}
        ${intentBlock}

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

        === BRAND DISCOVERY TOOLS (NEW) ===
        You now have direct web scraping and brand intelligence capabilities:

        - **extractBrandData(url)**: Extract a competitor's full brand identity — colors, fonts, voice/tone, taglines, and positioning. Use this to understand how competitors present themselves before drafting campaigns.
          Example: "Extract brand data from https://competitor.com"

        - **discoverWebContent(url)**: Get the full readable content from any URL — menus, blog posts, product descriptions, regulatory docs.
          Example: "Read their product descriptions at https://dispensary.com/menu"

        - **searchWebBrands(query)**: Search the web for brands, competitors, and market trends.
          Example: "Search for premium cannabis brands in Colorado"

        PROACTIVE USAGE: When a user asks about competitors, campaigns, or market trends — AUTOMATICALLY use these tools to back your recommendations with real data instead of relying on memory alone. For example:
        - User asks "draft me a campaign" → First use searchWebBrands to check current competitor messaging
        - User asks "how should I position my brand" → Use extractBrandData on their top competitors
        - User shares a URL → Use discoverWebContent to read it and extract insights

        When creating social media content, use the createCreativeArtifact tool to generate structured posts for Instagram, TikTok, LinkedIn, Twitter, or Facebook. Include captions, hashtags, and compliance notes.

        When creating trackable QR codes for marketing campaigns, use the createQRCodeArtifact tool to generate QR codes with analytics tracking. QR codes can link to menus, promotions, events, social profiles, or any marketing URL. Customize with brand colors and logos.

        Output Format:
        Respond as a charismatic marketing partner. No technical IDs. Use standard markdown headers (###) for strategic components (### Campaign Strategy, ### Target Segment, ### Creative Variations).
        Always cite the source of any data you reference.

        Tone:
        High-energy, confident, creative. Provide 3 variations (Professional, Hype, Educational).
    `;

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
        const { loadRoleGroundTruth, buildRoleSystemPrompt } = await import('@/server/grounding/role-loader');

        // Detect user role from context (brand, dispensary, super_user, customer)
        const userRole = (brandMemory as any).user_context?.role || 'brand';
        const tenantId = (brandMemory.brand_profile as any)?.id;

        // Map user role to RoleContextType
        let roleContext: 'brand' | 'dispensary' | 'super_user' | 'customer' = 'brand';
        if (userRole === 'dispensary' || userRole === 'budtender') {
            roleContext = 'dispensary';
        } else if (userRole === 'super_user' || userRole === 'super_admin' || userRole === 'owner') {
            roleContext = 'super_user';
        } else if (userRole === 'customer') {
            roleContext = 'customer';
        }

        // Load role-specific ground truth
        const roleGT = await loadRoleGroundTruth(roleContext, tenantId);

        if (roleGT) {
            // Build role-specific system prompt additions
            const rolePrompt = buildRoleSystemPrompt(roleGT, 'craig', 'full');

            // Append to system instructions
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
            }
        ];

        // Combine agent-specific tools with shared Context OS, Letta, and inbox tools
        const toolsDef = [...craigSpecificTools, ...contextOsToolDefs, ...lettaToolDefs, ...craigInboxToolDefs, ...craigCrmToolDefs, ...craigCampaignToolDefs];

        try {
            // === MULTI-STEP PLANNING (Run by Harness + Claude) ===
            const { runMultiStepTask } = await import('./harness');
            
            const result = await runMultiStepTask({
                userQuery,
                systemInstructions: (agentMemory.system_instructions as string) || '',
                toolsDef,
                tools,
                model: 'claude-sonnet-4-5-20250929', // Use Claude for high-quality copy & compliance
                maxIterations: 5
            });

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
    }
  };
}
