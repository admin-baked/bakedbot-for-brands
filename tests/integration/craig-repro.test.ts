
import { triggerAgentRun } from '@/app/dashboard/ceo/agents/actions';

// Mock dependencies if needed, or rely on integration test environment
// Since triggerAgentRun is a server action, might need to be run in a way that supports server actions or just import it directly in a test.

describe('Craig Agent Integation', () => {
    it('should run craig agent without crashing on generateCopy', async () => {
        // Mocking ai.generate if possible or allowing it to run (mocking usually better for unit test)
        jest.mock('@/ai/genkit', () => ({
            ai: {
                generate: jest.fn().mockResolvedValue({ text: 'Mock Copy' })
            }
        }));

        const result = await triggerAgentRun('craig', 'Write a social media post');
        expect(result.success).toBe(true);
        expect(result.message).toContain('Ran craig successfully');
    });
});
