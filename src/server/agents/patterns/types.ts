/**
 * Research-Elaboration Pattern Types
 *
 * A reusable 2-phase pattern that any agent can use:
 * - Phase 1 (Research): Initial data gathering using tools
 * - Phase 2 (Elaboration): Enhancement with context, examples, implications
 */

import { z } from 'zod';

// ============================================================================
// RESEARCH PHASE TYPES
// ============================================================================

export interface ResearchToolDef {
  name: string;
  description: string;
  schema: z.ZodType<unknown>;
}

export interface ResearchStep {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  timestamp: string;
}

export interface ResearchOutput {
  content: string;
  steps: ResearchStep[];
  toolsUsed: string[];
  dataPoints: number;
}

// ============================================================================
// ELABORATION PHASE TYPES
// ============================================================================

export interface ElaborationConfig {
  /** Custom instructions for elaboration agent */
  instructions?: string;
  /** Model to use for elaboration (defaults to 'claude') */
  model?: 'claude' | 'gemini' | 'hybrid';
  /** Max iterations for elaboration (defaults to 2) */
  maxIterations?: number;
  /** Whether to include raw tool data in elaboration context */
  includeRawData?: boolean;
}

// ============================================================================
// PATTERN CONFIGURATION
// ============================================================================

export interface ResearchElaborationConfig {
  // Research phase config
  researchPrompt?: string;
  researchTools: ResearchToolDef[];
  researchToolsImpl: Record<string, (...args: unknown[]) => Promise<unknown>>;
  maxResearchIterations?: number;

  // Elaboration phase config
  elaboration?: ElaborationConfig;

  // Shared config
  agentId?: string;
  tenantId?: string;

  // Callbacks
  onResearchComplete?: (output: ResearchOutput) => Promise<void>;
  onElaborationComplete?: (output: string) => Promise<void>;
}

// ============================================================================
// PATTERN RESULT
// ============================================================================

export interface ResearchElaborationResult {
  /** Raw research output before elaboration */
  researchOutput: ResearchOutput;
  /** Elaborated, enhanced output */
  elaboratedOutput: string;
  /** Performance and debugging metadata */
  metadata: {
    researchDurationMs: number;
    elaborationDurationMs: number;
    totalDurationMs: number;
    totalSteps: number;
    model: string;
  };
}

// ============================================================================
// CONVENIENCE TYPE HELPERS
// ============================================================================

/** Extract tool implementation type from tool definitions */
export type ToolsImplFromDefs<T extends ResearchToolDef[]> = {
  [K in T[number]['name']]: (...args: unknown[]) => Promise<unknown>;
};

// ============================================================================
// DEFAULT ELABORATION INSTRUCTIONS
// ============================================================================

export const DEFAULT_ELABORATION_INSTRUCTIONS = `
You are an ELABORATION agent. Your job is to enhance raw research findings into a comprehensive, actionable report.

Given the research output below, you must:

1. **ADD CONTEXT**: Explain why each finding matters for the business
2. **ADD EXAMPLES**: Provide concrete examples where applicable
3. **ADD IMPLICATIONS**: What should the user/business do with this information?
4. **STRUCTURE**: Organize into clear sections with markdown headers
5. **PRIORITIZE**: Put the most important insights first

OUTPUT RULES:
- Use clean markdown with headers (##, ###)
- Include bullet points for lists
- Bold key terms and numbers
- Add a "Key Takeaways" section at the end
- Add a "Recommended Actions" section with specific next steps

Do NOT:
- Remove any data from the research
- Add information you cannot verify from the research
- Use placeholder text like [insert here]
- Include technical jargon without explanation
`;
