/**
 * Circuit Breaker Service
 *
 * In-memory circuit breaker for external service calls.
 * State machine: Closed → Open → Half-Open → Closed.
 *
 * Same pattern as workflow-registry.ts (in-memory Map, no external deps).
 * Wraps calls with automatic timeout via Promise.race.
 */

import { logger } from '@/lib/logger';
import type {
    CircuitBreakerConfig,
    CircuitBreakerStatus,
    CircuitState,
} from '@/types/resilience';
import { RESILIENCE_DEFAULTS } from '@/types/resilience';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CircuitOpenError extends Error {
    constructor(name: string) {
        super(`Circuit breaker "${name}" is open — calls blocked until reset`);
        this.name = 'CircuitOpenError';
    }
}

export class CircuitTimeoutError extends Error {
    constructor(name: string, timeoutMs: number) {
        super(`Circuit breaker "${name}" call timed out after ${timeoutMs}ms`);
        this.name = 'CircuitTimeoutError';
    }
}

// ---------------------------------------------------------------------------
// Circuit Breaker Instance
// ---------------------------------------------------------------------------

class CircuitBreaker {
    private state: CircuitState = 'closed';
    private failureCount = 0;
    private halfOpenAttempts = 0;
    private lastFailureAt?: Date;
    private lastSuccessAt?: Date;
    private openedAt?: Date;
    private readonly config: CircuitBreakerConfig;

    constructor(config: CircuitBreakerConfig) {
        this.config = config;
    }

    /**
     * Execute a function through the circuit breaker.
     * - Closed: pass through, track failures
     * - Open: reject immediately (fail fast)
     * - Half-Open: allow limited probes
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Check if we should transition from open → half-open
        if (this.state === 'open') {
            const elapsed = Date.now() - (this.openedAt?.getTime() ?? 0);
            if (elapsed >= this.config.resetTimeMs) {
                this.transitionTo('half_open');
            } else {
                throw new CircuitOpenError(this.config.name);
            }
        }

        // Half-open: check if we've exceeded probe limit
        if (this.state === 'half_open' && this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
            throw new CircuitOpenError(this.config.name);
        }

        // Execute with timeout
        try {
            const result = await this.withTimeout(fn);
            this.onSuccess();
            return result;
        } catch (err) {
            this.onFailure();
            throw err;
        }
    }

    getStatus(): CircuitBreakerStatus {
        return {
            name: this.config.name,
            state: this.state,
            failureCount: this.failureCount,
            lastFailureAt: this.lastFailureAt,
            lastSuccessAt: this.lastSuccessAt,
            openedAt: this.openedAt,
        };
    }

    reset(): void {
        this.state = 'closed';
        this.failureCount = 0;
        this.halfOpenAttempts = 0;
        this.openedAt = undefined;
        logger.info(`[CircuitBreaker] ${this.config.name}: reset to closed`);
    }

    // -----------------------------------------------------------------------
    // State transitions
    // -----------------------------------------------------------------------

    private onSuccess(): void {
        this.lastSuccessAt = new Date();

        if (this.state === 'half_open') {
            // Probe succeeded → close the circuit
            this.transitionTo('closed');
        }

        // Reset failure count on success in closed state
        if (this.state === 'closed') {
            this.failureCount = 0;
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureAt = new Date();

        if (this.state === 'half_open') {
            // Probe failed → re-open
            this.transitionTo('open');
            return;
        }

        if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
            this.transitionTo('open');
        }
    }

    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;
        this.state = newState;

        if (newState === 'open') {
            this.openedAt = new Date();
            logger.warn(`[CircuitBreaker] ${this.config.name}: ${oldState} → OPEN (failures: ${this.failureCount})`);
        } else if (newState === 'half_open') {
            this.halfOpenAttempts = 0;
            logger.info(`[CircuitBreaker] ${this.config.name}: ${oldState} → HALF_OPEN`);
        } else if (newState === 'closed') {
            this.failureCount = 0;
            this.halfOpenAttempts = 0;
            this.openedAt = undefined;
            logger.info(`[CircuitBreaker] ${this.config.name}: ${oldState} → CLOSED`);
        }
    }

    // -----------------------------------------------------------------------
    // Timeout
    // -----------------------------------------------------------------------

    private withTimeout<T>(fn: () => Promise<T>): Promise<T> {
        return Promise.race([
            fn(),
            new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new CircuitTimeoutError(this.config.name, this.config.timeoutMs)),
                    this.config.timeoutMs,
                ),
            ),
        ]);
    }
}

// ---------------------------------------------------------------------------
// Global Registry
// ---------------------------------------------------------------------------

const breakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a named service.
 * Uses RESILIENCE_DEFAULTS if no config provided.
 */
export function getCircuitBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
    let breaker = breakers.get(name);
    if (!breaker) {
        const defaults = RESILIENCE_DEFAULTS[name] ?? {
            name,
            failureThreshold: 5,
            resetTimeMs: 60_000,
            halfOpenMaxAttempts: 2,
            timeoutMs: 30_000,
        };
        breaker = new CircuitBreaker({ ...defaults, ...config });
        breakers.set(name, breaker);
    }
    return breaker;
}

/**
 * Get status of all registered circuit breakers.
 */
export function getAllCircuitStatus(): CircuitBreakerStatus[] {
    return Array.from(breakers.values()).map((b) => b.getStatus());
}

/**
 * Reset a specific circuit breaker to closed state.
 */
export function resetCircuit(name: string): void {
    const breaker = breakers.get(name);
    if (breaker) {
        breaker.reset();
    }
}

/**
 * Clear all circuit breakers (for testing).
 */
export function clearAllCircuits(): void {
    breakers.clear();
}
