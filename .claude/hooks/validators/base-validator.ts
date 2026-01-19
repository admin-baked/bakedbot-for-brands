/**
 * Base Validator Interface
 *
 * Foundation for specialized self-validation in BakedBot agents.
 * Each domain-specific validator extends this base class.
 *
 * Key Principle: "A focused validator with one purpose outperforms
 * an unfocused validator with many purposes."
 */

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export interface ValidationResult {
    /** Whether the validation passed */
    valid: boolean;

    /** Score from 0-100 (100 = perfect) */
    score: number;

    /** List of specific issues found */
    issues: string[];

    /** Instructions for the agent to fix the issues */
    remediation?: string;

    /** Additional metadata for logging/debugging */
    metadata?: Record<string, any>;

    /** Timestamp of validation */
    timestamp: string;

    /** Validator that produced this result */
    validatorName: string;
}

export interface ValidatorConfig {
    /** Unique name for this validator */
    name: string;

    /** Human-readable description */
    description: string;

    /** Tools that trigger this validator (e.g., ['sendSms', 'sendEmail']) */
    tools: string[];

    /** Severity level - error blocks, warning logs, info is informational */
    severity: 'error' | 'warning' | 'info';

    /** Whether this validator should run synchronously (blocking) */
    blocking: boolean;

    /** Maximum score threshold to pass (default 60) */
    passThreshold?: number;
}

// ============================================================================
// PRE/POST HOOK TYPES
// ============================================================================

export interface PreToolHookResult {
    /** Whether to proceed with tool execution */
    proceed: boolean;

    /** Optionally modify the args before execution */
    modifiedArgs?: any;

    /** Reason if not proceeding */
    reason?: string;
}

export interface PostToolHookResult {
    /** Whether validation passed */
    valid: boolean;

    /** Issues found during validation */
    issues?: string[];

    /** Instructions for remediation */
    remediation?: string;

    /** Whether agent should retry with remediation */
    shouldRetry?: boolean;

    /** Full validation result for logging */
    validationResult?: ValidationResult;
}

// ============================================================================
// BASE VALIDATOR CLASS
// ============================================================================

export abstract class BaseValidator {
    abstract config: ValidatorConfig;

    /**
     * Main validation method - override in subclasses
     *
     * @param toolName - Name of the tool that was called
     * @param toolArgs - Arguments passed to the tool
     * @param toolResult - Result returned by the tool
     * @returns ValidationResult with pass/fail, score, issues, and remediation
     */
    abstract validate(
        toolName: string,
        toolArgs: any,
        toolResult: any
    ): Promise<ValidationResult>;

    /**
     * Optional pre-execution validation
     * Override to validate inputs before tool runs
     */
    async preValidate(toolName: string, toolArgs: any): Promise<PreToolHookResult> {
        return { proceed: true };
    }

    /**
     * Check if this validator should run for a given tool
     */
    shouldValidate(toolName: string): boolean {
        return this.config.tools.includes(toolName) || this.config.tools.includes('*');
    }

    /**
     * Create a passing validation result
     */
    protected pass(metadata?: Record<string, any>): ValidationResult {
        return {
            valid: true,
            score: 100,
            issues: [],
            timestamp: new Date().toISOString(),
            validatorName: this.config.name,
            metadata
        };
    }

    /**
     * Create a failing validation result
     */
    protected fail(
        issues: string[],
        remediation: string,
        score: number = 0,
        metadata?: Record<string, any>
    ): ValidationResult {
        return {
            valid: false,
            score,
            issues,
            remediation,
            timestamp: new Date().toISOString(),
            validatorName: this.config.name,
            metadata
        };
    }

    /**
     * Create a warning validation result (passes but with issues)
     */
    protected warn(
        issues: string[],
        score: number = 70,
        metadata?: Record<string, any>
    ): ValidationResult {
        return {
            valid: true, // Still passes
            score,
            issues,
            timestamp: new Date().toISOString(),
            validatorName: this.config.name,
            metadata
        };
    }
}

// ============================================================================
// VALIDATION PIPELINE
// ============================================================================

export class ValidationPipeline {
    private validators: BaseValidator[] = [];

    /**
     * Add a validator to the pipeline
     */
    add(validator: BaseValidator): ValidationPipeline {
        this.validators.push(validator);
        return this;
    }

