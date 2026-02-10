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
    autoRouteModel?: boolean; // Auto-select Opus for complex tasks (default: true)
    contextTokens?: number; // Estimated context size for model selection
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

// Default model for tool calling - Claude Sonnet 4 (optimized for agentic workflows)
// Sonnet is 5x cheaper than Opus and excels at structured tool use
// Use CLAUDE_REASONING_MODEL for complex one-shot reasoning tasks
export const CLAUDE_TOOL_MODEL = 'claude-sonnet-4-20250514';

// Premium model for complex reasoning tasks (use sparingly)
// Best for: strategic decisions, long document synthesis, novel problem solving
export const CLAUDE_REASONING_MODEL = 'claude-opus-4-5-20251101';

// Maximum iterations to prevent infinite loops
const MAX_ITERATIONS = 10;

// === AUTOMATIC MODEL ROUTING ===

export type TaskComplexity = 'simple' | 'standard' | 'complex' | 'strategic';

interface ComplexitySignals {
    complexity: TaskComplexity;
    reasoning: string;
    suggestedModel: string;
}

/**
 * Patterns that indicate complex reasoning tasks requiring Opus 4.5
 */
const OPUS_PATTERNS = {
    // Multi-step planning and analysis
    multiStepPlanning: [
        /(?:create|build|design|architect)\s+(?:a\s+)?(?:comprehensive|detailed|full|complete)\s+(?:plan|strategy|roadmap|framework)/i,
        /step[- ]by[- ]step\s+(?:plan|guide|process|analysis)/i,
        /multi[- ]?step\s+(?:process|workflow|implementation)/i,
        /(?:develop|create)\s+(?:a\s+)?(?:business|marketing|growth|expansion)\s+(?:plan|strategy)/i,
    ],

    // Strategic business decisions
    strategicDecisions: [
        /(?:strategic|business)\s+(?:decision|recommendation|analysis)/i,
        /(?:market\s+entry|expansion|pivot)\s+strategy/i,
        /(?:competitive|swot|pest|porter)\s+analysis/i,
        /(?:investment|funding|acquisition|merger)\s+(?:decision|analysis|recommendation)/i,
        /(?:pricing|revenue|monetization)\s+strategy/i,
        /go[- ]to[- ]market\s+(?:strategy|plan)/i,
    ],

    // Long document synthesis (100k+ context)
    documentSynthesis: [
        /(?:analyze|review|synthesize)\s+(?:this|these|the)\s+(?:document|report|contract|agreement)/i,
        /summarize\s+(?:all|the\s+entire|this\s+lengthy)/i,
        /(?:compare|contrast)\s+(?:multiple|several|these)\s+(?:document|report|proposal)/i,
        /(?:extract|identify)\s+(?:key|main|critical)\s+(?:point|insight|finding|theme)/i,
    ],

    // Novel problem solving
    novelProblemSolving: [
        /(?:novel|unique|unprecedented|complex)\s+(?:problem|challenge|situation)/i,
        /(?:how\s+(?:would|should|can)\s+(?:we|I))\s+(?:approach|solve|handle|address)/i,
        /(?:brainstorm|ideate|innovate)\s+(?:solution|approach|strategy)/i,
        /(?:think\s+through|reason\s+about|analyze)\s+(?:this|the)\s+(?:complex|difficult|challenging)/i,
    ],

    // Architectural decisions
    architecturalDecisions: [
        /(?:system|software|data|cloud)\s+architecture/i,
        /(?:design|architect)\s+(?:a\s+)?(?:scalable|distributed|microservice)/i,
        /(?:migration|modernization)\s+(?:strategy|plan|approach)/i,
        /(?:technical|engineering)\s+(?:decision|recommendation|trade-?off)/i,
    ],
};

/**
 * Detect task complexity and suggest the appropriate Claude model.
 * Automatically routes complex tasks to Opus 4.5 for better reasoning.
 */
