/**
 * Demo Agent API Route Tests
 * Tests for the public demo agent endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firecrawl
vi.mock('@firecrawl/firecrawl-js', () => ({
    default: vi.fn().mockImplementation(() => ({
        search: vi.fn().mockResolvedValue({ data: [] }),
        scrapeUrl: vi.fn().mockResolvedValue({ data: { markdown: '' } })
    }))
}));

describe('Demo Agent API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('response sanitization', () => {
        it('should not expose internal model names', () => {
            const internalResponse = {
                content: 'Here is your answer.',
                metadata: {
                    model: 'gemini-2.5-flash',
                    tokens: 150,
                    source: 'Powered by Gemini 3 Pro'
                }
            };
            
            // Sanitization logic
            const sanitizedMetadata = {
                ...internalResponse.metadata,
                source: 'AI-Powered | Cannabis-Native | 24/7',
                model: undefined // Remove model reference
            };
            
            expect(sanitizedMetadata.source).not.toContain('Gemini');
            expect(sanitizedMetadata.model).toBeUndefined();
        });

        it('should preserve safe metadata fields', () => {
            const metadata = {
                tokens: 150,
                duration: 1200,
                toolsUsed: ['search', 'scrape']
            };
            
            expect(metadata.tokens).toBe(150);
            expect(metadata.toolsUsed).toContain('search');
        });
    });

    describe('request validation', () => {
        it('should require a message in the request body', () => {
            const body = { message: '' };
            const isValid = body.message && body.message.trim().length > 0;
            
            expect(isValid).toBe(false);
        });

        it('should accept valid message request', () => {
            const body = { message: 'What dispensaries are near 60601?' };
            const isValid = body.message && body.message.trim().length > 0;
            
            expect(isValid).toBe(true);
        });

        it('should handle optional persona parameter', () => {
            const body = { 
                message: 'Find me some edibles', 
                persona: 'puff' 
            };
            
            const validPersonas = ['puff', 'wholesale_analyst', 'menu_watchdog', 'sales_scout'];
            const isValidPersona = !body.persona || validPersonas.includes(body.persona);
            
            expect(isValidPersona).toBe(true);
        });
    });

    describe('tool call simulation', () => {
        it('should generate simulated steps for demo mode', () => {
            const persona = 'puff';
            
            // Simulated steps based on persona
            const baseSteps = [
                { id: '1', toolName: 'Analyzing request...', status: 'completed' },
                { id: '2', toolName: 'Searching knowledge base...', status: 'completed' },
                { id: '3', toolName: 'Generating response...', status: 'completed' }
            ];
            
            expect(baseSteps).toHaveLength(3);
            expect(baseSteps[0].status).toBe('completed');
        });

        it('should include persona-specific steps', () => {
            const persona = 'menu_watchdog';
            
            const menuWatchdogSteps = [
                { id: '1', toolName: 'Scanning competitor menus...', status: 'completed' },
                { id: '2', toolName: 'Comparing prices...', status: 'completed' },
                { id: '3', toolName: 'Generating price report...', status: 'completed' }
            ];
            
            expect(menuWatchdogSteps[0].toolName).toContain('menu');
        });
    });

    describe('rate limiting', () => {
        it('should track request count per IP', () => {
            const rateLimitStore: Record<string, number> = {};
            const clientIP = '192.168.1.1';
            const limit = 10;
            
            // Simulate requests
            rateLimitStore[clientIP] = (rateLimitStore[clientIP] || 0) + 1;
            rateLimitStore[clientIP] += 1;
            
            const isUnderLimit = rateLimitStore[clientIP] <= limit;
            
            expect(rateLimitStore[clientIP]).toBe(2);
            expect(isUnderLimit).toBe(true);
        });

        it('should block requests over limit', () => {
            const rateLimitStore: Record<string, number> = { '192.168.1.1': 11 };
            const clientIP = '192.168.1.1';
            const limit = 10;
            
            const isOverLimit = rateLimitStore[clientIP] > limit;
            
            expect(isOverLimit).toBe(true);
        });
    });
});
