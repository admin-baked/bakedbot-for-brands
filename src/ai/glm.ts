/**
 * Z.ai GLM Service
 *
 * OpenAI-compatible client for GLM models via z.ai DevPack.
 * Used for high-frequency, low-PII synthesis tasks where cost matters more than
 * complex reasoning.
 *
 * Models:
 *   - glm-5: Most capable, 3x quota during peak (2–6 PM UTC+8)
 *   - glm-4.7: Standard, good balance of quality/cost
 *   - glm-4.5-air: Lightweight, fast, cheap extraction
 *   - glm-4-flash: Ultra-fast for simple parsing
 *
 * Usage:
 *   import { callGLM } from '@/ai/glm';
 *   const result = await callGLM({ userMessage, model: 'glm-4.7' });
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { incrementGLMUsage } from '@/server/services/glm-usage';

// Z.ai Anthropic-compatible endpoint
const ZAI_BASE_URL = 'https://api.z.ai/api/anthropic';

/**
 * Available GLM models for different use cases
 */
export type GLMModel =
  | 'glm-5'           // Most capable, strategic tasks
  | 'glm-4.7'         // Standard, balanced
  | 'glm-4.5-air'      // Fast, cheap, extraction
  | 'glm-4-flash';       // Ultra-fast, simple parsing

/**
 * Model recommendation based on task type
 */
export const GLM_MODELS = {
  EXTRACTION: 'glm-4.5-air' as const,     // HTML parsing, JSON extraction
  FAST_SYNTHESIS: 'glm-4-flash' as const,  // Short summaries
  STANDARD: 'glm-4.7' as const,            // Default quality/cost balance
  STRATEGIC: 'glm-5' as const,              // Complex reasoning
} as const;

// Lazy init (Next.js build-safe pattern)
let _glm: OpenAI | null = null;

/**
 * Get GLM client instance (lazy initialization)
 */
function getGLMClient(): OpenAI {
  if (_glm) return _glm;

  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    throw new Error('[GLM] ZAI_API_KEY not configured. Add to GCP Secret Manager.');
  }

  _glm = new OpenAI({
    baseURL: ZAI_BASE_URL,
    apiKey,
  });

  return _glm;
}

/**
 * Call GLM model for text generation (tool-less, non-PII tasks only)
 *
 * Use this for:
 * - News summarization
 * - Contact info extraction (no PII)
 * - Email draft first-pass (no customer data)
 * - Compliance pre-checks
 * - Ezal HTML parsing
 *
 * Do NOT use for:
 * - Tool-calling (Claude handles this better)
 * - PII-containing prompts (customer names, emails, addresses)
 * - Compliance final gates (must be reliable)
 */
export async function callGLM({
  userMessage,
  systemPrompt,
  model = GLM_MODELS.STANDARD,
  maxTokens = 2048,
  temperature = 1.0,
}: {
  userMessage: string;
  systemPrompt?: string;
  model?: GLMModel;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const startTime = Date.now();

  try {
    const client = getGLMClient();
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userMessage });

    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    const content = response.choices[0]?.message?.content ?? '';

    const duration = Date.now() - startTime;
    logger.info('[GLM] callGLM succeeded', {
      model,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      durationMs: duration,
    });

    // Track usage (non-blocking)
    // Use actual token count if available, otherwise count as 1 call
    const tokensUsed = (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0);
    incrementGLMUsage(tokensUsed).catch(err => {
      logger.warn('[GLM] Failed to track usage', { error: String(err) });
    });

    return content;
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error('[GLM] callGLM failed', {
      model,
      error: err instanceof Error ? err.message : String(err),
      durationMs: duration,
    });
    throw err;
  }
}

/**
 * Check if GLM is configured and available
 */
export function isGLMConfigured(): boolean {
  return !!process.env.ZAI_API_KEY;
}
