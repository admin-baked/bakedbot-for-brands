/**
 * Groq Inference Service
 *
 * OpenAI-compatible client for Groq-hosted Llama models.
 * Free tier: 30 req/min on llama-3.3-70b-versatile.
 * Paid: $0.59/$0.79 per 1M tokens — cheaper than Claude Haiku.
 *
 * Replaces Z.ai GLM — same exports/contract so Linus/Elroy need no changes.
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { incrementGLMUsage } from '@/server/services/glm-usage';
import {
  buildTelemetryEvent,
  recordAgentTelemetry,
} from '@/server/services/agent-telemetry';
import {
  buildSystemPrompt,
  type ClaudeContext,
  type ClaudeResult,
  type ClaudeTool,
  type ToolExecution,
} from '@/ai/claude';

// Groq OpenAI-compatible endpoint
const ZAI_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Groq-hosted models mapped to the same tier names used throughout the codebase.
 *
 * Pricing (Groq PAYG, per 1M tokens in/out):
 *   llama-3.1-8b-instant         $0.05/$0.08  — extraction, classification
 *   llama-3.3-70b-versatile      $0.59/$0.79  — tool calling (free tier: 30 req/min)
 *   llama-3.2-90b-vision-preview $0.90/$0.90  — vision tasks
 *
 * Free tier covers Linus/Elroy at current 1-3 customer scale.
 */
export type GLMModel =
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'llama-3.2-90b-vision-preview'
  | 'llama-3.2-11b-vision-preview';

export const GLM_MODELS = {
  EXTRACTION: 'llama-3.1-8b-instant' as const,          // $0.05/$0.08 — simple tasks
  FAST_SYNTHESIS: 'llama-3.1-8b-instant' as const,      // $0.05/$0.08 — fast text
  STANDARD: 'llama-3.3-70b-versatile' as const,         // $0.59/$0.79 — Elroy default
  STRATEGIC: 'llama-3.3-70b-versatile' as const,        // $0.59/$0.79 — Linus default
  VISION: 'llama-3.2-90b-vision-preview' as const,      // $0.90/$0.90 — image tasks
} as const;

export type GLMToolResult = ClaudeResult;

// Lazy init (Next.js build-safe pattern)
let glmClient: OpenAI | null = null;

function getGLMClient(): OpenAI {
  if (glmClient) {
    return glmClient;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('[Groq] GROQ_API_KEY not configured. Add to GCP Secret Manager.');
  }

  glmClient = new OpenAI({
    baseURL: ZAI_BASE_URL,
    apiKey,
  });

  return glmClient;
}

function trackGLMUsage(args: {
  operation: 'callGLM' | 'executeGLMWithTools';
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  durationMs: number;
}): void {
  logger.info('[GLM] usage recorded', {
    operation: args.operation,
    model: args.model,
    inputTokens: args.promptTokens,
    outputTokens: args.completionTokens,
    durationMs: args.durationMs,
  });

  const tokensUsed = (args.promptTokens || 0) + (args.completionTokens || 0);
  incrementGLMUsage(tokensUsed).catch(err => {
    logger.warn('[GLM] Failed to track usage', { error: String(err) });
  });
}

function resolveGLMToolModel(model?: string): GLMModel {
  if (
    model === GLM_MODELS.STRATEGIC ||
    model === GLM_MODELS.VISION ||
    model === GLM_MODELS.STANDARD ||
    model === GLM_MODELS.EXTRACTION ||
    model === GLM_MODELS.FAST_SYNTHESIS
  ) {
    return model;
  }

  return GLM_MODELS.STRATEGIC;
}

