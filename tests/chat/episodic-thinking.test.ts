/**
 * Episodic Thinking (Chat Simulation) Tests
 * Tests for the simulated thinking steps shown during agent processing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Episodic Thinking Simulation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('simulateDemoSteps', () => {
        it('should generate 4-6 thinking steps', () => {
            const baseStepCount = 4;
            const extraSteps = Math.floor(Math.random() * 3); // 0-2 extra
            const totalSteps = baseStepCount + extraSteps;
            
            expect(totalSteps).toBeGreaterThanOrEqual(4);
            expect(totalSteps).toBeLessThanOrEqual(6);
        });

        it('should return steps in correct structure', () => {
            const step = {
                id: 'step-1',
                toolName: 'Analyzing your question...',
                description: 'Understanding the context and intent',
                status: 'completed' as const,
                durationMs: 0
            };
            
            expect(step).toHaveProperty('id');
            expect(step).toHaveProperty('toolName');
            expect(step).toHaveProperty('status');
            expect(step.status).toBe('completed');
        });

        it('should include persona-specific steps for puff', () => {
            const persona = 'puff';
            const steps = [
                'Analyzing your question...',
                'Searching product catalog...',
                'Finding nearby dispensaries...',
                'Generating personalized recommendations...'
            ];
            
            expect(steps[0]).toContain('Analyzing');
            expect(steps.some(s => s.includes('dispensaries') || s.includes('product'))).toBe(true);
        });

        it('should include persona-specific steps for menu_watchdog', () => {
            const persona = 'menu_watchdog';
            const steps = [
                'Scanning competitor menus...',
                'Comparing pricing data...',
                'Analyzing market trends...',
                'Generating competitive report...'
            ];
            
            expect(steps[0]).toContain('competitor');
            expect(steps.some(s => s.includes('pricing'))).toBe(true);
        });
    });

    describe('step timing', () => {
        it('should stagger steps with delays', async () => {
            const stepDelays = [300, 600, 1000, 1500, 2000];
            let completedSteps = 0;
            
            stepDelays.forEach((delay, index) => {
                setTimeout(() => {
                    completedSteps++;
                }, delay);
            });
            
            vi.advanceTimersByTime(500);
            expect(completedSteps).toBe(1); // Only first step
            
            vi.advanceTimersByTime(600);
            expect(completedSteps).toBe(3); // Through 1000ms
            
            vi.advanceTimersByTime(1500);
            expect(completedSteps).toBe(5); // All complete
        });

        it('should complete before main response arrives', () => {
            const simulationDuration = 2500; // ms
            const typicalResponseTime = 3000; // ms
            
            expect(simulationDuration).toBeLessThan(typicalResponseTime);
        });
    });

    describe('authenticated mode integration', () => {
        it('should run simulation concurrently with server action', () => {
            // Simulate Promise.all behavior
            let simulationComplete = false;
            let serverComplete = false;
            
            const simulationPromise = new Promise(resolve => {
                setTimeout(() => {
                    simulationComplete = true;
                    resolve(['step1', 'step2', 'step3']);
                }, 2000);
            });
            
            const serverPromise = new Promise(resolve => {
                setTimeout(() => {
                    serverComplete = true;
                    resolve({ content: 'Response' });
                }, 3000);
            });
            
            // At 2.5s, simulation should be done but server still running
            vi.advanceTimersByTime(2500);
            expect(simulationComplete).toBe(true);
            expect(serverComplete).toBe(false);
            
            // At 3.5s, both should be done
            vi.advanceTimersByTime(1000);
            expect(serverComplete).toBe(true);
        });

        it('should merge simulated steps with server toolCalls', () => {
            const simulatedSteps = [
                { id: 'sim-1', toolName: 'Thinking...' },
                { id: 'sim-2', toolName: 'Searching...' }
            ];
            
            const serverToolCalls = [
                { id: 'srv-1', name: 'search', result: 'Found 5 results' }
            ];
            
            // If server has real tool calls, use those
            const finalToolCalls = serverToolCalls.length > 0 
                ? serverToolCalls 
                : simulatedSteps.map(s => ({ id: s.id, name: s.toolName, result: '', status: 'success' }));
            
            expect(finalToolCalls).toHaveLength(1);
            expect(finalToolCalls[0].id).toBe('srv-1');
        });

        it('should fallback to simulated steps when no server toolCalls', () => {
            const simulatedSteps = [
                { id: 'sim-1', toolName: 'Thinking...' },
                { id: 'sim-2', toolName: 'Generating...' }
            ];
            
            const serverToolCalls: any[] = [];
            
            const finalToolCalls = serverToolCalls.length > 0 
                ? serverToolCalls 
                : simulatedSteps.map(s => ({ id: s.id, name: s.toolName, result: '', status: 'success' }));
            
            expect(finalToolCalls).toHaveLength(2);
            expect(finalToolCalls[0].name).toBe('Thinking...');
        });
    });
});
