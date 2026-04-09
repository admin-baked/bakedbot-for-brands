/**
 * Gemini Flash Tool Calling Service
 *
 * Provides the same ClaudeTool[] -> ClaudeResult contract as executeGLMWithTools,
 * but routes through Google Gemini Flash via Genkit. Used as automatic fallback
 * when Groq rate limits are exceeded.
 *
 * Cost: $0.10/$0.40 per 1M tokens (Gemini 2.0 Flash)
 */

import { logger } from '@/lib/logger';
import {
    buildSystemPrompt,
    type ClaudeContext,
    type ClaudeResult,
    type ClaudeTool,
    type ToolExecution,
} from '@/ai/claude';
import {
    buildTelemetryEvent,
    recordAgentTelemetry,
} from '@/server/services/agent-telemetry';

const GEMINI_FLASH_MODEL = 'googleai/gemini-2.0-flash';

export function isGeminiFlashConfigured(): boolean {
    return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

/**
 * Execute a prompt with tools using Gemini Flash via Genkit.
 * Same interface as executeGLMWithTools — drop-in replacement.
 */
export async function executeGeminiFlashWithTools(
    prompt: string,
    tools: ClaudeTool[],
    executor: (toolName: string, input: Record<string, unknown>) => Promise<unknown>,
    context: ClaudeContext = {},
): Promise<ClaudeResult> {
    const { ai } = await import('@/ai/genkit');
    const maxIterations = context.maxIterations ?? 10;
    const invocationStart = Date.now();
    const toolExecutions: ToolExecution[] = [];

    // Build Genkit tool definitions from ClaudeTool[]
    // Use z.record for flexible input — tool schemas are defined in ClaudeTool already
    const { z } = await import('zod');
    const genkitTools = tools.map(tool =>
        ai.defineTool(
            {
                name: tool.name,
                description: tool.description || tool.name,
                inputSchema: z.record(z.string(), z.unknown()),
                outputSchema: z.unknown(),
            },
            async (input) => {
                const startTime = Date.now();
                let output: unknown;
                let status: 'success' | 'error' = 'success';
                const parsedInput = (input ?? {}) as Record<string, unknown>;

                if (context.onToolCall) {
                    await context.onToolCall(tool.name, parsedInput).catch(() => {});
                }

                try {
                    output = await executor(tool.name, parsedInput);
                } catch (err) {
                    status = 'error';
                    output = err instanceof Error ? err.message : 'Unknown error';
                }

                toolExecutions.push({
                    id: `gemini_${tool.name}_${Date.now()}`,
                    name: tool.name,
                    input: parsedInput,
                    output,
                    status,
                    durationMs: Date.now() - startTime,
                });

                return output;
            }
        )
    );

    const systemPrompt = buildSystemPrompt(context) || '';

    try {
        const result = await ai.generate({
            model: GEMINI_FLASH_MODEL,
            system: systemPrompt,
            prompt,
            tools: genkitTools,
            config: {
                maxOutputTokens: 4096,
                temperature: 0.2,
            },
        });

        const durationMs = Date.now() - invocationStart;
        const content = result.text || '';
        const usage = result.usage;

        logger.info('[GeminiFlash] Tool execution complete', {
            model: GEMINI_FLASH_MODEL,
            toolCalls: toolExecutions.length,
            durationMs,
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
        });

        if (context.agentContext) {
            const telemetryEvent = buildTelemetryEvent({
                agentName: context.agentContext.name,
                model: GEMINI_FLASH_MODEL,
                orgId: context.orgId,
                brandId: context.brandId,
                inputTokens: usage?.inputTokens ?? 0,
                outputTokens: usage?.outputTokens ?? 0,
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
            content,
            toolExecutions,
            model: GEMINI_FLASH_MODEL,
            inputTokens: usage?.inputTokens ?? 0,
            outputTokens: usage?.outputTokens ?? 0,
            cachedTokens: 0,
        };
    } catch (err) {
        const durationMs = Date.now() - invocationStart;
        logger.error('[GeminiFlash] executeGeminiFlashWithTools failed', {
            error: err instanceof Error ? err.message : String(err),
            durationMs,
        });
        throw err;
    }
}
