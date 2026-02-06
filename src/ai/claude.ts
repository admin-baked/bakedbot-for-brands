/**
 * Claude (Anthropic) Service
 * 
 * Dedicated service for tool-calling operations using Claude.
 * Claude excels at structured tool use and agentic workflows.
 * 
 * Usage:
 *   import { executeWithTools } from '@/ai/claude';
 *   const result = await executeWithTools(prompt, tools, context);
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool, ContentBlock, ToolUseBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';

// Re-export types for convenience
export type ClaudeTool = Tool;
export type ClaudeToolUse = ToolUseBlock;

export interface ClaudeContext {
    userId?: string;
    brandId?: string;
    role?: string;
    maxIterations?: number; // Default: 10
    model?: string; // Allow model override
}

export interface ToolExecution {
    id: string;
    name: string;
    input: Record<string, unknown>;
    output: unknown;
    status: 'success' | 'error';
    durationMs: number;
}

export interface ClaudeResult {
    content: string;
    toolExecutions: ToolExecution[];
    model: string;
    inputTokens: number;
    outputTokens: number;
}

// Default model for tool calling - Claude Opus 4.5 (User Specified)
export const CLAUDE_TOOL_MODEL = 'claude-opus-4-5-20251101';

// Maximum iterations to prevent infinite loops
const MAX_ITERATIONS = 10;

/**
 * Get the Anthropic client singleton
 */
let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
    if (!anthropicClient) {
        const apiKey = process.env.CLAUDE_API_KEY;
        if (!apiKey) {
            throw new Error('CLAUDE_API_KEY environment variable is required for Claude tool calling');
        }
        anthropicClient = new Anthropic({ apiKey });
    }
    return anthropicClient;
}

/**
 * Execute a prompt with tools using Claude.
 * 
 * This function implements an agentic loop:
 * 1. Send prompt + tools to Claude
 * 2. If Claude calls tools, execute them and send results back
 * 3. Repeat until Claude returns a final response (no tool calls)
 * 
 * @param prompt - The user's prompt/instruction
 * @param tools - Array of tools in Claude format
 * @param executor - Function to execute tool calls
 * @param context - Optional context (userId, brandId, etc.)
 */
export async function executeWithTools(
    prompt: string,
    tools: ClaudeTool[],
    executor: (toolName: string, input: Record<string, unknown>) => Promise<unknown>,
    context: ClaudeContext = {}
): Promise<ClaudeResult> {
    const client = getClient();
    const maxIterations = context.maxIterations || MAX_ITERATIONS;
    
    const messages: MessageParam[] = [
        { role: 'user', content: prompt }
    ];
    
    const toolExecutions: ToolExecution[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalContent = '';
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        const response = await client.messages.create({
            model: context.model || CLAUDE_TOOL_MODEL,
            max_tokens: 4096,
            tools,
            messages,
            // Use prompt caching for faster responses on repeated requests
            system: [
                {
                    type: 'text',
                    text: buildSystemPrompt(context),
                    cache_control: { type: 'ephemeral' }
                }
            ],
        });
        
        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;
        
        // Check if we have tool use blocks
        const toolUseBlocks = response.content.filter(
            (block): block is ToolUseBlock => block.type === 'tool_use'
        );
        
        // Extract text content - filter then access text property safely
        const textBlocks = response.content.filter(block => block.type === 'text');
        
        if (textBlocks.length > 0) {
            finalContent = textBlocks
                .map(b => (b as { type: 'text'; text: string }).text)
                .join('\n');
        }

        
        // If no tool calls, we're done
        if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
            break;
        }
        
        // Execute tools and collect results
        const toolResults: ToolResultBlockParam[] = [];
        
        for (const toolUse of toolUseBlocks) {
            const startTime = Date.now();
            let output: unknown;
            let status: 'success' | 'error' = 'success';
            
            try {
                output = await executor(toolUse.name, toolUse.input as Record<string, unknown>);
            } catch (error) {
                status = 'error';
                output = error instanceof Error ? error.message : 'Unknown error';
            }
            
            const durationMs = Date.now() - startTime;
            
            toolExecutions.push({
                id: toolUse.id,
                name: toolUse.name,
                input: toolUse.input as Record<string, unknown>,
                output,
                status,
                durationMs,
            });
            
            toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: typeof output === 'string' ? output : JSON.stringify(output),
                is_error: status === 'error',
            });
        }
        
        // Add assistant's response and tool results to conversation
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });
    }
    
    return {
        content: finalContent,
        toolExecutions,
        model: CLAUDE_TOOL_MODEL,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
    };
}

/**
 * Build system prompt with context
 */
function buildSystemPrompt(context: ClaudeContext): string {
    const parts = [
        'You are an AI assistant for BakedBot, a cannabis commerce platform.',
        'You have access to tools to help complete tasks.',
        'Always use tools when they can help accomplish the user\'s request.',
        'After executing tools, summarize what was done in a clear, friendly manner.',
    ];
    
    if (context.brandId) {
        parts.push(`Current brand context: ${context.brandId}`);
    }
    
    if (context.role) {
        parts.push(`User role: ${context.role}`);
    }
    
    return parts.join('\n');
}

/**
 * Simple tool execution without the agentic loop.
 * Use this when you want Claude to decide which tools to call,
 * but only want a single round of tool execution.
 */
export async function executeToolsOnce(
    prompt: string,
    tools: ClaudeTool[],
    executor: (toolName: string, input: Record<string, unknown>) => Promise<unknown>,
    context: ClaudeContext = {}
): Promise<ClaudeResult> {
    return executeWithTools(prompt, tools, executor, { ...context, maxIterations: 1 });
}

/**
 * Check if Claude API is configured and available
 */
export function isClaudeAvailable(): boolean {
    return !!process.env.CLAUDE_API_KEY;
}

/**
 * Simple text-based Claude API call without tools.
 * Use this for straightforward text generation tasks.
 */
export interface ClaudeCallOptions {
    systemPrompt?: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    imageUrl?: string; // For vision capabilities
}

export async function callClaude(options: ClaudeCallOptions): Promise<string> {
    const client = getClient();

    const {
        systemPrompt,
        userMessage,
        temperature = 1.0,
        maxTokens = 4096,
        model = CLAUDE_TOOL_MODEL,
        imageUrl
    } = options;

    // Build message content
    const messageContent: Array<{ type: string; text?: string; source?: { type: string; url: string; media_type: string } }> = [];

    if (imageUrl) {
        // Add image for vision analysis
        messageContent.push({
            type: 'image',
            source: {
                type: 'url',
                url: imageUrl,
                media_type: 'image/jpeg' // Assume JPEG, adjust if needed
            }
        });
    }

    messageContent.push({
        type: 'text',
        text: userMessage
    });

    const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{
            role: 'user',
            content: messageContent as any // Type assertion for flexibility
        }]
    });

    // Extract text from response
    const textBlocks = response.content.filter(block => block.type === 'text');
    return textBlocks
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('\n');
}
