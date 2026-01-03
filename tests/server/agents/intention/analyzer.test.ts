
import { jest } from '@jest/globals';

// Mock Genkit immediately
jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn(),
    },
}));

import { analyzeIntent } from '@/server/agents/intention/analyzer';
import { ai } from '@/ai/genkit';

describe('Intention Analyzer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly identify ambiguous queries', async () => {
        const mockOutput = {
            isAmbiguous: true,
            clarification: {
                ambiguityDetected: true,
                confidenceScore: 0.8,
                possibleIntents: ['Fix revenue', 'Marketing audit'],
                clarificationQuestion: 'Do you want to fix revenue or run a marketing audit?'
            }
        };

        (ai.generate as jest.Mock).mockResolvedValue({
            output: mockOutput
        });

        const result = await analyzeIntent('Fix it');

        expect(ai.generate).toHaveBeenCalled();
        expect(result.isAmbiguous).toBe(true);
        expect(result.clarification?.clarificationQuestion).toBe('Do you want to fix revenue or run a marketing audit?');
    });

    it('should correctly identify clear queries and form a commit', async () => {
        const mockOutput = {
            isAmbiguous: false,
            commit: {
                goal: 'Email martez@bakedbot.ai about the Q3 report',
                assumptions: ['martez@bakedbot.ai is the correct email'],
                constraints: ['Must use SendGrid'],
                plan: ['Retrieve Q3 report', 'Compose email', 'Send email']
            }
        };

        (ai.generate as jest.Mock).mockResolvedValue({
            output: mockOutput
        });

        const result = await analyzeIntent('Email martez@bakedbot.ai about the Q3 report');

        expect(ai.generate).toHaveBeenCalled();
        expect(result.isAmbiguous).toBe(false);
        expect(result.commit?.goal).toBe('Email martez@bakedbot.ai about the Q3 report');
    });

    it('should fallback to ambiguous on AI failure', async () => {
        (ai.generate as jest.Mock).mockRejectedValue(new Error('AI Overload'));

        const result = await analyzeIntent('Any query');

        expect(result.isAmbiguous).toBe(true);
        expect(result.clarification?.clarificationQuestion).toContain("I'm having trouble understanding");
    });
});
