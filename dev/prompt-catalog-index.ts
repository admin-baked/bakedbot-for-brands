/**
 * Master Prompt Catalog Index
 * 
 * Aggregates all prompt catalogs for testing and optimization.
 * Use this as the single entry point for prompt simulation.
 */

// Base prompts
export * from './prompt-catalog';
export * from './prompt-catalog-extended';
export * from './prompt-catalog-greetings';
export * from './prompt-catalog-permissions';
export * from './prompt-catalog-industry';
export * from './prompt-catalog-tools';
export * from './prompt-catalog-advanced';
export * from './prompt-catalog-contextual';
export * from './prompt-catalog-spawn';

// =============================================================================
// AGGREGATED STATISTICS
// =============================================================================

import { PROMPT_STATS, ALL_PROMPTS } from './prompt-catalog';
import { EXTENDED_PROMPT_STATS, AMBIGUOUS_PROMPTS, ERROR_SCENARIOS, CONVERSATION_SCENARIOS } from './prompt-catalog-extended';
import { GREETING_STATS, ALL_GREETINGS } from './prompt-catalog-greetings';
import { PERMISSION_STATS, ALL_PERMISSION_PROMPTS } from './prompt-catalog-permissions';

export const MASTER_PROMPT_STATS = {
    // Totals
    totalPrompts: 
        ALL_PROMPTS.length + 
        AMBIGUOUS_PROMPTS.length + 
        ERROR_SCENARIOS.length + 
        ALL_GREETINGS.length + 
        ALL_PERMISSION_PROMPTS.length,
    
    totalConversations: CONVERSATION_SCENARIOS.length,
    totalConversationTurns: CONVERSATION_SCENARIOS.reduce((sum, c) => sum + c.turns.length, 0),
    
    // By Category
    byCategory: {
        basePrompts: PROMPT_STATS,
        extended: EXTENDED_PROMPT_STATS,
        greetings: GREETING_STATS,
        permissions: PERMISSION_STATS,
    },
    
    // By Role Summary
    byRole: {
        guest: 
            (PROMPT_STATS.byRole.guest || 0) + 
            (GREETING_STATS.byRole.guest || 0),
        customer: 
            (PROMPT_STATS.byRole.customer || 0) + 
            (GREETING_STATS.byRole.customer || 0),
        dispensary: 
            (PROMPT_STATS.byRole.dispensary || 0) + 
            (GREETING_STATS.byRole.dispensary || 0),
        brand: 
            (PROMPT_STATS.byRole.brand || 0) + 
            (GREETING_STATS.byRole.brand || 0),
        super_admin: 
            (PROMPT_STATS.byRole.super_admin || 0) + 
            (GREETING_STATS.byRole.super_admin || 0),
    },
    
    // Coverage Summary
    coverage: {
        clarificationScenarios: ALL_PROMPTS.filter(p => p.shouldAskClarification).length + AMBIGUOUS_PROMPTS.length,
        directResponseScenarios: ALL_PROMPTS.filter(p => !p.shouldAskClarification).length,
        errorHandlingScenarios: ERROR_SCENARIOS.length,
        permissionRequestScenarios: ALL_PERMISSION_PROMPTS.length,
    }
};

// =============================================================================
// PROMPT SIMULATION HELPERS
// =============================================================================

import type { PromptScenario } from './prompt-catalog';

/**
 * Get all prompts for a specific role
 */
export function getPromptsForRole(role: PromptScenario['role']): PromptScenario[] {
    const allScenarios = [
        ...ALL_PROMPTS,
        ...AMBIGUOUS_PROMPTS,
        ...ERROR_SCENARIOS,
        ...ALL_GREETINGS,
        ...ALL_PERMISSION_PROMPTS,
    ];
    return allScenarios.filter(p => p.role === role);
}

/**
 * Get all prompts for a specific category
 */
export function getPromptsForCategory(category: string): PromptScenario[] {
    const allScenarios = [
        ...ALL_PROMPTS,
        ...AMBIGUOUS_PROMPTS,
        ...ERROR_SCENARIOS,
        ...ALL_GREETINGS,
        ...ALL_PERMISSION_PROMPTS,
    ];
    return allScenarios.filter(p => p.category === category);
}

/**
 * Get all prompts that should trigger clarification
 */
export function getClarificationPrompts(): PromptScenario[] {
    const allScenarios = [
        ...ALL_PROMPTS,
        ...AMBIGUOUS_PROMPTS,
        ...ERROR_SCENARIOS,
        ...ALL_GREETINGS,
        ...ALL_PERMISSION_PROMPTS,
    ];
    return allScenarios.filter(p => p.shouldAskClarification);
}

/**
 * Get prompts by target agent
 */
export function getPromptsForAgent(agentId: string): PromptScenario[] {
    const allScenarios = [
        ...ALL_PROMPTS,
        ...AMBIGUOUS_PROMPTS,
        ...ERROR_SCENARIOS,
        ...ALL_GREETINGS,
        ...ALL_PERMISSION_PROMPTS,
    ];
    return allScenarios.filter(p => p.targetAgent === agentId);
}

// =============================================================================
// SIMULATION RUNNER TYPE
// =============================================================================

export interface PromptSimulationResult {
    promptId: string;
    prompt: string;
    expectedResponse: string;
    actualResponse?: string;
    passed?: boolean;
    latencyMs?: number;
    notes?: string;
}

export interface SimulationSummary {
    totalRun: number;
    passed: number;
    failed: number;
    avgLatencyMs: number;
    byRole: Record<string, { run: number; passed: number }>;
    byAgent: Record<string, { run: number; passed: number }>;
}

// =============================================================================
// PRINT STATS ON LOAD
// =============================================================================

console.log('='.repeat(60));
console.log('MASTER PROMPT CATALOG LOADED');
console.log('='.repeat(60));
console.log(`Total Prompt Scenarios: ${MASTER_PROMPT_STATS.totalPrompts}`);
console.log(`Multi-turn Conversations: ${MASTER_PROMPT_STATS.totalConversations} (${MASTER_PROMPT_STATS.totalConversationTurns} turns)`);
console.log('');
console.log('By Role:');
Object.entries(MASTER_PROMPT_STATS.byRole).forEach(([role, count]) => {
    console.log(`  ${role}: ${count} prompts`);
});
console.log('');
console.log('Coverage:');
console.log(`  Clarification scenarios: ${MASTER_PROMPT_STATS.coverage.clarificationScenarios}`);
console.log(`  Direct response scenarios: ${MASTER_PROMPT_STATS.coverage.directResponseScenarios}`);
console.log(`  Error handling scenarios: ${MASTER_PROMPT_STATS.coverage.errorHandlingScenarios}`);
console.log(`  Permission request scenarios: ${MASTER_PROMPT_STATS.coverage.permissionRequestScenarios}`);
console.log('='.repeat(60));
