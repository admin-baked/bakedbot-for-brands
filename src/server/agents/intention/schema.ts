
import { z } from 'zod';

/**
 * 1. The Semantic Commit
 * Represents the agent's finalized plan before execution.
 * Stored in `tenants/{id}/intents`.
 */
export const IntentCommitSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string(),
  userQuery: z.string(),
  timestamp: z.number(),
  
  // The 'Why' and 'What'
  goal: z.string().describe("The specific objective the agent is trying to achieve"),
  assumptions: z.array(z.string()).describe("List of assumptions made about the user's request"),
  constraints: z.array(z.string()).describe("Perceived limitations (e.g. 'budget < $500', 'only CA stores')"),
  
  // The 'How'
  plan: z.array(z.object({
    tool: z.string(),
    reason: z.string()
  })).describe("High-level steps the agent intends to take"),
  
  status: z.enum(['committed', 'executed', 'failed']).default('committed')
});

export type IntentCommit = z.infer<typeof IntentCommitSchema>;

/**
 * 2. The Clarification Request
 * Used when ambiguity is detected.
 */
export const ClarificationRequestSchema = z.object({
  ambiguityDetected: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
  
  // If ambiguous, these are the forking paths
  possibleIntents: z.array(z.string()).describe("List of potential interpretations of the user's request"),
  
  // The minimal question to resolve the ambiguity
  clarificationQuestion: z.string().optional()
});

export type ClarificationRequest = z.infer<typeof ClarificationRequestSchema>;

/**
 * 3. Analysis Result (Internal)
 * Result from the 'Analyzer' pre-flight check.
 */
export const IntentAnalysisSchema = z.object({
  isAmbiguous: z.boolean(),
  commit: IntentCommitSchema.optional(),
  clarification: ClarificationRequestSchema.optional()
});

export type IntentAnalysis = z.infer<typeof IntentAnalysisSchema>;