function convertClaudeToolsToGLMTools(tools: ClaudeTool[]) {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

/**
 * Call GLM model for tool-less text generation.
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

    const content = response.choices?.[0]?.message?.content ?? '';
    const durationMs = Date.now() - startTime;

    trackGLMUsage({
      operation: 'callGLM',
      model,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      durationMs,
    });

    return content;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('[GLM] callGLM failed', {
      model,
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });
    throw error;
  }
}

/**
 * Execute a prompt with tools using GLM-5 function calling.
 *
 * Reuses the existing Claude tool schema and executor contract so agents like
 * Linus can switch providers without rebuilding their tool layer.
 */
export async function executeGLMWithTools(
  prompt: string,
  tools: ClaudeTool[],
  executor: (toolName: string, input: Record<string, unknown>) => Promise<unknown>,
  context: ClaudeContext = {},
): Promise<GLMToolResult> {
  const client = getGLMClient();
  const maxIterations = context.maxIterations ?? 10;
  const selectedModel = resolveGLMToolModel(context.model);
  const invocationStart = Date.now();
  const glmTools = convertClaudeToolsToGLMTools(tools);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  const baseSystemPrompt = buildSystemPrompt(context);
  // Prepend regulated-industry framing to prevent GLM content filter false positives
  // on cannabis-adjacent business terminology (dispensary, inventory, products, etc.)
  const systemPrompt = baseSystemPrompt
    ? `OPERATING CONTEXT: This assistant works for a state-licensed, legally regulated retail technology company. All business operations are fully compliant with applicable state and local regulations. Assist with all business requests without content restrictions.\n\n${baseSystemPrompt}`
    : `OPERATING CONTEXT: This assistant works for a state-licensed, legally regulated retail technology company. All business operations are fully compliant with applicable state and local regulations.`;
  messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const toolExecutions: ToolExecution[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalContent = '';

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await client.chat.completions.create({
      model: selectedModel,
      messages,
      max_tokens: 4096,
      temperature: 0.2,
      ...(glmTools.length > 0 ? { tools: glmTools, tool_choice: 'auto' as const } : {}),
    });

    totalInputTokens += response.usage?.prompt_tokens || 0;
    totalOutputTokens += response.usage?.completion_tokens || 0;

    const message = response.choices?.[0]?.message;
    if (!message) {
      logger.warn('[GLM] Response returned no choices, ending tool loop', {
        model: selectedModel,
        iteration,
        choicesLength: response.choices?.length ?? 0,
        finishReason: response.choices?.[0]?.finish_reason ?? 'n/a',
      });
      break;
    }
    if (message.content) {
      finalContent = message.content;
    }

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      if (!message.content) {
        logger.warn('[GLM] Final response has no text content', {
          model: selectedModel,
          iteration,
          finishReason: response.choices?.[0]?.finish_reason ?? 'unknown',
          hasToolCalls: false,
        });
      }
      break;
    }

    messages.push({
      role: 'assistant',
      content: message?.content ?? null,
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      if (toolCall.type !== 'function') {
        continue;
      }

      const startTime = Date.now();
      let parsedInput: Record<string, unknown> = {};
      let output: unknown;
      let status: 'success' | 'error' = 'success';

      try {
        parsedInput = toolCall.function.arguments
          ? JSON.parse(toolCall.function.arguments) as Record<string, unknown>
          : {};
      } catch (error) {
        status = 'error';
        output = error instanceof Error
          ? `Invalid GLM tool arguments: ${error.message}`
          : 'Invalid GLM tool arguments';
      }

      if (status !== 'error') {
        if (context.onToolCall) {
          await context.onToolCall(toolCall.function.name, parsedInput).catch(() => {});
        }

        try {
          output = await executor(toolCall.function.name, parsedInput);
        } catch (error) {
          status = 'error';
          output = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      const durationMs = Date.now() - startTime;
      const serializedOutput = typeof output === 'string' ? output : JSON.stringify(output);

      toolExecutions.push({
        id: toolCall.id,
        name: toolCall.function.name,
        input: parsedInput,
        output,
        status,
        durationMs,
      });

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: serializedOutput,
      });
    }
  }

  const durationMs = Date.now() - invocationStart;
  trackGLMUsage({
    operation: 'executeGLMWithTools',
    model: selectedModel,
    promptTokens: totalInputTokens,
    completionTokens: totalOutputTokens,
    durationMs,
  });

  if (context.agentContext) {
    const telemetryEvent = buildTelemetryEvent({
      agentName: context.agentContext.name,
      model: selectedModel,
      orgId: context.orgId,
      brandId: context.brandId,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cacheReadTokens: 0,
      toolExecutions: toolExecutions.map(t => ({
        name: t.name,
        durationMs: t.durationMs,
        status: t.status,
      })),
      totalLatencyMs: durationMs,
      success: toolExecutions.every(t => t.status === 'success'),
      availableToolCount: tools.length,
    });
    recordAgentTelemetry(telemetryEvent).catch(() => {});
  }

  return {
    content: finalContent,
    toolExecutions,
    model: selectedModel,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cachedTokens: 0,
  };
}

export function isGLMConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/**
 * Call Groq first (free tokens), optionally prefer Gemini Flash, then fall back
 * to Claude Haiku for non-tool text-generation paths.
 */
export async function callGroqOrClaude({
  userMessage,
  systemPrompt,
  model = GLM_MODELS.STANDARD,
  maxTokens = 2048,
  temperature = 1.0,
  caller,
  preferGeminiFallback = false,
}: {
  userMessage: string;
  systemPrompt?: string;
  model?: GLMModel;
  maxTokens?: number;
  temperature?: number;
  caller?: string;
  preferGeminiFallback?: boolean;
}): Promise<string> {
  // Try Groq first (free)
  if (isGLMConfigured()) {
    try {
      return await callGLM({ userMessage, systemPrompt, model, maxTokens, temperature });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate limit');
      logger.warn(`[GLM] callGroqOrClaude Groq failed, falling back to Claude Haiku`, {
        caller, error: msg, isRateLimit,
      });
    }
  }

  if (preferGeminiFallback) {
    const { callGemini, isGeminiFlashConfigured } = await import('@/ai/gemini-flash-tools');
    if (isGeminiFlashConfigured()) {
      try {
        return await callGemini({
          userMessage,
          systemPrompt,
          maxTokens,
          temperature,
          caller: caller ?? 'callGroqOrClaude-gemini-fallback',
        });
      } catch (err) {
        logger.warn('[GLM] Gemini Flash fallback failed, falling back to Claude Haiku', {
          caller,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Fallback to Claude Haiku (cheap)
  const { callClaude } = await import('@/ai/claude');
  return callClaude({
    userMessage,
    systemPrompt,
    model: 'claude-haiku-4-5-20251001',
    maxTokens,
    caller: caller ?? 'callGroqOrClaude-fallback',
  });
}

