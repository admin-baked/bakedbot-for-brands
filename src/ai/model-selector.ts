/**
 * AI Model Selector
 * 
 * Maps user-facing intelligence levels to actual Gemini 3 models and configurations.
 * Used by runAgentChat to select the appropriate model based on user selection.
 */

export type ThinkingLevel = 'standard' | 'advanced' | 'expert' | 'genius';

export interface ModelConfig {
    model: string;
    thinkingLevel?: 'off' | 'low' | 'medium' | 'high' | 'max';
    description: string;
}

/**
 * Maps user-facing intelligence levels to Gemini 3 model configurations.
 * 
 * - Standard: Fast Flash model, no thinking - cost efficient
 * - Advanced: Pro model for complex tasks, no thinking
 * - Expert: Pro model with high thinking level (test-time compute)
 * - Genius: Pro model with max thinking level (maximum reasoning)
 */
export const MODEL_CONFIGS: Record<ThinkingLevel, ModelConfig> = {
    standard: {
        model: 'googleai/gemini-3-flash-preview',
        thinkingLevel: undefined, // No thinking for fast responses
        description: 'Fast & cost-effective (Flash)',
    },
    advanced: {
        model: 'googleai/gemini-3-pro-preview',
        thinkingLevel: undefined, // Pro without thinking for complex but quick
        description: 'Complex logic (Pro)',
    },
    expert: {
        model: 'googleai/gemini-3-pro-preview',
        thinkingLevel: 'high',
        description: 'Deep reasoning (Pro + High Thinking)',
    },
    genius: {
        model: 'googleai/gemini-3-pro-preview',
        thinkingLevel: 'max',
        description: 'Maximum intelligence (Pro + Max Thinking)',
    },
};

/**
 * Get the model configuration for a given thinking level.
 * Falls back to 'standard' if an invalid level is provided.
 */
export function getModelConfig(level?: string): ModelConfig {
    const validLevel = level as ThinkingLevel;
    return MODEL_CONFIGS[validLevel] || MODEL_CONFIGS.standard;
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
