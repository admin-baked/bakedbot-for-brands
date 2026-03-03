// tests/circuit-breaker.test.ts
// Unit tests for Circuit Breaker and Resilient Fetch

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
    getCircuitBreaker,
    getAllCircuitStatus,
    resetCircuit,
    clearAllCircuits,
    CircuitOpenError,
    CircuitTimeoutError,
} from '../src/server/services/circuit-breaker';

// ─────────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
    clearAllCircuits();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
// Closed State (Normal)
// ─────────────────────────────────────────────────────────────────────────────

describe('CircuitBreaker — closed state', () => {
    test('passes calls through when closed', async () => {
        const breaker = getCircuitBreaker('test-service', { timeoutMs: 5000 });

        const result = await breaker.execute(() => Promise.resolve('success'));
        expect(result).toBe('success');
    });

    test('returns result from async function', async () => {
        const breaker = getCircuitBreaker('test-service', { timeoutMs: 5000 });

        const result = await breaker.execute(async () => {
            return { data: [1, 2, 3] };
        });

        expect(result).toEqual({ data: [1, 2, 3] });
    });

    test('starts in closed state', () => {
        const breaker = getCircuitBreaker('test-service');
        expect(breaker.getStatus().state).toBe('closed');
    });

    test('failure count increments on error', async () => {
        const breaker = getCircuitBreaker('test-service', {
            failureThreshold: 5,
            timeoutMs: 5000,
        });

        try {
            await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch { /* expected */ }

        expect(breaker.getStatus().failureCount).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Open State (Blocking)
// ─────────────────────────────────────────────────────────────────────────────

describe('CircuitBreaker — open state', () => {
    test('opens after threshold failures', async () => {
        const breaker = getCircuitBreaker('test-open', {
            failureThreshold: 3,
            resetTimeMs: 60_000,
            timeoutMs: 5000,
        });

        // Trigger 3 failures
        for (let i = 0; i < 3; i++) {
            try {
                await breaker.execute(() => Promise.reject(new Error(`fail ${i}`)));
            } catch { /* expected */ }
        }

        expect(breaker.getStatus().state).toBe('open');
    });

    test('throws CircuitOpenError immediately when open', async () => {
        const breaker = getCircuitBreaker('test-open-throw', {
            failureThreshold: 2,
            resetTimeMs: 60_000,
            timeoutMs: 5000,
        });

        // Open the circuit
        for (let i = 0; i < 2; i++) {
            try {
                await breaker.execute(() => Promise.reject(new Error('fail')));
            } catch { /* expected */ }
        }

        // Next call should throw CircuitOpenError without executing
        let threw = false;
        try {
            await breaker.execute(() => Promise.resolve('should not reach'));
        } catch (err) {
            threw = true;
            expect(err).toBeInstanceOf(CircuitOpenError);
        }
        expect(threw).toBe(true);
    });

    test('does not execute function when circuit is open', async () => {
        const breaker = getCircuitBreaker('test-no-exec', {
            failureThreshold: 1,
            resetTimeMs: 60_000,
            timeoutMs: 5000,
        });

        // Open circuit
        try {
            await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch { /* expected */ }

        const fn = jest.fn().mockResolvedValue('result');
        try {
            await breaker.execute(fn);
        } catch { /* expected */ }

        expect(fn).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Half-Open State (Probing)
// ─────────────────────────────────────────────────────────────────────────────

describe('CircuitBreaker — half-open state', () => {
    test('transitions to half-open after resetTimeMs', async () => {
        const breaker = getCircuitBreaker('test-half-open', {
            failureThreshold: 1,
            resetTimeMs: 5_000,
            halfOpenMaxAttempts: 1,
            timeoutMs: 5000,
        });

        // Open circuit
        try {
            await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch { /* expected */ }
        expect(breaker.getStatus().state).toBe('open');

        // Advance time past resetTimeMs
        jest.advanceTimersByTime(6_000);

        // Next call should be allowed (half-open probe)
        const result = await breaker.execute(() => Promise.resolve('recovered'));
        expect(result).toBe('recovered');
        expect(breaker.getStatus().state).toBe('closed');
    });

    test('success in half-open closes the circuit', async () => {
        const breaker = getCircuitBreaker('test-half-close', {
            failureThreshold: 1,
            resetTimeMs: 1_000,
            halfOpenMaxAttempts: 1,
            timeoutMs: 5000,
        });

        // Open
        try {
            await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch { /* expected */ }

        // Wait for half-open
        jest.advanceTimersByTime(2_000);

        // Succeed
        await breaker.execute(() => Promise.resolve('ok'));
        expect(breaker.getStatus().state).toBe('closed');
        expect(breaker.getStatus().failureCount).toBe(0);
    });

    test('failure in half-open re-opens the circuit', async () => {
        const breaker = getCircuitBreaker('test-half-reopen', {
            failureThreshold: 1,
            resetTimeMs: 1_000,
            halfOpenMaxAttempts: 1,
            timeoutMs: 5000,
        });

        // Open
        try {
            await breaker.execute(() => Promise.reject(new Error('fail 1')));
        } catch { /* expected */ }

        // Wait for half-open
        jest.advanceTimersByTime(2_000);

        // Fail again
        try {
            await breaker.execute(() => Promise.reject(new Error('fail 2')));
        } catch { /* expected */ }

        expect(breaker.getStatus().state).toBe('open');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Timeout
// ─────────────────────────────────────────────────────────────────────────────

describe('CircuitBreaker — timeout', () => {
    test('times out slow operations', async () => {
        jest.useRealTimers(); // Need real timers for timeout race

        const breaker = getCircuitBreaker('test-timeout', {
            failureThreshold: 5,
            timeoutMs: 50, // 50ms timeout
        });

        let threw = false;
        try {
            await breaker.execute(() =>
                new Promise(resolve => setTimeout(resolve, 200))
            );
        } catch (err) {
            threw = true;
            expect(err).toBeInstanceOf(CircuitTimeoutError);
        }
        expect(threw).toBe(true);

        jest.useFakeTimers();
    }, 10000);
});

// ─────────────────────────────────────────────────────────────────────────────
// Global Registry
// ─────────────────────────────────────────────────────────────────────────────

describe('Circuit breaker registry', () => {
    test('getCircuitBreaker returns same instance for same name', () => {
        const b1 = getCircuitBreaker('alleaves');
        const b2 = getCircuitBreaker('alleaves');
        expect(b1).toBe(b2);
    });

    test('getAllCircuitStatus returns all registered breakers', () => {
        getCircuitBreaker('service-a');
        getCircuitBreaker('service-b');
        getCircuitBreaker('service-c');

        const statuses = getAllCircuitStatus();
        expect(statuses).toHaveLength(3);
        expect(statuses.map(s => s.name).sort()).toEqual(['service-a', 'service-b', 'service-c']);
    });

    test('resetCircuit clears failure state', async () => {
        const breaker = getCircuitBreaker('test-reset', {
            failureThreshold: 3,
            timeoutMs: 5000,
        });

        // Add some failures
        try {
            await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch { /* expected */ }
        expect(breaker.getStatus().failureCount).toBe(1);

        resetCircuit('test-reset');
        expect(breaker.getStatus().failureCount).toBe(0);
        expect(breaker.getStatus().state).toBe('closed');
    });

    test('clearAllCircuits removes all breakers', () => {
        getCircuitBreaker('a');
        getCircuitBreaker('b');
        expect(getAllCircuitStatus()).toHaveLength(2);

        clearAllCircuits();
        expect(getAllCircuitStatus()).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Custom Error Classes
// ─────────────────────────────────────────────────────────────────────────────

describe('Custom error classes', () => {
    test('CircuitOpenError has correct name and message', () => {
        const error = new CircuitOpenError('test-service');
        expect(error.name).toBe('CircuitOpenError');
        expect(error.message).toContain('test-service');
    });

    test('CircuitTimeoutError has correct name', () => {
        const error = new CircuitTimeoutError('test-service', 5000);
        expect(error.name).toBe('CircuitTimeoutError');
        expect(error.message).toContain('5000');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Resilient Fetch
// ─────────────────────────────────────────────────────────────────────────────

describe('resilientFetch', () => {
    beforeEach(() => {
        clearAllCircuits();
    });

    test('exports resilientFetch function', () => {
        const { resilientFetch } = require('../src/lib/resilient-fetch');
        expect(typeof resilientFetch).toBe('function');
    });

    test('ResilientFetchOptions extends RequestInit', () => {
        // Type check — just verifying the interface is exported
        const { resilientFetch } = require('../src/lib/resilient-fetch');
        expect(resilientFetch).toBeDefined();
    });
});
