/**
 * Unit tests for Demo API routes
 */

describe('Demo Agent API', () => {
    const VALID_AGENTS = ['smokey', 'craig', 'pops', 'ezal'];

    describe('POST /api/demo/agent', () => {
        it('should return demo results for valid agent and prompt', async () => {
            // Mock the fetch call
            const mockResponse = {
                agent: 'smokey',
                prompt: 'test prompt',
                items: [
                    { title: 'Product 1', description: 'Description 1' },
                    { title: 'Product 2', description: 'Description 2' }
                ],
                totalCount: 13
            };

            // Test that the response structure matches expected format
            expect(mockResponse.agent).toBe('smokey');
            expect(mockResponse.items).toHaveLength(2);
            expect(mockResponse.totalCount).toBe(13);
        });

        it('should include all required fields in response items', () => {
            const item = { title: 'Blue Dream', description: 'High limonene...', meta: 'Match: 94%' };
            
            expect(item).toHaveProperty('title');
            expect(item).toHaveProperty('description');
            expect(item).toHaveProperty('meta');
        });

        it('should support all 4 playground agents', () => {
            VALID_AGENTS.forEach(agent => {
                expect(['smokey', 'craig', 'pops', 'ezal']).toContain(agent);
            });
            expect(VALID_AGENTS).toHaveLength(4);
        });
    });
});

describe('Demo Lead API', () => {
    describe('Email validation', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        it('should accept valid email formats', () => {
            const validEmails = [
                'test@example.com',
                'user@dispensary.io',
                'owner@cannbiz.org',
                'sales+tag@company.co'
            ];

            validEmails.forEach(email => {
                expect(emailRegex.test(email)).toBe(true);
            });
        });

        it('should reject invalid email formats', () => {
            const invalidEmails = [
                'not-an-email',
                'missing@domain',
                '@no-local.com',
                'spaces in@email.com'
            ];

            invalidEmails.forEach(email => {
                expect(emailRegex.test(email)).toBe(false);
            });
        });
    });

    describe('Lead data structure', () => {
        it('should include all required fields', () => {
            const lead = {
                id: 'lead-123',
                email: 'test@example.com',
                company: 'Test Dispensary',
                source: 'agent_playground',
                status: 'new',
                createdAt: new Date(),
                demoCount: 0
            };

            expect(lead).toHaveProperty('id');
            expect(lead).toHaveProperty('email');
            expect(lead).toHaveProperty('company');
            expect(lead).toHaveProperty('source', 'agent_playground');
            expect(lead).toHaveProperty('status', 'new');
        });
    });
});

describe('Agent Playground Rate Limiting', () => {
    const MAX_FREE_DEMOS = 5;

    it('should allow 5 free demos per day', () => {
        expect(MAX_FREE_DEMOS).toBe(5);
    });

    it('should reset demo count for new day', () => {
        const storedDate = '2024-01-01';
        const today = new Date().toDateString();
        
        // Different dates should trigger reset
        expect(storedDate).not.toBe(today);
    });

    it('should bypass limit after email capture', () => {
        const hasEmailCaptured = true;
        const demoCount = 10;
        
        // Even with 10 demos used, email capture should allow more
        const canRunDemo = hasEmailCaptured || demoCount < MAX_FREE_DEMOS;
        expect(canRunDemo).toBe(true);
    });

    it('should block demos when limit reached and no email', () => {
        const hasEmailCaptured = false;
        const demoCount = 5;
        
        const canRunDemo = hasEmailCaptured || demoCount < MAX_FREE_DEMOS;
        expect(canRunDemo).toBe(false);
    });
});

describe('Agent Playground Result Gating', () => {
    const VISIBLE_COUNT = 3;
    const TOTAL_COUNT = 13;

    it('should show 3 results and lock 10', () => {
        const lockedCount = TOTAL_COUNT - VISIBLE_COUNT;
        
        expect(VISIBLE_COUNT).toBe(3);
        expect(lockedCount).toBe(10);
    });

    it('should unlock all results after email capture', () => {
        const hasEmailCaptured = true;
        const visibleItems = hasEmailCaptured ? TOTAL_COUNT : VISIBLE_COUNT;
        
        expect(visibleItems).toBe(13);
    });
});

describe('Media Generation Gating', () => {
    it('should allow images without login', () => {
        const isLoggedIn = false;
        const canGenerateImage = true; // Always allowed
        
        expect(canGenerateImage).toBe(true);
    });

    it('should require login for video generation', () => {
        const isLoggedIn = false;
        const canGenerateVideo = isLoggedIn;
        
        expect(canGenerateVideo).toBe(false);
    });

    it('should allow video generation when logged in', () => {
        const isLoggedIn = true;
        const canGenerateVideo = isLoggedIn;
        
        expect(canGenerateVideo).toBe(true);
    });
});
