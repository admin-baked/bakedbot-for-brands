/**
 * Validation Pipeline Factory
 *
 * Creates role-appropriate validation pipelines for each agent type.
 * Maps agent roles to their specialized validators.
 */

import { ValidationPipeline } from './base-validator';
import { ComplianceValidator } from './compliance-validator';
import { FinancialValidator } from './financial-validator';
import { TechnicalValidator } from './technical-validator';
import { MarketingValidator } from './marketing-validator';
import { DataValidator } from './data-validator';
import { RecommendationValidator } from './recommendation-validator';
import { OrchestrationValidator } from './orchestration-validator';

// ============================================================================
// AGENT ROLE DEFINITIONS
// ============================================================================

export type AgentRole =
    | 'executive_coo'      // Leo - orchestration focused
    | 'executive_cto'      // Linus - technical focused
    | 'executive_cro'      // Jack - revenue focused
    | 'executive_cmo'      // Glenda - marketing focused
    | 'executive_cfo'      // Mike - financial focused
    | 'marketing'          // Craig, Day Day - marketing execution
    | 'budtender'          // Smokey - product recommendations
    | 'compliance'         // Deebo - regulatory compliance
    | 'analytics'          // Pops - data analysis
    | 'competitive_intel'  // Ezal - market research
    | 'retention'          // Mrs. Parker - churn prevention
    | 'pricing'            // Money Mike - pricing strategy
    | 'general';           // Default fallback

// ============================================================================
// AGENT TO ROLE MAPPING
// ============================================================================

const AGENT_ROLE_MAP: Record<string, AgentRole> = {
    // Executive Suite
    'leo': 'executive_coo',
    'linus': 'executive_cto',
    'jack': 'executive_cro',
    'glenda': 'executive_cmo',
    'mike': 'executive_cfo',
    'mike_exec': 'executive_cfo',

    // Support Team
    'craig': 'marketing',
    'day_day': 'marketing',
    'smokey': 'budtender',
    'deebo': 'compliance',
    'pops': 'analytics',
    'ezal': 'competitive_intel',
    'mrs_parker': 'retention',
    'money_mike': 'pricing',

    // Other agents default to general
    'felisha': 'general',
    'big_worm': 'general',
    'roach': 'general'
};

// ============================================================================
// PIPELINE FACTORY
// ============================================================================

/**
 * Create a validation pipeline appropriate for the given agent role.
 * Each role gets a specific combination of validators.
 *
 * @param role - The agent role or agent ID
 * @returns ValidationPipeline configured for that role
 */
export function createValidationPipeline(role: AgentRole | string): ValidationPipeline {
    const pipeline = new ValidationPipeline();

    // If passed an agent ID, map it to a role
    const actualRole = AGENT_ROLE_MAP[role.toLowerCase()] || role as AgentRole;

    switch (actualRole) {
        // === EXECUTIVE TIER ===

        case 'executive_coo':
            // Leo: Orchestration + Financial (for resource allocation)
            pipeline.add(new OrchestrationValidator());
            pipeline.add(new FinancialValidator());
            break;

        case 'executive_cto':
            // Linus: Technical + Compliance (for code security)
            pipeline.add(new TechnicalValidator());
            pipeline.add(new ComplianceValidator()); // Security compliance
            break;

        case 'executive_cro':
            // Jack: Financial (revenue) + Data (pipeline accuracy)
            pipeline.add(new FinancialValidator());
            pipeline.add(new DataValidator());
            break;

        case 'executive_cmo':
            // Glenda: Marketing + Compliance (cannabis regulations)
            pipeline.add(new MarketingValidator());
            pipeline.add(new ComplianceValidator());
            break;

        case 'executive_cfo':
            // Mike: Financial (primary) + Data (accuracy)
            pipeline.add(new FinancialValidator());
            pipeline.add(new DataValidator());
            break;

        // === SUPPORT TIER ===

        case 'marketing':
            // Craig, Day Day: Compliance (critical) + Marketing
            pipeline.add(new ComplianceValidator()); // Must pass compliance first
            pipeline.add(new MarketingValidator());
            break;

        case 'budtender':
            // Smokey: Recommendation + Compliance + Data (inventory)
            pipeline.add(new RecommendationValidator());
            pipeline.add(new ComplianceValidator()); // Age-gating, etc.
            pipeline.add(new DataValidator()); // Inventory freshness
            break;

        case 'compliance':
            // Deebo: Compliance only (he IS the compliance)
            pipeline.add(new ComplianceValidator());
            break;

        case 'analytics':
            // Pops: Data (primary) + Financial (for revenue analytics)
            pipeline.add(new DataValidator());
            pipeline.add(new FinancialValidator());
            break;

        case 'competitive_intel':
            // Ezal: Data (freshness/accuracy) + Compliance (no false claims)
            pipeline.add(new DataValidator());
            pipeline.add(new ComplianceValidator());
            break;

        case 'retention':
            // Mrs. Parker: Data (churn predictions) + Marketing (campaigns)
            pipeline.add(new DataValidator());
            pipeline.add(new MarketingValidator());
            pipeline.add(new ComplianceValidator());
            break;

        case 'pricing':
            // Money Mike: Financial (primary) + Compliance (pricing regulations)
            pipeline.add(new FinancialValidator());
            pipeline.add(new ComplianceValidator());
            break;

        case 'general':
        default:
            // Default: Compliance only (minimum safety net)
            pipeline.add(new ComplianceValidator());
            break;
    }

    return pipeline;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the role for an agent ID
 */
export function getAgentRole(agentId: string): AgentRole {
    return AGENT_ROLE_MAP[agentId.toLowerCase()] || 'general';
}

/**
 * Get all validators for an agent
 */
export function getValidatorsForAgent(agentId: string): string[] {
    const pipeline = createValidationPipeline(agentId);
    return pipeline.getValidators().map(v => v.config.name);
}

/**
 * Check if a specific validator applies to an agent
 */
export function hasValidator(agentId: string, validatorName: string): boolean {
    const pipeline = createValidationPipeline(agentId);
    return pipeline.getValidators().some(v => v.config.name === validatorName);
}

export default createValidationPipeline;