export function detectTaskComplexity(prompt: string, contextTokens?: number): ComplexitySignals {
    const lower = prompt.toLowerCase();

    // Check for Opus-level patterns
    for (const [category, patterns] of Object.entries(OPUS_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(prompt)) {
                return {
                    complexity: 'strategic',
                    reasoning: `Detected ${category.replace(/([A-Z])/g, ' $1').toLowerCase()} pattern`,
                    suggestedModel: CLAUDE_REASONING_MODEL,
                };
            }
        }
    }

    // Check context length (>50k tokens suggests need for Opus)
    if (contextTokens && contextTokens > 50000) {
        return {
            complexity: 'complex',
            reasoning: `Large context (${contextTokens} tokens) benefits from Opus reasoning`,
            suggestedModel: CLAUDE_REASONING_MODEL,
        };
    }

    // Check prompt length as a proxy for complexity
    const wordCount = prompt.split(/\s+/).length;
    if (wordCount > 500) {
        return {
            complexity: 'complex',
            reasoning: 'Long prompt suggests complex task',
            suggestedModel: CLAUDE_REASONING_MODEL,
        };
    }

    // Check for multiple questions/requirements
    const questionCount = (prompt.match(/\?/g) || []).length;
    const bulletPoints = (prompt.match(/^[-*•]\s/gm) || []).length;
    if (questionCount >= 5 || bulletPoints >= 7) {
        return {
            complexity: 'complex',
            reasoning: 'Multiple requirements detected',
            suggestedModel: CLAUDE_REASONING_MODEL,
        };
    }

    // Default to Sonnet for standard tasks
    return {
        complexity: 'standard',
        reasoning: 'Standard task complexity',
        suggestedModel: CLAUDE_TOOL_MODEL,
    };
}

/**
 * Get the best model for a given prompt, with optional override.
 * If autoRoute is true, will automatically upgrade to Opus for complex tasks.
 */
export function selectModel(prompt: string, options?: {
    forceModel?: string;
    autoRoute?: boolean;
    contextTokens?: number;
}): { model: string; complexity: ComplexitySignals } {
    // Honor explicit model override
    if (options?.forceModel) {
        return {
            model: options.forceModel,
            complexity: { complexity: 'standard', reasoning: 'Model explicitly specified', suggestedModel: options.forceModel },
        };
    }

    // Auto-route based on task complexity (default: enabled)
    const autoRoute = options?.autoRoute !== false;
    const complexity = detectTaskComplexity(prompt, options?.contextTokens);

    if (autoRoute && complexity.complexity === 'strategic') {
        return { model: CLAUDE_REASONING_MODEL, complexity };
    }

    if (autoRoute && complexity.complexity === 'complex') {
        return { model: CLAUDE_REASONING_MODEL, complexity };
    }

    // Default to Sonnet
    return { model: CLAUDE_TOOL_MODEL, complexity };
}

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

    // Auto-select model based on task complexity (unless explicitly specified)
    const { model: selectedModel, complexity } = selectModel(prompt, {
        forceModel: context.model,
        autoRoute: context.autoRouteModel !== false,
        contextTokens: context.contextTokens,
    });

    // Log when upgrading to Opus for observability
    if (selectedModel === CLAUDE_REASONING_MODEL && !context.model) {
        console.log(`[Claude] Auto-routing to Opus 4.5: ${complexity.reasoning}`);
    }

    const messages: MessageParam[] = [
        { role: 'user', content: prompt }
    ];

    const toolExecutions: ToolExecution[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalContent = '';

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        const response = await client.messages.create({
            model: selectedModel,
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
        model: selectedModel,
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
 * Automatically routes to Opus 4.5 for complex reasoning tasks.
 */
export interface ClaudeCallOptions {
    systemPrompt?: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
    model?: string; // Override model selection
    autoRouteModel?: boolean; // Auto-select Opus for complex tasks (default: true)
    imageUrl?: string; // For vision capabilities
}

export async function callClaude(options: ClaudeCallOptions): Promise<string> {
    const client = getClient();

    const {
        systemPrompt,
        userMessage,
        temperature = 1.0,
        maxTokens = 4096,
        model: explicitModel,
        autoRouteModel = true,
        imageUrl
    } = options;

    // Auto-select model based on task complexity
    const { model: selectedModel, complexity } = selectModel(userMessage, {
        forceModel: explicitModel,
        autoRoute: autoRouteModel,
    });

    // Log when upgrading to Opus
    if (selectedModel === CLAUDE_REASONING_MODEL && !explicitModel) {
        console.log(`[Claude] Auto-routing to Opus 4.5: ${complexity.reasoning}`);
    }

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
        model: selectedModel,
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
