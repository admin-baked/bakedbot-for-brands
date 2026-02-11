/**
 * Agent Cognitive State Types (MERIDIAN LiveHud)
 *
 * Real-time visualization of agent cognitive state with adjustable behavior sliders.
 * Provides transparency into agent decision-making and allows user customization.
 *
 * Inspired by: https://github.com/mattvideoproductions/MERIDIAN_Brain
 * BakedBot adaptation: Multi-agent architecture with role-specific states
 */

import { z } from 'zod';

// =============================================================================
// AGENT PERSONALITY MODES
// =============================================================================

/**
 * Switchable personality modes for agents
 * Similar to MERIDIAN's Base/Research/Creative/Technical modes
 */
export const AgentPersonalityModeSchema = z.enum([
    'base',        // Default personality for the agent
    'professional',  // Formal, business-focused tone
    'casual',      // Friendly, conversational tone
    'technical',   // Expert-level, detailed technical language
    'analyst',     // Data-driven, metrics-focused
    'creative',    // Innovative, brainstorming mode
]);

export type AgentPersonalityMode = z.infer<typeof AgentPersonalityModeSchema>;

// =============================================================================
// BEHAVIOR SLIDERS (0-100 scale)
// =============================================================================

/**
 * Adjustable behavior parameters for agents
 * Based on MERIDIAN's 8 slider system
 */
export const AgentBehaviorSlidersSchema = z.object({
    /** How detailed/concise responses should be (0=concise, 100=very detailed) */
    verbosity: z.number().min(0).max(100).default(50),

    /** How innovative/conservative suggestions should be (0=conservative, 100=innovative) */
    creativity: z.number().min(0).max(100).default(50),

    /** How direct/diplomatic communication should be (0=diplomatic, 100=direct) */
    directness: z.number().min(0).max(100).default(50),

    /** Level of technical depth (0=simple language, 100=technical jargon) */
    technicality: z.number().min(0).max(100).default(50),

    /** How proactive agent should be (0=reactive only, 100=highly proactive) */
    proactivity: z.number().min(0).max(100).default(50),

    /** Amount of personality/humor (0=serious, 100=playful) */
    humor: z.number().min(0).max(100).default(50),

    /** Strictness of compliance/rules (0=flexible, 100=strict) */
    compliance: z.number().min(0).max(100).default(80),

    /** Speed vs thoroughness (0=thorough/slow, 100=fast/surface-level) */
    speed: z.number().min(0).max(100).default(50),
});

export type AgentBehaviorSliders = z.infer<typeof AgentBehaviorSlidersSchema>;

// =============================================================================
// CONTEXT WINDOW STATE
// =============================================================================

/**
 * Real-time context window usage metrics
 */
export const ContextWindowStateSchema = z.object({
    messagesLoaded: z.number(),
    tokensUsed: z.number(),
    tokensAvailable: z.number(),
    utilizationPercent: z.number().min(0).max(100),
    memoryRetrievals: z.number(),  // How many Letta searches were performed
    lastMemoryGarden: z.date().nullable(),  // When memory was last cleaned
});

export type ContextWindowState = z.infer<typeof ContextWindowStateSchema>;

// =============================================================================
// COGNITIVE LOAD METRICS
// =============================================================================

/**
 * Agent "cognitive load" - how much processing is happening
 */
export const CognitiveLoadSchema = z.object({
    currentLoad: z.enum(['idle', 'light', 'moderate', 'heavy', 'overloaded']),
    activeToolCalls: z.number(),
    queuedRequests: z.number(),
    avgResponseTimeMs: z.number(),
    lastResponseTimeMs: z.number(),
});

export type CognitiveLoad = z.infer<typeof CognitiveLoadSchema>;

// =============================================================================
// AGENT COGNITIVE STATE (Complete State)
// =============================================================================

/**
 * Complete cognitive state for an agent
 * This powers the LiveHud dashboard
 */
