/**
 * Validation Hooks Integration
 *
 * Helper functions to easily integrate validators into agents.
 * Provides ready-to-use onPreToolUse and onPostToolUse callbacks.
 */

import { logger } from '@/lib/logger';
import { PreToolHookResult, PostToolHookResult } from './harness';

// Import validators dynamically to avoid path issues
// The validators are in .claude/hooks/validators which is outside src

// ============================================================================
// VALIDATOR INTERFACES (Mirror from .claude/hooks/validators/base-validator.ts)
// ============================================================================

export interface ValidationResult {
    valid: boolean;
    score: number;
    issues: string[];
    remediation?: string;
    timestamp: string;
    validatorName: string;
    metadata?: Record<string, any>;
}

export interface ValidatorConfig {
    name: string;
    description: string;
    tools: string[];
    severity: 'error' | 'warning' | 'info';
    blocking: boolean;
    passThreshold?: number;
}

export interface BaseValidatorInterface {
    config: ValidatorConfig;
    validate(toolName: string, toolArgs: any, toolResult: any): Promise<ValidationResult>;
    preValidate?(toolName: string, toolArgs: any): Promise<PreToolHookResult>;
    shouldValidate(toolName: string): boolean;
}

// ============================================================================
// INLINE VALIDATORS
// Since validators are in .claude directory, we provide inline implementations
// ============================================================================

/**
 * Compliance Validator - Cannabis marketing compliance
 */
class InlineComplianceValidator implements BaseValidatorInterface {
    config: ValidatorConfig = {
        name: 'compliance-validator',
        description: 'Cannabis compliance validator',
        tools: ['sendSms', 'sendEmail', 'generateContent', 'generateSocialPost', 'createCampaign', 'broadcast'],
        severity: 'error',
        blocking: true,
        passThreshold: 80
    };

    shouldValidate(toolName: string): boolean {
        return this.config.tools.includes(toolName);
    }

    async validate(toolName: string, toolArgs: any, toolResult: any): Promise<ValidationResult> {
        const issues: string[] = [];
        let score = 100;

        const content = this.extractContent(toolArgs, toolResult);
        if (!content) {
            return this.pass();
        }

        const contentLower = content.toLowerCase();

        // Check appeals to minors
        const minorTerms = ['candy', 'cartoon', 'kid', 'children', 'toy'];
        for (const term of minorTerms) {
            if (contentLower.includes(term)) {
                issues.push(`May appeal to minors: contains "${term}"`);
                score -= 40;
            }
        }

        // Check medical claims
        const medicalTerms = ['cure', 'treat', 'heal', 'medicine', 'fda approved'];
        for (const term of medicalTerms) {
            if (contentLower.includes(term)) {
                issues.push(`Unverified medical claim: "${term}"`);
                score -= 30;
            }
        }

        // Check disclaimers
        if (!contentLower.includes('21+') && !contentLower.includes('21 and over')) {
            issues.push('Missing age disclaimer (21+)');
            score -= 20;
        }

        if (toolName === 'sendSms' && !contentLower.includes('stop')) {
            issues.push('SMS missing "Reply STOP" opt-out');
            score -= 15;
        }

        score = Math.max(0, score);

        if (issues.length > 0) {
            return {
                valid: score >= (this.config.passThreshold || 80),
                score,
                issues,
                remediation: 'Remove appeals to minors, unverified medical claims, and add required disclaimers (21+, Reply STOP for SMS)',
                timestamp: new Date().toISOString(),
                validatorName: this.config.name
            };
        }

        return this.pass();
    }

    private extractContent(args: any, result: any): string | null {
        return args?.content || args?.message || args?.body || result?.content || null;
    }

    private pass(): ValidationResult {
        return {
            valid: true,
            score: 100,
            issues: [],
            timestamp: new Date().toISOString(),
            validatorName: this.config.name
        };
    }
}

/**
 * Financial Validator - Math integrity and margin checks
 */
