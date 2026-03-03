/**
 * Resilience Types — Circuit Breaker + Retry Configuration
 *
 * Defines the circuit breaker state machine and retry policies
 * for external service calls (Alleaves POS, fal.ai, Jina, Mailjet, Claude).
 */

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------

export interface CircuitBreakerConfig {
    name: string;
    failureThreshold: number;       // failures before opening (default: 5)
    resetTimeMs: number;            // time in open state before half-open (default: 60_000)
    halfOpenMaxAttempts: number;     // attempts in half-open before closing (default: 2)
    timeoutMs: number;              // per-call timeout (default: 30_000)
}

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerStatus {
    name: string;
    state: CircuitState;
    failureCount: number;
    lastFailureAt?: Date;
    lastSuccessAt?: Date;
    openedAt?: Date;
}

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

export interface RetryConfig {
    maxRetries: number;
    delaysMs: number[];
    retryableErrors?: string[];
}

// ---------------------------------------------------------------------------
// Defaults per external service
// ---------------------------------------------------------------------------

export const RESILIENCE_DEFAULTS: Record<string, CircuitBreakerConfig> = {
    alleaves:  { name: 'alleaves',  failureThreshold: 3, resetTimeMs: 120_000, halfOpenMaxAttempts: 1, timeoutMs: 15_000 },
    'fal-ai':  { name: 'fal-ai',   failureThreshold: 5, resetTimeMs: 60_000,  halfOpenMaxAttempts: 2, timeoutMs: 30_000 },
    jina:      { name: 'jina',      failureThreshold: 5, resetTimeMs: 60_000,  halfOpenMaxAttempts: 2, timeoutMs: 10_000 },
    mailjet:   { name: 'mailjet',   failureThreshold: 3, resetTimeMs: 300_000, halfOpenMaxAttempts: 1, timeoutMs: 10_000 },
    claude:    { name: 'claude',    failureThreshold: 3, resetTimeMs: 120_000, halfOpenMaxAttempts: 1, timeoutMs: 60_000 },
    gemini:    { name: 'gemini',    failureThreshold: 3, resetTimeMs: 120_000, halfOpenMaxAttempts: 1, timeoutMs: 30_000 },
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    delaysMs: [5_000, 30_000, 300_000], // 5s, 30s, 5m — same as webhook-retry-processor.ts
};
