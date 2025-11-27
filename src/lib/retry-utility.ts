// src/lib/retry-utility.ts
import { logger } from './monitoring';

export interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    jitterMs?: number;
    retryableErrors?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 100,
    retryableErrors: (error: any) => {
        // Retry on network errors, timeouts, and 5xx server errors
        if (error.name === 'AbortError' || error.name === 'TimeoutError') return true;
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;

        // For HTTP responses, retry on 429 (rate limit) and 5xx (server errors)
        if (error.status) {
            return error.status === 429 || (error.status >= 500 && error.status < 600);
        }

        return false;
    }
};

/**
 * Execute an async function with retry logic and exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
    context?: string
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            const result = await fn();

            if (attempt > 0) {
                logger.info(`Retry succeeded on attempt ${attempt + 1}`, { context });
            }

            return result;
        } catch (error: any) {
            lastError = error;

            // Check if error is retryable
            if (!opts.retryableErrors(error)) {
                logger.warn(`Non-retryable error encountered`, {
                    context,
                    error: error.message,
                    errorType: error.name || error.constructor?.name
                });
                throw error;
            }

            // Don't retry if we've exhausted attempts
            if (attempt >= opts.maxRetries) {
                logger.error(`Max retries (${opts.maxRetries}) exceeded`, {
                    context,
                    error: error.message
                });
                break;
            }

            // Calculate delay with exponential backoff and jitter
            const baseDelay = Math.min(
                opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
                opts.maxDelayMs
            );
            const jitter = Math.random() * opts.jitterMs;
            const delay = baseDelay + jitter;

            logger.warn(`Retrying after ${Math.round(delay)}ms (attempt ${attempt + 1}/${opts.maxRetries})`, {
                context,
                error: error.message,
                nextAttempt: attempt + 2
            });

            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate limiter to prevent overwhelming APIs
 */
export class RateLimiter {
    private queue: Array<() => void> = [];
    private activeRequests = 0;

    constructor(
        private maxConcurrent: number = 5,
        private minDelayMs: number = 100
    ) { }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Wait for a slot to be available
        await this.waitForSlot();

        this.activeRequests++;

        try {
            const result = await fn();
            return result;
        } finally {
            // Add minimum delay between requests
            await sleep(this.minDelayMs);
            this.activeRequests--;
            this.processQueue();
        }
    }

    private waitForSlot(): Promise<void> {
        if (this.activeRequests < this.maxConcurrent) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.queue.push(resolve);
        });
    }

    private processQueue() {
        if (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
            const next = this.queue.shift();
            if (next) next();
        }
    }
}
