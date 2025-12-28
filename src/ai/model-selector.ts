/**
 * AI Model Selector
 * 
 * Maps user-facing intelligence levels to actual Gemini models and configurations.
 * Used by runAgentChat to select the appropriate model based on user selection.
 * 
 * Model Tiers:
 * - Lite: Gemini 2.5 Flash Lite - Ultra cost-effective, default for free users
 * - Standard: Gemini 3 Flash - Fast & capable
 * - Advanced: Gemini 3 Pro - Complex reasoning
 * - Expert: Gemini 3 Pro + High Thinking - Deep reasoning
 * - Genius: Gemini 3 Pro + Max Thinking - Maximum intelligence
 */

export type ThinkingLevel = 'lite' | 'standard' | 'advanced' | 'expert' | 'genius';

export interface ModelConfig {
    model: string;
    thinkingLevel?: 'off' | 'low' | 'medium' | 'high' | 'max';
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
        thinkingLevel: 'max',
        description: 'Maximum intelligence (Gemini 3 Pro + Max Thinking)',
        tier: 'super',
    },
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