class InlineFinancialValidator implements BaseValidatorInterface {
    config: ValidatorConfig = {
        name: 'financial-validator',
        description: 'Financial math and margin validation',
        tools: ['getRevenueMetrics', 'forecastMRR', 'createDeal', 'crmGetStats', 'calculateMargin'],
        severity: 'error',
        blocking: true,
        passThreshold: 70
    };

    shouldValidate(toolName: string): boolean {
        return this.config.tools.includes(toolName);
    }

    async validate(toolName: string, toolArgs: any, toolResult: any): Promise<ValidationResult> {
        const issues: string[] = [];
        let score = 100;

        if (!toolResult || typeof toolResult !== 'object') {
            return this.pass();
        }

        // Check math integrity
        if (toolResult.revenue !== undefined && toolResult.cost !== undefined && toolResult.profit !== undefined) {
            const expected = toolResult.revenue - toolResult.cost;
            if (Math.abs(expected - toolResult.profit) > 0.01) {
                issues.push(`Math error: Revenue - Cost should equal Profit`);
                score -= 30;
            }
        }

        // Check margin sanity
        const margin = toolResult.margin || toolResult.profitMargin;
        if (margin !== undefined) {
            const marginValue = typeof margin === 'string' ? parseFloat(margin) : margin;
            if (marginValue > 90) {
                issues.push(`Unrealistic margin: ${marginValue}% (>90% requires explanation)`);
                score -= 20;
            }
        }

        score = Math.max(0, score);

        if (issues.length > 0) {
            return {
                valid: score >= (this.config.passThreshold || 70),
                score,
                issues,
                remediation: 'Verify calculations and ensure margins are realistic (typically 40-70%)',
                timestamp: new Date().toISOString(),
                validatorName: this.config.name
            };
        }

        return this.pass();
    }

    private pass(): ValidationResult {
        return {
            valid: true,
            score: 100,
            issues: [],
            timestamp: new Date().toISOString(),
            validatorName: this.config.name
        };
    }
}

/**
 * Data Validator - Freshness and accuracy
 */
class InlineDataValidator implements BaseValidatorInterface {
    config: ValidatorConfig = {
        name: 'data-validator',
        description: 'Data freshness and accuracy validation',
        tools: ['firecrawlScrapeMenu', 'rtrvrScrape', 'searchCompetitors', 'getAnalytics'],
        severity: 'warning',
        blocking: false,
        passThreshold: 70
    };

    shouldValidate(toolName: string): boolean {
        return this.config.tools.includes(toolName);
    }

    async validate(toolName: string, toolArgs: any, toolResult: any): Promise<ValidationResult> {
        const issues: string[] = [];
        let score = 100;

        if (!toolResult || typeof toolResult !== 'object') {
            return this.pass();
        }

        // Check data freshness
        const timestamp = toolResult.timestamp || toolResult.lastUpdated || toolResult.scrapedAt;
        if (timestamp) {
            const dataDate = new Date(timestamp);
            const daysSince = (Date.now() - dataDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince > 7) {
                issues.push(`Stale data: ${Math.floor(daysSince)} days old`);
                score -= 20;
            }
        }

        // Check for empty results
        if (toolResult.data && Array.isArray(toolResult.data) && toolResult.data.length === 0) {
            issues.push('Empty result set');
            score -= 15;
        }

        score = Math.max(0, score);

        if (issues.length > 0) {
            return {
                valid: score >= (this.config.passThreshold || 70),
                score,
                issues,
                remediation: 'Refresh data or verify data source is accessible',
                timestamp: new Date().toISOString(),
                validatorName: this.config.name
            };
        }

        return this.pass();
    }

    private pass(): ValidationResult {
        return {
            valid: true,
            score: 100,
            issues: [],
            timestamp: new Date().toISOString(),
            validatorName: this.config.name
        };
    }
}

/**
 * Orchestration Validator - Workflow and delegation checks
 */
