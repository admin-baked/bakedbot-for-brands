/**
 * AI Model Selector
 * 
 * Maps user-facing intelligence levels to actual Gemini models and configurations.
 * Used by runAgentChat to select the appropriate model based on user selection.
 * 
 * Model Tiers:
 * - Lite: Gemini 2.5 Flash Lite - Ultra cost-effective, default for free users (simple queries)
 * - Standard: Gemini 3 Flash - Fast & capable
 * - Advanced: Gemini 3 Pro - Complex reasoning
 * - Expert: Gemini 3 Pro + High Thinking - Deep reasoning
 * - Genius: Gemini 3 Pro + Max Thinking - Maximum intelligence
 * 
 * AGENTIC TASKS (Playbooks, Tools, Research):
 * - Always use Gemini 3 Pro for agentic features (thought signatures, tool calling)
 * - Reference: https://developers.googleblog.com/building-ai-agents-with-google-gemini-3-and-open-source-frameworks/
 * 
 * TOOL CALLING (Claude):
 * - Claude Sonnet 4 is the preferred model for tool-heavy agentic tasks
 * - Use `isClaudePreferred()` to determine when to route to Claude
 */

/**
 * Claude Model Configuration
 * Claude Sonnet 4 is optimized for agentic tool-use workflows
 */
export const CLAUDE_TOOL_MODEL = 'claude-sonnet-4-20250514';

/**
 * Check if Claude should be preferred for a given task type
 */
export function isClaudePreferred(taskType: 'tool_calling' | 'chat' | 'research' | 'playbook'): boolean {
    return taskType === 'tool_calling' || taskType === 'playbook';
}

export type ThinkingLevel = 'lite' | 'standard' | 'advanced' | 'expert' | 'genius' | 'deep_research';


export interface ModelConfig {
    model: string;
    thinkingLevel?: 'off' | 'low' | 'medium' | 'high';
    description: string;
    tier: 'free' | 'paid' | 'super'; // Minimum tier required
}

/**
 * Available Gemini Models Reference:
 * 
 * TEXT MODELS:
 * - gemini-2.5-flash-lite: Ultra-efficient, 1M context, supports thinking, FREE tier default
 * - gemini-3-flash-preview: Fast frontier model, great balance of speed/quality
 * - gemini-3-pro-preview: Most intelligent, agentic capabilities, advanced reasoning
 * 
 * IMAGE MODELS:
 * - gemini-2.5-flash-image: Nano Banana - fast image gen (FREE tier)
 * - gemini-3-pro-image-preview: Nano Banana Pro - professional quality, 4K (PAID tier)
 */
export const MODEL_CONFIGS: Record<ThinkingLevel, ModelConfig> = {
    lite: {
        model: 'googleai/gemini-2.5-flash-lite',
        thinkingLevel: undefined,
        description: 'Ultra-efficient (Gemini 2.5 Flash Lite)',
        tier: 'free',
    },
    standard: {
        model: 'googleai/gemini-3-flash-preview',
        thinkingLevel: undefined,
        description: 'Fast & capable (Gemini 3 Flash)',
        tier: 'paid',
    },
    advanced: {
        model: 'googleai/gemini-3-pro-preview',
        thinkingLevel: undefined,
        description: 'Complex logic (Gemini 3 Pro)',
        tier: 'paid',
    },
    expert: {
        model: 'googleai/gemini-3-pro-preview',
        thinkingLevel: 'high',
        description: 'Deep reasoning (Gemini 3 Pro + Thinking)',
        tier: 'super',
    },
    genius: {
        model: 'googleai/gemini-3-pro-preview',
        thinkingLevel: 'high',
        description: 'Maximum intelligence (Gemini 3 Pro + Max Thinking)',
        tier: 'super',
    },
    deep_research: {
        model: 'googleai/gemini-3-pro-preview',
        thinkingLevel: 'high',
        description: 'Comprehensive web research (Deep Research Agent)',
        tier: 'super',
    },
};

/**
 * Agentic Model - Used for complex tasks requiring tool calling,
 * playbook creation, and thought signatures.
 * Always uses Gemini 3 Pro for best agentic performance.
 */
export const AGENTIC_MODEL = 'googleai/gemini-3-pro-preview';

/**
 * Simple Query Model - Used for basic questions that don't require
 * advanced reasoning or tool calling. Cost-effective for high volume.
 */
export const SIMPLE_QUERY_MODEL = 'googleai/gemini-2.5-flash-lite';

/**
 * Weekly usage limits for free tier users.
 * These reset every 7 days from the user's first usage.
 */
export const FREE_TIER_LIMITS = {
    playbooksPerWeek: 1,
    deepResearchPerWeek: 1,
    imagesPerWeek: 5,
};

/**
 * Default model for each user tier
 */
export const DEFAULT_MODEL_BY_TIER = {
    free: 'lite' as ThinkingLevel,
    paid: 'standard' as ThinkingLevel,
    super: 'genius' as ThinkingLevel,
};

/**
 * Get the model configuration for a given thinking level.
 * Falls back to 'lite' if an invalid level is provided.
 */
export function getModelConfig(level?: string): ModelConfig {
    const validLevel = level as ThinkingLevel;
    return MODEL_CONFIGS[validLevel] || MODEL_CONFIGS.lite;
}

/**
 * Get available models for a given user tier.
 * Returns all models the user has access to.
 */
export function getAvailableModels(userTier: 'free' | 'paid' | 'super'): ThinkingLevel[] {
    const tierOrder = { free: 0, paid: 1, super: 2 };
    const userTierLevel = tierOrder[userTier];
    
    return (Object.entries(MODEL_CONFIGS) as [ThinkingLevel, ModelConfig][])
        .filter(([_, config]) => tierOrder[config.tier] <= userTierLevel)
        .map(([level]) => level);
}

/**
 * Get Genkit generate options for the given thinking level.
 * Returns the model name and config object to spread into ai.generate().
 */
export function getGenerateOptions(level?: string): { model: string; config?: Record<string, any> } {
    const config = getModelConfig(level);
    
    const options: { model: string; config?: Record<string, any> } = {
        model: config.model,
    };
    
    // Add thinking level if specified (for Gemini 3 reasoning mode)
    if (config.thinkingLevel) {
        options.config = {
            thinkingConfig: {
                thinkingLevel: config.thinkingLevel,
            },
        };
    }
    
    return options;
}

/**
 * Get Genkit options for agentic tasks (playbooks, tools, research).
 * Always uses Gemini 3 Pro for best agentic capabilities.
 * 
 * @param useThinking - Enable thinking mode for complex reasoning (default: true)
 */
export function getAgenticModelOptions(useThinking: boolean = true): { model: string; config?: Record<string, any> } {
    const options: { model: string; config?: Record<string, any> } = {
        model: AGENTIC_MODEL,
    };
    
    if (useThinking) {
        options.config = {
            thinkingConfig: {
                thinkingLevel: 'high', // High thinking for agentic tasks
            },
        };
    }
    
    return options;
}