export const AgentCognitiveStateSchema = z.object({
    agentId: z.string(),
    agentName: z.string(),  // e.g., 'Smokey', 'Craig', 'Ezal'
    tenantId: z.string(),

    // Current operational state
    status: z.enum(['active', 'idle', 'busy', 'offline', 'error']),
    lastActive: z.date(),
    uptime: z.number(),  // Seconds

    // Personality configuration
    personalityMode: AgentPersonalityModeSchema,
    behaviorSliders: AgentBehaviorSlidersSchema,

    // Context window usage
    contextWindow: ContextWindowStateSchema,

    // Processing metrics
    cognitiveLoad: CognitiveLoadSchema,

    // Response quality tracking
    lastResponseConfidence: z.number().min(0).max(1).nullable(),
    averageConfidence: z.number().min(0).max(1),
    completenessScore: z.number().min(0).max(1),  // From Completeness Doctrine

    // Memory health
    memoryHealth: z.object({
        totalMemories: z.number(),
        staleMemories: z.number(),
        conflictsDetected: z.number(),
        lastGardeningRun: z.date().nullable(),
        healthScore: z.number().min(0).max(100),
    }),

    // Agent-specific metadata
    metadata: z.record(z.unknown()).optional(),

    // Last updated timestamp
    updatedAt: z.date(),
});

export type AgentCognitiveState = z.infer<typeof AgentCognitiveStateSchema>;

// =============================================================================
// SLIDER PRESET CONFIGURATIONS
// =============================================================================

/**
 * Pre-defined slider configurations for common use cases
 */
export const SLIDER_PRESETS: Record<string, AgentBehaviorSliders> = {
    // Smokey (Budtender) presets
    smokey_casual: {
        verbosity: 65,
        creativity: 70,
        directness: 60,
        technicality: 30,
        proactivity: 70,
        humor: 85,
        compliance: 75,
        speed: 60,
    },
    smokey_expert: {
        verbosity: 80,
        creativity: 50,
        directness: 70,
        technicality: 85,
        proactivity: 60,
        humor: 40,
        compliance: 90,
        speed: 50,
    },

    // Craig (Marketer) presets
    craig_creative: {
        verbosity: 70,
        creativity: 90,
        directness: 50,
        technicality: 40,
        proactivity: 80,
        humor: 75,
        compliance: 70,
        speed: 70,
    },
    craig_data_driven: {
        verbosity: 75,
        creativity: 50,
        directness: 80,
        technicality: 60,
        proactivity: 70,
        humor: 30,
        compliance: 85,
        speed: 50,
    },

    // Ezal (Lookout) presets
    ezal_stealth: {
        verbosity: 60,
        creativity: 40,
        directness: 50,
        technicality: 70,
        proactivity: 90,
        humor: 20,
        compliance: 60,
        speed: 80,
    },
    ezal_detailed: {
        verbosity: 90,
        creativity: 60,
        directness: 70,
        technicality: 80,
        proactivity: 80,
        humor: 30,
        compliance: 75,
        speed: 40,
    },

    // Linus (CTO) presets
    linus_diagnostic: {
        verbosity: 85,
        creativity: 40,
        directness: 90,
        technicality: 95,
        proactivity: 70,
        humor: 10,
        compliance: 95,
        speed: 50,
    },
    linus_collaborative: {
        verbosity: 70,
        creativity: 60,
        directness: 60,
        technicality: 80,
        proactivity: 75,
        humor: 40,
        compliance: 90,
        speed: 60,
    },

    // Money Mike (CFO) presets
    moneyMike_conservative: {
        verbosity: 75,
        creativity: 30,
        directness: 85,
        technicality: 70,
        proactivity: 60,
        humor: 20,
        compliance: 95,
        speed: 50,
    },
    moneyMike_opportunistic: {
        verbosity: 65,
        creativity: 70,
        directness: 75,
        technicality: 65,
        proactivity: 85,
        humor: 50,
        compliance: 80,
        speed: 70,
    },

    // Default balanced preset
    balanced: {
        verbosity: 50,
        creativity: 50,
        directness: 50,
        technicality: 50,
        proactivity: 50,
        humor: 50,
        compliance: 80,
        speed: 50,
    },
};