class InlineOrchestrationValidator implements BaseValidatorInterface {
    private VALID_AGENTS = [
        'leo', 'linus', 'jack', 'glenda', 'mike', 'mike_exec',
        'craig', 'smokey', 'pops', 'ezal', 'deebo',
        'mrs_parker', 'money_mike', 'day_day'
    ];

    config: ValidatorConfig = {
        name: 'orchestration-validator',
        description: 'Workflow and delegation validation',
        tools: ['delegateTask', 'broadcastToSquad', 'createWorkflow', 'executeWorkflow'],
        severity: 'error',
        blocking: true,
        passThreshold: 80
    };

    shouldValidate(toolName: string): boolean {
        return this.config.tools.includes(toolName);
    }

    async validate(toolName: string, toolArgs: any, toolResult: any): Promise<ValidationResult> {
        const issues: string[] = [];
        let score = 100;

        // Check agent ID validity
        const agentId = toolArgs?.personaId || toolArgs?.agentId;
        if (agentId && !this.VALID_AGENTS.includes(agentId.toLowerCase())) {
            issues.push(`Invalid agent ID: "${agentId}"`);
            score -= 30;
        }

        // Check broadcast recipients
        const recipients = toolArgs?.agentIds || toolArgs?.recipients;
        if (Array.isArray(recipients)) {
            const invalid = recipients.filter((id: string) => !this.VALID_AGENTS.includes(id.toLowerCase()));
            if (invalid.length > 0) {
                issues.push(`Invalid agent IDs: ${invalid.join(', ')}`);
                score -= 30;
            }
        }

        // Check task clarity
        const task = toolArgs?.task || toolArgs?.message;
        if (task && task.length < 10) {
            issues.push('Task description too short');
            score -= 15;
        }

        score = Math.max(0, score);

        if (issues.length > 0) {
            return {
                valid: score >= (this.config.passThreshold || 80),
                score,
                issues,
                remediation: `Use valid agent IDs: ${this.VALID_AGENTS.slice(0, 8).join(', ')}... and provide clear task descriptions`,
                timestamp: new Date().toISOString(),
                validatorName: this.config.name
            };
        }

        return this.pass();
    }

    private pass(): ValidationResult {
        return {
            valid: true,
            score: 100,
            issues: [],
            timestamp: new Date().toISOString(),
            validatorName: this.config.name
        };
    }
}

// ============================================================================
// VALIDATION PIPELINE
// ============================================================================

class ValidationPipeline {
    private validators: BaseValidatorInterface[] = [];

    add(validator: BaseValidatorInterface): ValidationPipeline {
        this.validators.push(validator);
        return this;
    }

    async validate(toolName: string, toolArgs: any, toolResult: any): Promise<ValidationResult> {
        const applicable = this.validators.filter(v => v.shouldValidate(toolName));

        if (applicable.length === 0) {
            return {
                valid: true,
                score: 100,
                issues: [],
                timestamp: new Date().toISOString(),
                validatorName: 'pipeline'
            };
        }

        const allIssues: string[] = [];
        const allRemediations: string[] = [];
        let lowestScore = 100;
        let anyFailed = false;

        for (const validator of applicable) {
            const result = await validator.validate(toolName, toolArgs, toolResult);
            if (!result.valid && validator.config.blocking) {
                anyFailed = true;
            }
            allIssues.push(...result.issues);
            if (result.remediation) {
                allRemediations.push(`[${validator.config.name}]: ${result.remediation}`);
            }
            if (result.score < lowestScore) {
                lowestScore = result.score;
            }
        }

        return {
            valid: !anyFailed,
            score: lowestScore,
            issues: allIssues,
            remediation: allRemediations.join('\n\n'),
            timestamp: new Date().toISOString(),
            validatorName: 'pipeline'
        };
    }
}

// ============================================================================
// AGENT ROLE TO PIPELINE MAPPING
// ============================================================================

