/**
 * AI Settings Types
 *
 * User and tenant-level custom instructions for AI agents.
 * Similar to ChatGPT's "Custom Instructions" and Claude's project instructions.
 *
 * Hierarchy (highest priority last):
 * 1. Agent Base Instructions (code)
 * 2. Role-Based Ground Truth (Firestore: ground_truth_v2/{roleId})
 * 3. Tenant AI Settings (Firestore: tenants/{tenantId}/settings/ai)
 * 4. User AI Settings (Firestore: users/{userId}/settings/ai)
 */

import { z } from 'zod';

// ============================================================================
// TENANT AI SETTINGS (Org Admin configures for all users in org)
// ============================================================================

export const TenantAISettingsSchema = z.object({
    /**
     * Custom instructions that apply to ALL agents for this tenant.
     * Example: "Always mention our loyalty program. Use casual tone."
     */
    customInstructions: z.string().max(2000).default(''),

    /**
     * Preferred communication tone
     */
    tone: z.enum(['professional', 'casual', 'friendly', 'formal']).default('friendly'),

    /**
     * Preferred response length
     */
    responseLength: z.enum(['brief', 'detailed', 'auto']).default('auto'),

    /**
     * Preferred language (ISO 639-1 code)
     */
    preferredLanguage: z.string().default('en'),

    /**
     * Business context that agents should know
     * Example: "We're a family-owned dispensary since 2023..."
     */
    businessContext: z.string().max(1000).default(''),

    /**
     * Topics to always emphasize
     */
    alwaysMention: z.array(z.string()).default([]),

    /**
     * Topics to avoid or be careful about
     */
    avoidTopics: z.array(z.string()).default([]),

    /**
     * Which agents are enabled for this tenant
     */
    enabledAgents: z.array(z.string()).optional(),

    /**
     * Feature flags for AI behavior
     */
    features: z.object({
        autoSuggestProducts: z.boolean().default(true),
        includeComplianceReminders: z.boolean().default(true),
        showConfidenceScores: z.boolean().default(false),
        enableVoiceResponses: z.boolean().default(false),
    }).default({}),

    /**
     * Metadata
     */
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
});

export type TenantAISettings = z.infer<typeof TenantAISettingsSchema>;

// ============================================================================
// USER AI SETTINGS (Individual user preferences)
// ============================================================================

export const UserAISettingsSchema = z.object({
    /**
     * User's personal custom instructions
     * Example: "Explain things simply. I'm new to cannabis."
     */
    customInstructions: z.string().max(1000).default(''),

    /**
     * Override tenant tone preference
     */
    preferredTone: z.enum(['professional', 'casual', 'friendly', 'formal']).optional(),

    /**
     * User's preferred response format
     */
    responseFormat: z.enum(['paragraphs', 'bullets', 'numbered', 'auto']).default('auto'),

    /**
     * User's experience level (affects recommendations)
     */
    experienceLevel: z.enum(['beginner', 'intermediate', 'experienced']).default('intermediate'),

    /**
     * Accessibility preferences
     */
    accessibility: z.object({
        simpleLanguage: z.boolean().default(false),
        avoidJargon: z.boolean().default(false),
        largerText: z.boolean().default(false),
    }).default({}),

    /**
     * User's preferred default agent
     */
    defaultAgent: z.string().optional(),

    /**
     * Metadata
     */
    updatedAt: z.string().optional(),
});

export type UserAISettings = z.infer<typeof UserAISettingsSchema>;

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_TENANT_AI_SETTINGS: TenantAISettings = {
    customInstructions: '',
    tone: 'friendly',
    responseLength: 'auto',
    preferredLanguage: 'en',
    businessContext: '',
    alwaysMention: [],
    avoidTopics: [],
    features: {
        autoSuggestProducts: true,
        includeComplianceReminders: true,
        showConfidenceScores: false,
        enableVoiceResponses: false,
    },
};

export const DEFAULT_USER_AI_SETTINGS: UserAISettings = {
    customInstructions: '',
    responseFormat: 'auto',
    experienceLevel: 'intermediate',
    accessibility: {
        simpleLanguage: false,
        avoidJargon: false,
        largerText: false,
    },
};

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

/**
 * Build the custom instructions block to inject into agent prompts
 */
export function buildCustomInstructionsBlock(
    tenantSettings?: TenantAISettings | null,
    userSettings?: UserAISettings | null
): string {
    const sections: string[] = [];

    // Tenant-level instructions
    if (tenantSettings) {
        const tenantParts: string[] = [];

        if (tenantSettings.customInstructions) {
            tenantParts.push(tenantSettings.customInstructions);
        }

        if (tenantSettings.businessContext) {
            tenantParts.push(`Business Context: ${tenantSettings.businessContext}`);
        }

        if (tenantSettings.alwaysMention.length > 0) {
            tenantParts.push(`Always mention: ${tenantSettings.alwaysMention.join(', ')}`);
        }

        if (tenantSettings.avoidTopics.length > 0) {
            tenantParts.push(`Avoid discussing: ${tenantSettings.avoidTopics.join(', ')}`);
        }

        if (tenantSettings.tone !== 'friendly') {
            tenantParts.push(`Communication tone: ${tenantSettings.tone}`);
        }

        if (tenantSettings.responseLength !== 'auto') {
            tenantParts.push(`Response length preference: ${tenantSettings.responseLength}`);
        }

        if (tenantParts.length > 0) {
            sections.push(`[ORGANIZATION PREFERENCES]\n${tenantParts.join('\n')}`);
        }
    }

    // User-level instructions
    if (userSettings) {
        const userParts: string[] = [];

        if (userSettings.customInstructions) {
            userParts.push(userSettings.customInstructions);
        }

        if (userSettings.preferredTone) {
            userParts.push(`Preferred tone: ${userSettings.preferredTone}`);
        }

        if (userSettings.responseFormat !== 'auto') {
            userParts.push(`Format responses as: ${userSettings.responseFormat}`);
        }

        if (userSettings.experienceLevel === 'beginner') {
            userParts.push('User is new to cannabis - explain things simply and avoid jargon.');
        }

        if (userSettings.accessibility?.simpleLanguage) {
            userParts.push('Use simple, clear language.');
        }

        if (userSettings.accessibility?.avoidJargon) {
            userParts.push('Avoid industry jargon and technical terms.');
        }

        if (userParts.length > 0) {
            sections.push(`[USER PREFERENCES]\n${userParts.join('\n')}`);
        }
    }

    return sections.length > 0 ? '\n\n' + sections.join('\n\n') + '\n\n' : '';
}