// =============================================================================
// STATE UPDATES
// =============================================================================

/**
 * Partial updates to cognitive state (for real-time updates)
 */
export const AgentStateUpdateSchema = z.object({
    agentId: z.string(),
    tenantId: z.string(),
    updates: z.object({
        status: z.enum(['active', 'idle', 'busy', 'offline', 'error']).optional(),
        personalityMode: AgentPersonalityModeSchema.optional(),
        behaviorSliders: AgentBehaviorSlidersSchema.partial().optional(),
        contextWindow: ContextWindowStateSchema.partial().optional(),
        cognitiveLoad: CognitiveLoadSchema.partial().optional(),
        lastResponseConfidence: z.number().min(0).max(1).optional(),
    }),
    timestamp: z.date(),
});

export type AgentStateUpdate = z.infer<typeof AgentStateUpdateSchema>;

// =============================================================================
// PERSONALITY MODE DEFINITIONS
// =============================================================================

/**
 * Detailed personality mode configurations
 * Defines system prompts and behavior modifiers for each mode
 */
export interface PersonalityModeDefinition {
    mode: AgentPersonalityMode;
    displayName: string;
    description: string;
    systemPromptModifier: string;
    suggestedSliders: AgentBehaviorSliders;
    icon?: string;
}

export const PERSONALITY_MODE_DEFINITIONS: Record<AgentPersonalityMode, PersonalityModeDefinition> = {
    base: {
        mode: 'base',
        displayName: 'Base Mode',
        description: 'Default personality optimized for general interactions',
        systemPromptModifier: '',
        suggestedSliders: SLIDER_PRESETS.balanced,
        icon: '🎭',
    },
    professional: {
        mode: 'professional',
        displayName: 'Professional',
        description: 'Formal, business-focused communication',
        systemPromptModifier:
            'Adopt a professional, business-focused tone. Use formal language and avoid casual expressions.',
        suggestedSliders: {
            verbosity: 70,
            creativity: 40,
            directness: 80,
            technicality: 60,
            proactivity: 60,
            humor: 20,
            compliance: 95,
            speed: 50,
        },
        icon: '💼',
    },
    casual: {
        mode: 'casual',
        displayName: 'Casual',
        description: 'Friendly, conversational tone',
        systemPromptModifier:
            'Be friendly and conversational. Use casual language and feel free to be personable.',
        suggestedSliders: {
            verbosity: 60,
            creativity: 70,
            directness: 50,
            technicality: 30,
            proactivity: 70,
            humor: 85,
            compliance: 70,
            speed: 65,
        },
        icon: '😊',
    },
    technical: {
        mode: 'technical',
        displayName: 'Technical Expert',
        description: 'Detailed technical language and deep analysis',
        systemPromptModifier:
            'Provide detailed technical explanations. Use industry-specific terminology and deep technical analysis.',
        suggestedSliders: {
            verbosity: 85,
            creativity: 50,
            directness: 75,
            technicality: 95,
            proactivity: 65,
            humor: 20,
            compliance: 90,
            speed: 45,
        },
        icon: '🔧',
    },
    analyst: {
        mode: 'analyst',
        displayName: 'Data Analyst',
        description: 'Data-driven, metrics-focused analysis',
        systemPromptModifier:
            'Focus on data, metrics, and quantitative analysis. Support claims with numbers and statistics.',
        suggestedSliders: {
            verbosity: 75,
            creativity: 40,
            directness: 85,
            technicality: 70,
            proactivity: 70,
            humor: 25,
            compliance: 90,
            speed: 50,
        },
        icon: '📊',
    },
    creative: {
        mode: 'creative',
        displayName: 'Creative Innovator',
        description: 'Innovative, brainstorming-focused approach',
        systemPromptModifier:
            'Think creatively and propose innovative solutions. Explore unconventional approaches and brainstorm freely.',
        suggestedSliders: {
            verbosity: 70,
            creativity: 95,
            directness: 55,
            technicality: 45,
            proactivity: 85,
            humor: 75,
            compliance: 65,
            speed: 70,
        },
        icon: '💡',
    },
};
