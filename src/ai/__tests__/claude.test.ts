/**
 * Unit tests for Claude AI service
 * Tests automatic model routing and task complexity detection
 */

import { detectTaskComplexity, selectModel, CLAUDE_TOOL_MODEL, CLAUDE_REASONING_MODEL } from '../claude';

describe('detectTaskComplexity', () => {
    describe('Multi-step planning patterns', () => {
        it('should detect comprehensive plan requests as strategic', () => {
            const result = detectTaskComplexity('Create a comprehensive plan for marketing');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
            expect(result.reasoning).toContain('multi step planning');
        });

        it('should detect step-by-step requests as strategic', () => {
            const result = detectTaskComplexity('Give me a step-by-step plan to launch our new product');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });

        it('should detect business strategy requests as strategic', () => {
            const result = detectTaskComplexity('Develop a business expansion strategy for our dispensary');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });
    });

    describe('Strategic business decisions patterns', () => {
        it('should detect SWOT analysis as strategic', () => {
            const result = detectTaskComplexity('Perform a SWOT analysis of our market position');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });

        it('should detect competitive analysis as strategic', () => {
            const result = detectTaskComplexity('Do a competitive analysis of the local market');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });

        it('should detect pricing strategy as strategic', () => {
            const result = detectTaskComplexity('Create a pricing strategy for our products');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });

        it('should detect go-to-market strategy as strategic', () => {
            const result = detectTaskComplexity('Design a go-to-market plan for our new dispensary');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });
    });

    describe('Document synthesis patterns', () => {
        it('should detect document analysis as strategic', () => {
            const result = detectTaskComplexity('Analyze this document and summarize');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });

        it('should detect document comparison as strategic', () => {
            const result = detectTaskComplexity('Compare multiple documents side by side');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });

        it('should detect key insight extraction as strategic', () => {
            const result = detectTaskComplexity('Extract key findings from this document');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });
    });

    describe('Novel problem solving patterns', () => {
        it('should detect novel problems as strategic', () => {
            const result = detectTaskComplexity('How should we approach this unique challenge in cannabis retail?');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });

        it('should detect brainstorming requests as strategic', () => {
            const result = detectTaskComplexity('Brainstorm solutions to this problem');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });

        it('should detect complex reasoning requests as strategic', () => {
            const result = detectTaskComplexity('Think through this complex regulatory compliance issue');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });
    });

    describe('Architectural decisions patterns', () => {
        it('should detect system architecture as strategic', () => {
            const result = detectTaskComplexity('Design a scalable system architecture for our platform');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });

        it('should detect migration strategy as strategic', () => {
            const result = detectTaskComplexity('Create a migration plan for our legacy system');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });

        it('should detect technical decisions as strategic', () => {
            const result = detectTaskComplexity('Evaluate technical trade-offs for our infrastructure');
            expect(result.complexity).toBe('strategic');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });
    });

    describe('Context length heuristics', () => {
        it('should detect large context as complex', () => {
            const result = detectTaskComplexity('Analyze this data', 60000);
            expect(result.complexity).toBe('complex');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
            expect(result.reasoning).toContain('Large context');
        });

        it('should use standard model for small context', () => {
            const result = detectTaskComplexity('Analyze this data', 10000);
            expect(result.complexity).toBe('standard');
            expect(result.suggestedModel).toBe(CLAUDE_TOOL_MODEL);
        });
    });

    describe('Prompt length heuristics', () => {
        it('should detect very long prompts as complex', () => {
            const longPrompt = 'word '.repeat(600); // 600 words
            const result = detectTaskComplexity(longPrompt);
            expect(result.complexity).toBe('complex');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
            expect(result.reasoning).toContain('Long prompt');
        });

        it('should use standard model for short prompts', () => {
            const result = detectTaskComplexity('What is the weather today?');
            expect(result.complexity).toBe('standard');
            expect(result.suggestedModel).toBe(CLAUDE_TOOL_MODEL);
        });
    });

    describe('Multiple requirements heuristics', () => {
        it('should detect many questions as complex', () => {
            const result = detectTaskComplexity('What? Who? When? Where? Why? How? Really?');
            expect(result.complexity).toBe('complex');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
            expect(result.reasoning).toContain('Multiple requirements');
        });

        it('should detect many bullet points as complex', () => {
            const bulletPrompt = `Please help with:
- Task 1
- Task 2
- Task 3
- Task 4
- Task 5
- Task 6
- Task 7
- Task 8`;
            const result = detectTaskComplexity(bulletPrompt);
            expect(result.complexity).toBe('complex');
            expect(result.suggestedModel).toBe(CLAUDE_REASONING_MODEL);
        });
    });

    describe('Standard tasks', () => {
        it('should use Sonnet for simple queries', () => {
            const result = detectTaskComplexity('Show all active agents');
            expect(result.complexity).toBe('standard');
            expect(result.suggestedModel).toBe(CLAUDE_TOOL_MODEL);
        });

        it('should use Sonnet for basic questions', () => {
            const result = detectTaskComplexity('What are our store hours?');
            expect(result.complexity).toBe('standard');
            expect(result.suggestedModel).toBe(CLAUDE_TOOL_MODEL);
        });

        it('should use Sonnet for simple tasks', () => {
            const result = detectTaskComplexity('Send an email to john@example.com');
            expect(result.complexity).toBe('standard');
            expect(result.suggestedModel).toBe(CLAUDE_TOOL_MODEL);
        });
    });
});

describe('selectModel', () => {
    it('should honor explicit model override', () => {
        const result = selectModel('Create a comprehensive business plan', {
            forceModel: 'claude-haiku-4-5-20251001'
        });
        expect(result.model).toBe('claude-haiku-4-5-20251001');
        expect(result.complexity.reasoning).toContain('explicitly specified');
    });

    it('should auto-route strategic tasks to Opus', () => {
        const result = selectModel('Create a comprehensive plan for our business', {
            autoRoute: true
        });
        expect(result.model).toBe(CLAUDE_REASONING_MODEL);
        expect(result.complexity.complexity).toBe('strategic');
    });

    it('should auto-route complex tasks to Opus', () => {
        const result = selectModel('Simple question', {
            autoRoute: true,
            contextTokens: 60000
        });
        expect(result.model).toBe(CLAUDE_REASONING_MODEL);
        expect(result.complexity.complexity).toBe('complex');
    });

    it('should use Sonnet for standard tasks with auto-routing', () => {
        const result = selectModel('What time is it?', {
            autoRoute: true
        });
        expect(result.model).toBe(CLAUDE_TOOL_MODEL);
        expect(result.complexity.complexity).toBe('standard');
    });

    it('should disable auto-routing when autoRoute is false', () => {
        const result = selectModel('Create a comprehensive business plan', {
            autoRoute: false
        });
        expect(result.model).toBe(CLAUDE_TOOL_MODEL);
    });

    it('should default to auto-routing enabled', () => {
        const result = selectModel('Develop a business strategy plan');
        expect(result.model).toBe(CLAUDE_REASONING_MODEL);
        expect(result.complexity.complexity).toBe('strategic');
    });

    it('should prefer explicit model over auto-routing', () => {
        const result = selectModel('Create a comprehensive marketing plan', {
            forceModel: CLAUDE_TOOL_MODEL,
            autoRoute: true
        });
        expect(result.model).toBe(CLAUDE_TOOL_MODEL);
    });
});