    /**
     * Run all applicable validators for a tool
     * Returns combined result - fails if any blocking validator fails
     */
    async validate(
        toolName: string,
        toolArgs: any,
        toolResult: any
    ): Promise<ValidationResult> {
        const applicableValidators = this.validators.filter(v => v.shouldValidate(toolName));

        if (applicableValidators.length === 0) {
            return {
                valid: true,
                score: 100,
                issues: [],
                timestamp: new Date().toISOString(),
                validatorName: 'pipeline',
                metadata: { skipped: true, reason: 'No validators for this tool' }
            };
        }

        const allIssues: string[] = [];
        const allRemediations: string[] = [];
        let lowestScore = 100;
        let anyFailed = false;

        for (const validator of applicableValidators) {
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
            remediation: allRemediations.length > 0 ? allRemediations.join('\n\n') : undefined,
            timestamp: new Date().toISOString(),
            validatorName: 'pipeline',
            metadata: {
                validatorsRun: applicableValidators.map(v => v.config.name),
                totalValidators: applicableValidators.length
            }
        };
    }

    /**
     * Run pre-validation for all applicable validators
     */
    async preValidate(toolName: string, toolArgs: any): Promise<PreToolHookResult> {
        const applicableValidators = this.validators.filter(v => v.shouldValidate(toolName));

        for (const validator of applicableValidators) {
            const result = await validator.preValidate(toolName, toolArgs);
            if (!result.proceed) {
                return result;
            }
            // Use modified args for subsequent validators
            if (result.modifiedArgs) {
                toolArgs = result.modifiedArgs;
            }
        }

        return { proceed: true, modifiedArgs: toolArgs };
    }

    /**
     * Get all validators in the pipeline
     */
    getValidators(): BaseValidator[] {
        return [...this.validators];
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a string contains placeholder text
 */
export function hasPlaceholders(text: string): string[] {
    const placeholders: string[] = [];
    const patterns = [
        /\[Your [\w\s]+\]/gi,
        /\[Insert [\w\s]+\]/gi,
        /\[Brand\]/gi,
        /\[Company\]/gi,
        /\[Product\]/gi,
        /\[Name\]/gi,
        /\[Date\]/gi,
        /\[Time\]/gi,
        /\[Location\]/gi,
        /\[State\]/gi,
        /\[Competitor\]/gi,
        /XXX+/g,
        /TODO:/gi,
        /FIXME:/gi,
    ];

    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            placeholders.push(...matches);
        }
    }

    return placeholders;
}

/**
 * Validate currency formatting
 */
export function isValidCurrency(value: string): boolean {
    // Matches $X,XXX.XX or $X.XX or $XXX
    return /^\$[\d,]+(\.\d{2})?$/.test(value);
}

/**
 * Check for hardcoded secrets in text
 */
export function findSecrets(text: string): string[] {
    const secrets: string[] = [];
    const patterns = [
        { name: 'API Key', pattern: /api[_-]?key['":\s]*['"]([\w-]{20,})['"]/gi },
        { name: 'Stripe Key', pattern: /sk_(live|test)_[\w]{24,}/gi },
        { name: 'AWS Key', pattern: /AKIA[\w]{16}/gi },
        { name: 'Private Key', pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/gi },
        { name: 'JWT', pattern: /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/gi },
        { name: 'Firebase Key', pattern: /AIza[\w-]{35}/gi },
    ];

    for (const { name, pattern } of patterns) {
        if (pattern.test(text)) {
            secrets.push(name);
        }
    }

    return secrets;
}

/**
 * Cannabis compliance keywords that suggest issues
 */
export const COMPLIANCE_RED_FLAGS = {
    minorAppeal: [
        'candy', 'cartoon', 'kid', 'children', 'toy', 'game', 'fun',
        'superhero', 'disney', 'pokemon', 'animal character'
    ],
    medicalClaims: [
        'cure', 'treat', 'heal', 'medicine', 'prescription', 'doctor recommended',
        'clinically proven', 'FDA approved', 'therapeutic', 'medical grade'
    ],
    missingDisclaimers: [
        '21+', 'twenty-one', 'adults only', 'of legal age'
    ]
};

export default BaseValidator;
