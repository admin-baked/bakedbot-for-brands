/**
 * Resilient Fetch Wrapper
 *
 * Combines circuit breaker + retry + timeout in a single fetch call.
 * Use instead of raw `fetch()` for external service calls.
 *
 * @example
 * ```ts
 * const res = await resilientFetch('https://api.alleaves.com/inventory', {
 *     circuitName: 'alleaves',
 *     method: 'POST',
 *     body: JSON.stringify({ query: '' }),
 *     headers: { Authorization: `Bearer ${token}` },
 * });
 * ```
 */

import { logger } from '@/lib/logger';
import { getCircuitBreaker, CircuitOpenError } from '@/server/services/circuit-breaker';
import type { RetryConfig } from '@/types/resilience';
import { DEFAULT_RETRY_CONFIG } from '@/types/resilience';

export interface ResilientFetchOptions extends RequestInit {
    circuitName: string;
    retryConfig?: Partial<RetryConfig>;
}

/**
 * Fetch with circuit breaker protection and automatic retry.
 */
export async function resilientFetch(
    url: string,
    options: ResilientFetchOptions,
): Promise<Response> {
    const { circuitName, retryConfig: userRetry, ...fetchOptions } = options;
    const breaker = getCircuitBreaker(circuitName);
    const retryConf: RetryConfig = {
        ...DEFAULT_RETRY_CONFIG,
        ...userRetry,
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retryConf.maxRetries; attempt++) {
        try {
            const response = await breaker.execute(() => fetch(url, fetchOptions));

            // Treat server errors as failures for retry
            if (!response.ok && response.status >= 500) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));

            // Circuit open = fail fast, no retry
            if (err instanceof CircuitOpenError) {
                throw err;
            }

            // Check if error is retryable
            if (retryConf.retryableErrors && retryConf.retryableErrors.length > 0) {
                const isRetryable = retryConf.retryableErrors.some(
                    (pattern) => lastError!.message.includes(pattern),
                );
                if (!isRetryable) {
                    throw lastError;
                }
            }

            // Last attempt = give up
            if (attempt >= retryConf.maxRetries) {
                break;
            }

            // Exponential backoff
            const delayMs = retryConf.delaysMs[attempt] ?? retryConf.delaysMs[retryConf.delaysMs.length - 1];
            logger.warn(`[resilientFetch] ${circuitName} attempt ${attempt + 1} failed, retrying in ${delayMs}ms`, {
                url,
                error: lastError.message,
            });

            await sleep(delayMs);
        }
    }

    throw lastError ?? new Error(`resilientFetch failed for ${circuitName}`);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
