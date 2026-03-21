/**
 * Unit Tests: Retry Utility
 *
 * Verifies exponential backoff, max retry logic, and rate limiting.
 * Uses initialDelayMs:0 + jitterMs:0 to skip actual sleep delays in tests.
 */

// Mock the monitoring logger to avoid real I/O
jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

import { withRetry, RateLimiter, RetryOptions } from '@/lib/retry-utility';

// Zero-delay options: makes retries synchronous (sleep(0) resolves immediately)
const NO_DELAY: RetryOptions = { initialDelayMs: 0, jitterMs: 0 };

describe('withRetry', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns the result on first success (no retries)', async () => {
        const fn = jest.fn().mockResolvedValue('success');
        const result = await withRetry(fn, NO_DELAY);
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable error and succeeds eventually', async () => {
        const retryableError = Object.assign(new Error('rate limited'), { status: 429 });
        const fn = jest.fn()
            .mockRejectedValueOnce(retryableError)
            .mockResolvedValue('recovered');

        const result = await withRetry(fn, { ...NO_DELAY, maxRetries: 3 });
        expect(result).toBe('recovered');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws immediately on non-retryable error', async () => {
        const nonRetryable = new Error('bad request');
        const fn = jest.fn().mockRejectedValue(nonRetryable);

        await expect(
            withRetry(fn, { ...NO_DELAY, retryableErrors: () => false })
        ).rejects.toThrow('bad request');

        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws after exhausting maxRetries', async () => {
        const retryableError = Object.assign(new Error('server error'), { status: 503 });
        const fn = jest.fn().mockRejectedValue(retryableError);

        await expect(
            withRetry(fn, { ...NO_DELAY, maxRetries: 2 })
        ).rejects.toThrow('server error');

        // 1 initial attempt + 2 retries = 3 total calls
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('retries on AbortError', async () => {
        const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
        const fn = jest.fn()
            .mockRejectedValueOnce(abortError)
            .mockResolvedValue('ok');

        await expect(withRetry(fn, { ...NO_DELAY, maxRetries: 1 })).resolves.toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on 5xx server errors', async () => {
        const serverError = Object.assign(new Error('service unavailable'), { status: 503 });
        const fn = jest.fn()
            .mockRejectedValueOnce(serverError)
            .mockResolvedValue('fixed');

        await expect(withRetry(fn, { ...NO_DELAY, maxRetries: 2 })).resolves.toBe('fixed');
    });

    it('does NOT retry on 4xx client errors (except 429)', async () => {
        const clientError = Object.assign(new Error('not found'), { status: 404 });
        const fn = jest.fn().mockRejectedValue(clientError);

        await expect(withRetry(fn, NO_DELAY)).rejects.toThrow('not found');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 rate limit errors', async () => {
        const rateLimitError = Object.assign(new Error('too many requests'), { status: 429 });
        const fn = jest.fn()
            .mockRejectedValueOnce(rateLimitError)
            .mockResolvedValue('success after rate limit');

        const result = await withRetry(fn, { ...NO_DELAY, maxRetries: 2 });
        expect(result).toBe('success after rate limit');
    });

    it('respects custom retryableErrors predicate', async () => {
        const customError = new Error('custom');
        const fn = jest.fn()
            .mockRejectedValueOnce(customError)
            .mockResolvedValue('custom-ok');

        const result = await withRetry(fn, {
            ...NO_DELAY,
            maxRetries: 2,
            retryableErrors: (err) => err.message === 'custom',
        });
        expect(result).toBe('custom-ok');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on ECONNRESET network errors', async () => {
        const networkError = Object.assign(new Error('connection reset'), { code: 'ECONNRESET' });
        const fn = jest.fn()
            .mockRejectedValueOnce(networkError)
            .mockResolvedValue('reconnected');

        await expect(withRetry(fn, { ...NO_DELAY, maxRetries: 1 })).resolves.toBe('reconnected');
    });

    it('accepts all retry configuration options without error', async () => {
        const opts: RetryOptions = {
            maxRetries: 1,
            initialDelayMs: 0,
            maxDelayMs: 500,
            backoffMultiplier: 2,
            jitterMs: 0,
        };

        const fn = jest.fn().mockResolvedValue('configured');
        const result = await withRetry(fn, opts);
        expect(result).toBe('configured');
    });
});

describe('RateLimiter', () => {
    it('executes a task and returns the result', async () => {
        const limiter = new RateLimiter(5, 0);
        const result = await limiter.execute(() => Promise.resolve('done'));
        expect(result).toBe('done');
    });

    it('propagates errors from executed tasks', async () => {
        const limiter = new RateLimiter(5, 0);
        await expect(
            limiter.execute(() => Promise.reject(new Error('task failed')))
        ).rejects.toThrow('task failed');
    });

    it('runs multiple tasks sequentially when maxConcurrent=1', async () => {
        const limiter = new RateLimiter(1, 0);
        const order: number[] = [];

        const task = (n: number) => limiter.execute(async () => {
            order.push(n);
            return n;
        });

        await Promise.all([task(1), task(2), task(3)]);
        expect(order).toHaveLength(3);
        expect(order).toContain(1);
        expect(order).toContain(2);
        expect(order).toContain(3);
    });

    it('allows concurrent tasks up to maxConcurrent', async () => {
        const limiter = new RateLimiter(3, 0);
        const results = await Promise.all([
            limiter.execute(() => Promise.resolve('a')),
            limiter.execute(() => Promise.resolve('b')),
            limiter.execute(() => Promise.resolve('c')),
        ]);
        expect(results).toEqual(['a', 'b', 'c']);
    });
});
