/**
 * Intelligence Levels
 *
 * Maps project model settings to user-facing intelligence level badges.
 */

export type IntelligenceLevel = 'Standard' | 'Advanced' | 'Expert' | 'Genius';

/**
 * Maps model identifiers to intelligence levels
 */
export const MODEL_TO_LEVEL: Record<string, IntelligenceLevel> = {
    'lite': 'Standard',
    'standard': 'Advanced',
    'advanced': 'Expert',
    'premium': 'Genius',
};

/**
 * Configuration for each intelligence level (icon name, colors)
 */
export const LEVEL_CONFIG: Record<IntelligenceLevel, {
    icon: 'Zap' | 'Sparkles' | 'Brain' | 'Crown';
    color: string;
    bgColor: string;
}> = {
    Standard: {
        icon: 'Zap',
        color: 'text-slate-400',
        bgColor: 'bg-slate-400/10'
    },
    Advanced: {
        icon: 'Sparkles',
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10'
    },
    Expert: {
        icon: 'Brain',
        color: 'text-purple-400',
        bgColor: 'bg-purple-400/10'
    },
    Genius: {
        icon: 'Crown',
        color: 'text-amber-400',
        bgColor: 'bg-amber-400/10'
    },
};

/**
 * Gets the intelligence level for a given model string
 */
export function getIntelligenceLevel(model?: string): IntelligenceLevel {
    if (!model) return 'Standard';
    return MODEL_TO_LEVEL[model] || 'Standard';
}

/**
 * Gets the full configuration for an intelligence level
 */
export function getIntelligenceLevelConfig(model?: string) {
    const level = getIntelligenceLevel(model);
    return {
        level,
        ...LEVEL_CONFIG[level],
    };
}
