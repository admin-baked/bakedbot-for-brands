/**
 * Validators Index
 *
 * Export all validators and the pipeline factory for easy import.
 */

// Base classes and types
export {
    BaseValidator,
    ValidationPipeline,
    ValidationResult,
    ValidatorConfig,
    PreToolHookResult,
    PostToolHookResult,
    hasPlaceholders,
    isValidCurrency,
    findSecrets,
    COMPLIANCE_RED_FLAGS
} from './base-validator';

// Domain-specific validators
export { ComplianceValidator } from './compliance-validator';
export { FinancialValidator } from './financial-validator';
export { TechnicalValidator } from './technical-validator';
export { MarketingValidator } from './marketing-validator';
export { DataValidator } from './data-validator';
export { RecommendationValidator } from './recommendation-validator';
export { OrchestrationValidator } from './orchestration-validator';

// Pipeline factory
export { createValidationPipeline, AgentRole } from './validation-pipeline';
