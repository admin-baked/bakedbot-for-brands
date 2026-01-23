/**
 * Security Module Exports
 *
 * Centralized security utilities for the BakedBot platform.
 */

// Prompt injection protection
export {
    validateInput,
    validateOutput,
    buildStructuredPrompt,
    isInputLikelySafe,
    getRiskLevel,
    // Canary token system
    generateCanaryToken,
    embedCanaryToken,
    checkCanaryLeakage,
    validateOutputWithCanary,
    type PromptGuardResult,
    type PromptFlag,
    type OutputValidationResult,
    type OutputFlag,
} from './prompt-guard';

// Sanitization utilities
export {
    sanitizeForPrompt,
    wrapUserData,
    wrapUserDataSecure,
    buildSystemDirectives,
    buildSecurePrompt,
    sanitizeObjectStrings,
} from './sanitize';
