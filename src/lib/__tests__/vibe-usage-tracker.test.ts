/**
 * Tests for Vibe Usage Tracker
 */

import {
    canGenerateVibe,
    recordVibeGeneration,
    recordEmailCapture,
    getRemainingVibes,
    hasProvidedEmail,
    resetVibeUsage,
    getUsageStats,
} from '../vibe-usage-tracker';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

Object.defineProperty(window, 'location', {
    value: { search: '' },
    writable: true,
});

describe('Vibe Usage Tracker', () => {
    beforeEach(() => {
        resetVibeUsage();
        localStorageMock.clear();
    });

    describe('canGenerateVibe', () => {
        it('should allow first 3 web vibes without email', () => {
            expect(canGenerateVibe('web').allowed).toBe(true);
            expect(canGenerateVibe('web').remaining).toBe(3);

            recordVibeGeneration({ id: '1', name: 'Test 1', type: 'web' });
            expect(canGenerateVibe('web').allowed).toBe(true);
            expect(canGenerateVibe('web').remaining).toBe(2);

            recordVibeGeneration({ id: '2', name: 'Test 2', type: 'web' });
            expect(canGenerateVibe('web').allowed).toBe(true);
            expect(canGenerateVibe('web').remaining).toBe(1);

            recordVibeGeneration({ id: '3', name: 'Test 3', type: 'web' });
            expect(canGenerateVibe('web').allowed).toBe(false);
            expect(canGenerateVibe('web').reason).toBe('limit_reached');
            expect(canGenerateVibe('web').remaining).toBe(0);
        });

        it('should block mobile vibes without email', () => {
            const result = canGenerateVibe('mobile');
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('mobile_requires_email');
        });

        it('should allow mobile vibes after email capture', () => {
            recordEmailCapture('test@example.com', 'lead_123');
            const result = canGenerateVibe('mobile');
            expect(result.allowed).toBe(true);
        });

        it('should grant 3 additional vibes after email capture', () => {
            // Use 3 free vibes
            recordVibeGeneration({ id: '1', name: 'Test 1', type: 'web' });
            recordVibeGeneration({ id: '2', name: 'Test 2', type: 'web' });
            recordVibeGeneration({ id: '3', name: 'Test 3', type: 'web' });

            expect(canGenerateVibe('web').allowed).toBe(false);

            // Capture email
            recordEmailCapture('test@example.com', 'lead_123');

            // Should now allow 3 more
            expect(canGenerateVibe('web').allowed).toBe(true);
            expect(canGenerateVibe('web').remaining).toBe(3);
        });
    });

    describe('recordVibeGeneration', () => {
        it('should increment vibe counts correctly', () => {
            recordVibeGeneration({ id: '1', name: 'Web Vibe', type: 'web' });
            let stats = getUsageStats();
            expect(stats.vibesGenerated).toBe(1);

            recordVibeGeneration({ id: '2', name: 'Mobile Vibe', type: 'mobile' });
            stats = getUsageStats();
            expect(stats.vibesGenerated).toBe(2);
        });

        it('should store generated vibes in history', () => {
            recordVibeGeneration({ id: 'vibe1', name: 'Cyberpunk', type: 'web' });
            recordVibeGeneration({ id: 'vibe2', name: 'Native Clean', type: 'mobile' });

            const stored = JSON.parse(localStorageMock.getItem('bakedbot_vibe_usage') || '{}');
            expect(stored.generatedVibes).toHaveLength(2);
            expect(stored.generatedVibes[0].name).toBe('Cyberpunk');
            expect(stored.generatedVibes[1].name).toBe('Native Clean');
        });

        it('should keep only last 10 vibes in storage', () => {
            for (let i = 0; i < 15; i++) {
                recordVibeGeneration({ id: `vibe${i}`, name: `Vibe ${i}`, type: 'web' });
            }

            const stored = JSON.parse(localStorageMock.getItem('bakedbot_vibe_usage') || '{}');
            expect(stored.generatedVibes).toHaveLength(10);
            expect(stored.generatedVibes[0].name).toBe('Vibe 5'); // First 5 should be trimmed
        });
    });

    describe('recordEmailCapture', () => {
        it('should mark email as captured', () => {
            expect(hasProvidedEmail()).toBe(false);

            recordEmailCapture('user@example.com', 'lead_456');

            expect(hasProvidedEmail()).toBe(true);
        });

        it('should store email and leadId', () => {
            recordEmailCapture('user@example.com', 'lead_456');

            const stored = JSON.parse(localStorageMock.getItem('bakedbot_vibe_usage') || '{}');
            expect(stored.emailCaptured).toBe(true);
            expect(stored.capturedEmail).toBe('user@example.com');
            expect(stored.leadId).toBe('lead_456');
        });
    });

    describe('getRemainingVibes', () => {
        it('should return correct remaining count', () => {
            expect(getRemainingVibes()).toBe(3);

            recordVibeGeneration({ id: '1', name: 'Test', type: 'web' });
            expect(getRemainingVibes()).toBe(2);

            recordVibeGeneration({ id: '2', name: 'Test', type: 'web' });
            expect(getRemainingVibes()).toBe(1);

            recordVibeGeneration({ id: '3', name: 'Test', type: 'web' });
            expect(getRemainingVibes()).toBe(0);
        });

        it('should adjust for email captured state', () => {
            recordVibeGeneration({ id: '1', name: 'Test', type: 'web' });
            recordVibeGeneration({ id: '2', name: 'Test', type: 'web' });
            recordVibeGeneration({ id: '3', name: 'Test', type: 'web' });

            expect(getRemainingVibes()).toBe(0);

            recordEmailCapture('test@example.com', 'lead_123');

            expect(getRemainingVibes()).toBe(3);
        });
    });

    describe('getUsageStats', () => {
        it('should return correct usage statistics', () => {
            const stats = getUsageStats();
            expect(stats.vibesGenerated).toBe(0);
            expect(stats.vibesRemaining).toBe(3);
            expect(stats.maxVibes).toBe(3);
            expect(stats.emailCaptured).toBe(false);
            expect(stats.showUpgradePrompt).toBe(false);
        });

        it('should show upgrade prompt when limit reached', () => {
            recordVibeGeneration({ id: '1', name: 'Test', type: 'web' });
            recordVibeGeneration({ id: '2', name: 'Test', type: 'web' });
            recordVibeGeneration({ id: '3', name: 'Test', type: 'web' });

            const stats = getUsageStats();
            expect(stats.showUpgradePrompt).toBe(true);
            expect(stats.vibesRemaining).toBe(0);
        });

        it('should reflect email captured state', () => {
            recordEmailCapture('test@example.com', 'lead_123');

            const stats = getUsageStats();
            expect(stats.emailCaptured).toBe(true);
            expect(stats.maxVibes).toBe(6);
            expect(stats.vibesRemaining).toBe(6);
        });
    });

    describe('resetVibeUsage', () => {
        it('should clear all usage data', () => {
            recordVibeGeneration({ id: '1', name: 'Test', type: 'web' });
            recordEmailCapture('test@example.com', 'lead_123');

            expect(hasProvidedEmail()).toBe(true);
            expect(getRemainingVibes()).toBe(5); // 6 total - 1 used

            resetVibeUsage();

            expect(hasProvidedEmail()).toBe(false);
            expect(getRemainingVibes()).toBe(3);
        });
    });
});