export type AgentRole =
    | 'executive_coo'
    | 'executive_cto'
    | 'executive_cro'
    | 'executive_cmo'
    | 'executive_cfo'
    | 'marketing'
    | 'budtender'
    | 'compliance'
    | 'analytics'
    | 'competitive_intel'
    | 'retention'
    | 'pricing'
    | 'general';

const AGENT_ROLE_MAP: Record<string, AgentRole> = {
    'leo': 'executive_coo',
    'linus': 'executive_cto',
    'jack': 'executive_cro',
    'glenda': 'executive_cmo',
    'mike': 'executive_cfo',
    'mike_exec': 'executive_cfo',
    'craig': 'marketing',
    'day_day': 'marketing',
    'smokey': 'budtender',
    'deebo': 'compliance',
    'pops': 'analytics',
    'ezal': 'competitive_intel',
    'mrs_parker': 'retention',
    'money_mike': 'pricing'
};

function createPipelineForRole(role: AgentRole): ValidationPipeline {
    const pipeline = new ValidationPipeline();

    switch (role) {
        case 'executive_coo':
            pipeline.add(new InlineOrchestrationValidator());
            pipeline.add(new InlineFinancialValidator());
            break;
        case 'executive_cto':
            pipeline.add(new InlineComplianceValidator());
            break;
        case 'executive_cro':
            pipeline.add(new InlineFinancialValidator());
            pipeline.add(new InlineDataValidator());
            break;
        case 'executive_cmo':
            pipeline.add(new InlineComplianceValidator());
            break;
        case 'executive_cfo':
            pipeline.add(new InlineFinancialValidator());
            break;
        case 'marketing':
            pipeline.add(new InlineComplianceValidator());
            break;
        case 'budtender':
            pipeline.add(new InlineComplianceValidator());
            pipeline.add(new InlineDataValidator());
            break;
        case 'compliance':
            pipeline.add(new InlineComplianceValidator());
            break;
        case 'analytics':
            pipeline.add(new InlineDataValidator());
            pipeline.add(new InlineFinancialValidator());
            break;
        case 'competitive_intel':
            pipeline.add(new InlineDataValidator());
            break;
        case 'retention':
            pipeline.add(new InlineDataValidator());
            pipeline.add(new InlineComplianceValidator());
            break;
        case 'pricing':
            pipeline.add(new InlineFinancialValidator());
            pipeline.add(new InlineComplianceValidator());
            break;
        default:
            pipeline.add(new InlineComplianceValidator());
            break;
    }

    return pipeline;
}

// ============================================================================
// HOOK FACTORY
// ============================================================================

/**
 * Create validation hooks for an agent.
 * Returns onPreToolUse and onPostToolUse callbacks ready for use in MultiStepContext.
 *
 * @param agentId - The agent ID (e.g., 'leo', 'craig', 'smokey')
 * @returns Object with onPostToolUse callback
 */
export function createValidationHooks(agentId: string): {
    onPostToolUse: (toolName: string, args: any, result: any) => Promise<PostToolHookResult>;
} {
    const role = AGENT_ROLE_MAP[agentId.toLowerCase()] || 'general';
    const pipeline = createPipelineForRole(role);

    return {
        onPostToolUse: async (toolName: string, args: any, result: any): Promise<PostToolHookResult> => {
            const validationResult = await pipeline.validate(toolName, args, result);

            logger.info(`[Validation:${agentId}] Tool ${toolName}: score=${validationResult.score}, valid=${validationResult.valid}`);

            return {
                valid: validationResult.valid,
                issues: validationResult.issues,
                remediation: validationResult.remediation,
                shouldRetry: !validationResult.valid && validationResult.score > 30 // Retry if score > 30
            };
        }
    };
}

/**
 * Get the role for an agent ID
 */
export function getAgentRole(agentId: string): AgentRole {
    return AGENT_ROLE_MAP[agentId.toLowerCase()] || 'general';
}

export default createValidationHooks;
