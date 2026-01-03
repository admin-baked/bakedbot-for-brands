/**
 * Intelligence Levels - Model Tier Selection
 * 
 * Allows users to select intelligence/quality tier for cost vs performance tradeoff.
 * Inspired by Tasklet.ai's Standard/Advanced/Expert/Genius levels.
 */

export type IntelligenceLevel = 'standard' | 'advanced' | 'expert' | 'genius';

export interface IntelligenceLevelConfig {
    level: IntelligenceLevel;
    model: string;
    quotaCost: number;
    description: string;
    maxTokens: number;
    temperature: number;
}

export const INTELLIGENCE_LEVELS: Record<IntelligenceLevel, IntelligenceLevelConfig> = {
    standard: {
        level: 'standard',
        model: 'googleai/gemini-2.0-flash',
        quotaCost: 1,
        description: 'Fast & efficient for routine tasks',
        maxTokens: 2048,
        temperature: 0.7,
    },
    advanced: {
        level: 'advanced',
        model: 'googleai/gemini-2.5-flash',
        quotaCost: 2,
        description: 'Balanced performance for most tasks',
        maxTokens: 4096,
        temperature: 0.7,
    },
    expert: {
        level: 'expert',
        model: 'googleai/gemini-2.5-pro',
        quotaCost: 5,
        description: 'High intelligence for complex reasoning',
        maxTokens: 8192,
        temperature: 0.6,
    },
    genius: {
        level: 'genius',
        model: 'googleai/gemini-2.5-pro',  // Extended context version
        quotaCost: 10,
        description: 'Maximum capacity for deep analysis',
        maxTokens: 32768,
        temperature: 0.5,
    },
};

/**
 * Get intelligence level configuration
 */
export function getIntelligenceLevel(level: IntelligenceLevel): IntelligenceLevelConfig {
    return INTELLIGENCE_LEVELS[level];
}

/**
 * Get default intelligence level based on task complexity
 */
export function getDefaultIntelligenceLevel(taskComplexity?: 'simple' | 'moderate' | 'complex' | 'critical'): IntelligenceLevel {
    switch (taskComplexity) {
        case 'simple':
            return 'standard';
        case 'moderate':
            return 'advanced';
        case 'complex':
            return 'expert';
        case 'critical':
            return 'genius';
        default:
            return 'advanced';  // Default to balanced
    }
}

/**
 * Check if user has sufficient quota for the selected intelligence level
 */
export function hasQuotaForLevel(
    currentQuota: number,
    level: IntelligenceLevel
): boolean {
    const config = INTELLIGENCE_LEVELS[level];
    return currentQuota >= config.quotaCost;
}

/**
 * UI display configuration for intelligence level selector
 */
export const INTELLIGENCE_LEVEL_UI = {
    standard: {
        label: 'Standard',
        icon: '⚡',
        color: 'green',
        description: 'Fast & cheap',
    },
    advanced: {
        label: 'Advanced',
        icon: '🔧',
        color: 'blue',
        description: 'Balanced',
    },
    expert: {
        label: 'Expert',
        icon: '🧠',
        color: 'purple',
        description: 'High intelligence',
    },
    genius: {
        label: 'Genius',
        icon: '🌟',
        color: 'gold',
        description: 'Maximum capacity',
    },
};
