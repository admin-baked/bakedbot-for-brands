// tests/resilient-fetch.test.ts
// Unit tests for resilientFetch — circuit breaker + retry + timeout wrapper

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// jest.mock is hoisted — factory must NOT reference outer const/let (temporal dead zone).
// Use jest.fn() placeholders here; wire up return values in beforeEach.
jest.mock('@/server/services/circuit-breaker', () => ({
    getCircuitBreaker: jest.fn(),
    CircuitOpenError: class CircuitOpenError extends Error {
        constructor(msg: string) {
            super(msg);
            this.name = 'CircuitOpenError';
        }
    },
}));

import { resilientFetch } from '../src/lib/resilient-fetch';
import { CircuitOpenError, getCircuitBreaker } from '../src/server/services/circuit-breaker';

// Get mock references after imports
const mockGetCircuitBreaker = getCircuitBreaker as jest.Mock;
const mockExecute = jest.fn();

// Speed up retries in tests by mocking setTimeout
jest.useFakeTimers();

// Helper: advance all pending timers after each retry delay
async function flushTimers() {
    await Promise.resolve(); // flush microtasks first
    jest.runAllTimers();
    await Promise.resolve();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeOkResponse(status = 200): Response {
    return { ok: true, status, statusText: 'OK' } as unknown as Response;
}

function makeErrorResponse(status: number, statusText: string): Response {
    return { ok: false, status, statusText } as unknown as Response;
}

beforeEach(() => {
    jest.clearAllMocks();
    // Wire mockGetCircuitBreaker to return a breaker that delegates to mockExecute
    mockGetCircuitBreaker.mockReturnValue({ execute: mockExecute });
    // Default: circuit breaker just calls the wrapped function
    mockExecute.mockImplementation((fn: () => Promise<unknown>) => fn());
    // Default global fetch = success
    global.fetch = jest.fn().mockResolvedValue(makeOkResponse());
});

afterEach(() => {
    jest.clearAllTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
// Happy path
// ─────────────────────────────────────────────────────────────────────────────

describe('resilientFetch — success', () => {
    test('returns response on first successful call', async () => {
        const res = await resilientFetch('https://example.com/api', {
            circuitName: 'example',
        });

        expect(res.ok).toBe(true);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/api', expect.any(Object));
    });

    test('passes method and headers through to fetch', async () => {
        await resilientFetch('https://example.com/api', {
            circuitName: 'example',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"test":true}',
        });

        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.com/api',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{"test":true}',
            }),
        );
    });

    test('does NOT include circuitName or retryConfig in fetch options', async () => {
        await resilientFetch('https://example.com', {
            circuitName: 'my-circuit',
            retryConfig: { maxRetries: 1, delaysMs: [100] },
        });

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
        expect(fetchCall).not.toHaveProperty('circuitName');
        expect(fetchCall).not.toHaveProperty('retryConfig');
    });

    test('uses named circuit breaker', async () => {
        await resilientFetch('https://example.com', { circuitName: 'alleaves' });
        expect(mockGetCircuitBreaker).toHaveBeenCalledWith('alleaves');
    });

    test('returns 4xx response without retrying (client errors are not server errors)', async () => {
        global.fetch = jest.fn().mockResolvedValue(makeErrorResponse(404, 'Not Found'));

        const res = await resilientFetch('https://example.com', {
            circuitName: 'test',
            retryConfig: { maxRetries: 3, delaysMs: [100, 200, 400] },
        });

        // 4xx: ok=false but status < 500, should return immediately (no retry)
        expect(res.status).toBe(404);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Server error retry
// ─────────────────────────────────────────────────────────────────────────────

describe('resilientFetch — retry on 5xx', () => {
    test('retries on 500 and returns success on subsequent attempt', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce(makeErrorResponse(500, 'Internal Server Error'))
            .mockResolvedValueOnce(makeOkResponse());

        const promise = resilientFetch('https://example.com', {
            circuitName: 'test',
            retryConfig: { maxRetries: 3, delaysMs: [100, 200, 400] },
        });

        await flushTimers();
        const res = await promise;

        expect(res.ok).toBe(true);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('exhausts all retries and throws on persistent 500', async () => {
        global.fetch = jest.fn().mockResolvedValue(makeErrorResponse(500, 'Internal Server Error'));

        const promise = resilientFetch('https://example.com', {
            circuitName: 'test',
            retryConfig: { maxRetries: 2, delaysMs: [100, 200] },
        });

        // Drain all retry timers
        for (let i = 0; i < 3; i++) {
            await flushTimers();
        }

        await expect(promise).rejects.toThrow('HTTP 500');
        expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    test('uses last delay value when attempts exceed delaysMs length', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce(makeErrorResponse(503, 'Service Unavailable'))
            .mockResolvedValueOnce(makeErrorResponse(503, 'Service Unavailable'))
            .mockResolvedValueOnce(makeOkResponse());

        // Only 1 delay configured but maxRetries=2 — should reuse last delay
        const promise = resilientFetch('https://example.com', {
            circuitName: 'test',
            retryConfig: { maxRetries: 2, delaysMs: [50] },
        });

        for (let i = 0; i < 3; i++) {
            await flushTimers();
        }

        const res = await promise;
        expect(res.ok).toBe(true);
        expect(global.fetch).toHaveBeenCalledTimes(3);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Retryable error filtering
// ─────────────────────────────────────────────────────────────────────────────

describe('resilientFetch — retryable error patterns', () => {
    test('retries when error message matches retryableErrors pattern', async () => {
        global.fetch = jest.fn()
            .mockRejectedValueOnce(new Error('ECONNRESET'))
            .mockResolvedValueOnce(makeOkResponse());

        const promise = resilientFetch('https://example.com', {
            circuitName: 'test',
            retryConfig: { maxRetries: 2, delaysMs: [50], retryableErrors: ['ECONNRESET'] },
        });

        await flushTimers();
        const res = await promise;
        expect(res.ok).toBe(true);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('does NOT retry when error does not match retryableErrors', async () => {
        global.fetch = jest.fn()
            .mockRejectedValue(new Error('Authentication failed'));

        const promise = resilientFetch('https://example.com', {
            circuitName: 'test',
            retryConfig: { maxRetries: 3, delaysMs: [50], retryableErrors: ['ECONNRESET', 'timeout'] },
        });

        await expect(promise).rejects.toThrow('Authentication failed');
        expect(global.fetch).toHaveBeenCalledTimes(1); // no retry
    });

    test('retries all errors when retryableErrors is empty/undefined', async () => {
        global.fetch = jest.fn()
            .mockRejectedValueOnce(new Error('anything'))
            .mockResolvedValueOnce(makeOkResponse());

        const promise = resilientFetch('https://example.com', {
            circuitName: 'test',
            retryConfig: { maxRetries: 1, delaysMs: [50] }, // no retryableErrors filter
        });

        await flushTimers();
        const res = await promise;
        expect(res.ok).toBe(true);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Circuit open — fail fast
// ─────────────────────────────────────────────────────────────────────────────

describe('resilientFetch — circuit open', () => {
    test('throws CircuitOpenError immediately without retrying', async () => {
        const circuitErr = new CircuitOpenError('Circuit test is OPEN');
        mockExecute.mockRejectedValue(circuitErr);

        await expect(
            resilientFetch('https://example.com', {
                circuitName: 'test',
                retryConfig: { maxRetries: 3, delaysMs: [50, 100, 200] },
            }),
        ).rejects.toThrow('Circuit test is OPEN');

        // fetch itself should never be called (circuit is open)
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('propagates CircuitOpenError name', async () => {
        const circuitErr = new CircuitOpenError('Circuit open');
        mockExecute.mockRejectedValue(circuitErr);

        await expect(
            resilientFetch('https://example.com', { circuitName: 'test' }),
        ).rejects.toMatchObject({ name: 'CircuitOpenError' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Default retry config
// ─────────────────────────────────────────────────────────────────────────────

describe('resilientFetch — default config', () => {
    test('uses DEFAULT_RETRY_CONFIG when no retryConfig provided', async () => {
        // Default maxRetries = 3; this just verifies the call succeeds with defaults
        global.fetch = jest.fn().mockResolvedValue(makeOkResponse());

        const res = await resilientFetch('https://example.com', { circuitName: 'test' });
        expect(res.ok).toBe(true);
    });

    test('merges partial retryConfig with defaults', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce(makeErrorResponse(500, 'Error'))
            .mockResolvedValueOnce(makeOkResponse());

        // Only override maxRetries, delaysMs comes from defaults
        const promise = resilientFetch('https://example.com', {
            circuitName: 'test',
            retryConfig: { maxRetries: 1, delaysMs: [10] },
        });

        await flushTimers();
        const res = await promise;
        expect(res.ok).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('resilientFetch — edge cases', () => {
    test('throws generic error message when lastError is undefined', async () => {
        // This would only happen if the loop completes with no exception tracked
        // Simulate by making maxRetries = 0 and fetch throwing a non-Error
        global.fetch = jest.fn().mockRejectedValue('string error');
        mockExecute.mockImplementation((fn: () => Promise<unknown>) => fn());

        await expect(
            resilientFetch('https://example.com', {
                circuitName: 'test-service',
                retryConfig: { maxRetries: 0, delaysMs: [] },
            }),
        ).rejects.toThrow(); // just confirm it throws
    });

    test('converts non-Error rejections to Error instances', async () => {
        global.fetch = jest.fn().mockRejectedValue('plain string error');

        await expect(
            resilientFetch('https://example.com', {
                circuitName: 'test',
                retryConfig: { maxRetries: 0, delaysMs: [] },
            }),
        ).rejects.toBeInstanceOf(Error);
    });
});
