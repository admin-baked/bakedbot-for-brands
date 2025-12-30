
import { executePlaybook } from '@/server/agents/agent-runner';

describe('Playbook Execution', () => {
    it('runs competitor-scan playbook with email dispatch', async () => {
        // Mock dependencies
        jest.mock('@/lib/email/dispatcher', () => ({
            sendGenericEmail: jest.fn().mockResolvedValue(true)
        }));
        jest.mock('@/server/auth/auth', () => ({
            requireUser: jest.fn().mockResolvedValue({ email: 'test@example.com' })
        }));

        const result = await executePlaybook('competitor-scan');
        expect(result.success).toBe(true);
        expect(result.message).toContain('Report emailed');
        console.log(result.logs);
    });
});
