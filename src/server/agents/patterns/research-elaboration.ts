/**
 * Research-Elaboration Pattern
 *
 * A reusable 2-phase pattern inspired by awesome-llm-apps deep research agent.
 * Phase 1: Research using tools to gather data
 * Phase 2: Elaboration to enhance with context and insights
 */

import { logger } from '@/lib/logger';
import { runMultiStepTask } from '../harness';
import {
  ResearchElaborationConfig,
  ResearchElaborationResult,
  ResearchOutput,
  DEFAULT_ELABORATION_INSTRUCTIONS,
} from './types';
import { z } from 'zod';

// ============================================================================
// CORE PATTERN IMPLEMENTATION
// ============================================================================

/**
 * Run the Research-Elaboration pattern.
 *
 * @param userQuery - The user's original query/request
 * @param config - Configuration for both phases
 * @returns Research output and elaborated result
 *
 * @example
 * ```typescript
 * const result = await runResearchElaboration('Analyze competitors in Detroit', {
 *   researchTools: [{ name: 'scanCompetitors', description: '...', schema: z.object({...}) }],
 *   researchToolsImpl: { scanCompetitors: async (location) => {...} },
 *   elaboration: { instructions: 'Focus on pricing opportunities...' }
 * });
 * ```
 */
export async function runResearchElaboration(
  userQuery: string,
  config: ResearchElaborationConfig
): Promise<ResearchElaborationResult> {
  const startTime = Date.now();
  const {
    researchPrompt,
    researchTools,
    researchToolsImpl,
    maxResearchIterations = 5,
    elaboration = {},
    agentId,
    onResearchComplete,
    onElaborationComplete,
  } = config;

  logger.info(`[R-E Pattern] Starting for query: "${userQuery.slice(0, 50)}..."`);

  // =========================================================================
  // PHASE 1: RESEARCH
  // =========================================================================
  const researchStart = Date.now();

  const researchSystemInstructions = `
You are a RESEARCH agent. Your job is to gather comprehensive data using the available tools.

RULES:
1. Use tools to get REAL DATA - do not fabricate information
2. Collect as much relevant information as possible
3. Note the source of each piece of data
4. If a tool fails, try an alternative approach or continue with other tools
5. Call multiple tools if needed to fully answer the query

When you have gathered sufficient data, set status to COMPLETE and provide a summary.
`;

  const researchResult = await runMultiStepTask({
    userQuery: researchPrompt || userQuery,
    systemInstructions: researchSystemInstructions,
    toolsDef: researchTools,
    tools: researchToolsImpl,
    model: 'hybrid', // Gemini for planning, tools for execution
    maxIterations: maxResearchIterations,
    agentId,
  });

  const researchDurationMs = Date.now() - researchStart;

  // Build research output
  const researchOutput: ResearchOutput = {
    content: researchResult.finalResult,
    steps: researchResult.steps.map((s) => ({
      ...s,
      timestamp: new Date().toISOString(),
    })),
    toolsUsed: [...new Set(researchResult.steps.map((s) => s.tool))],
    dataPoints: researchResult.steps.length,
  };

  logger.info(
    `[R-E Pattern] Research complete. Tools used: ${researchOutput.toolsUsed.join(', ')}, Steps: ${researchOutput.dataPoints}`
  );

  // Callback for research complete
  if (onResearchComplete) {
    await onResearchComplete(researchOutput);
  }

  // =========================================================================
  // PHASE 2: ELABORATION
  // =========================================================================
  const elaborationStart = Date.now();
  const {
    instructions: elaborationInstructions = DEFAULT_ELABORATION_INSTRUCTIONS,
    model: elaborationModel = 'claude',
    maxIterations: maxElaborationIterations = 2,
    includeRawData = true,
  } = elaboration;

  // Build elaboration context
  const rawDataSection = includeRawData
    ? `

RAW TOOL DATA:
${researchResult.steps
  .map(
    (s, i) =>
      `${i + 1}. ${s.tool}(${JSON.stringify(s.args).slice(0, 100)}): ${JSON.stringify(s.result).slice(0, 500)}`
  )
  .join('\n')}
`
    : '';

  const elaborationQuery = `
ORIGINAL USER QUERY: "${userQuery}"

RESEARCH FINDINGS:
${researchResult.finalResult}
${rawDataSection}

Now elaborate on these findings following the instructions.
`;

  const elaborationResult = await runMultiStepTask({
    userQuery: elaborationQuery,
    systemInstructions: elaborationInstructions,
    toolsDef: [], // Elaboration typically doesn't need tools
    tools: {},
    model: elaborationModel,
    maxIterations: maxElaborationIterations,
    agentId,
  });

  const elaborationDurationMs = Date.now() - elaborationStart;
  const totalDurationMs = Date.now() - startTime;

  logger.info(
    `[R-E Pattern] Elaboration complete. Total time: ${totalDurationMs}ms (research: ${researchDurationMs}ms, elaboration: ${elaborationDurationMs}ms)`
  );

  // Callback for elaboration complete
  if (onElaborationComplete) {
    await onElaborationComplete(elaborationResult.finalResult);
  }

  return {
    researchOutput,
    elaboratedOutput: elaborationResult.finalResult,
    metadata: {
      researchDurationMs,
      elaborationDurationMs,
      totalDurationMs,
      totalSteps:
        researchResult.steps.length + elaborationResult.steps.length,
      model: elaborationModel,
    },
  };
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Market Research with Elaboration - for Ezal agent
 *
 * Researches competitive landscape and elaborates with strategic insights.
 */
export async function marketResearchWithElaboration(
  query: string,
  tools: {
    scanCompetitors?: (location: string) => Promise<unknown>;
    getCompetitiveIntel?: (state: string, city?: string) => Promise<unknown>;
    searchWeb?: (query: string) => Promise<string>;
  },
  tenantId?: string
): Promise<ResearchElaborationResult> {
  const toolsDef = [];
  const toolsImpl: Record<string, (...args: unknown[]) => Promise<unknown>> = {};

  if (tools.scanCompetitors) {
    toolsDef.push({
      name: 'scanCompetitors',
      description: 'Scan competitors in a specific location for pricing and products',
      schema: z.object({ location: z.string().describe('City, State format') }),
    });
    toolsImpl.scanCompetitors = tools.scanCompetitors as (...args: unknown[]) => Promise<unknown>;
  }

  if (tools.getCompetitiveIntel) {
    toolsDef.push({
      name: 'getCompetitiveIntel',
      description: 'Get competitive intelligence data for a state/city',
      schema: z.object({
        state: z.string().describe('State code, e.g., MI, CA'),
        city: z.string().optional().describe('Optional city name'),
      }),
    });
    toolsImpl.getCompetitiveIntel = tools.getCompetitiveIntel as (...args: unknown[]) => Promise<unknown>;
  }

  if (tools.searchWeb) {
    toolsDef.push({
      name: 'searchWeb',
      description: 'Search the web for market data and news',
      schema: z.object({ query: z.string().describe('Search query') }),
    });
    toolsImpl.searchWeb = tools.searchWeb as (...args: unknown[]) => Promise<unknown>;
  }

  return runResearchElaboration(query, {
    researchPrompt: `Research the competitive landscape for: ${query}`,
    researchTools: toolsDef,
    researchToolsImpl: toolsImpl,
    tenantId,
    agentId: 'ezal',
    elaboration: {
      instructions: `
${DEFAULT_ELABORATION_INSTRUCTIONS}

MARKET RESEARCH FOCUS:
- Identify pricing opportunities (where we can compete on price)
- Highlight product gaps (what competitors have that we don't)
- Flag competitive threats (aggressive moves by competitors)
- Note market trends (category growth, new product types)

Include a "Competitive Action Plan" section with specific recommendations.
`,
    },
  });
}

/**
 * Product Research with Elaboration - for Smokey agent
 *
 * Researches products and elaborates with recommendations and context.
 */
export async function productResearchWithElaboration(
  productQuery: string,
  tools: {
    searchMenu?: (query: string) => Promise<unknown>;
    rankProductsForSegment?: (segmentId: string, products?: unknown[]) => Promise<unknown>;
  }
): Promise<ResearchElaborationResult> {
  const toolsDef = [];
  const toolsImpl: Record<string, (...args: unknown[]) => Promise<unknown>> = {};

  if (tools.searchMenu) {
    toolsDef.push({
      name: 'searchMenu',
      description: 'Search the dispensary menu for products',
      schema: z.object({ query: z.string().describe('Product search query') }),
    });
    toolsImpl.searchMenu = tools.searchMenu as (...args: unknown[]) => Promise<unknown>;
  }

  if (tools.rankProductsForSegment) {
    toolsDef.push({
      name: 'rankProductsForSegment',
      description: 'Rank products for a specific customer segment',
      schema: z.object({
        segmentId: z.string().describe('Customer segment ID'),
        products: z.array(z.string()).optional().describe('Optional product IDs to rank'),
      }),
    });
    toolsImpl.rankProductsForSegment = tools.rankProductsForSegment as (...args: unknown[]) => Promise<unknown>;
  }

  return runResearchElaboration(productQuery, {
    researchPrompt: `Find and analyze products matching: ${productQuery}`,
    researchTools: toolsDef,
    researchToolsImpl: toolsImpl,
    agentId: 'smokey',
    elaboration: {
      instructions: `
${DEFAULT_ELABORATION_INSTRUCTIONS}

PRODUCT RESEARCH FOCUS:
- Provide clear product recommendations with reasons
- Explain effects, benefits, and use cases
- Include dosing guidance where appropriate
- Mention comparable alternatives
- Note any stock or availability concerns

Keep the tone helpful and educational, like a knowledgeable budtender.
`,
    },
  });
}
