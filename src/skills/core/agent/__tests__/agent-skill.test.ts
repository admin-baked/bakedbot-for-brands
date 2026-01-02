
import { delegateTool, broadcastTool } from '../index';

// Mock the dependencies
jest.mock('@/app/dashboard/ceo/agents/actions', () => ({
    runAgentChat: jest.fn().mockResolvedValue({
        metadata: { jobId: 'mock-job-123' }
    })
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'user-123',
        brandId: 'brand-123'
    })
}));

jest.mock('@/server/integrations/slack/service', () => ({
    postMessage: jest.fn().mockResolvedValue({
        ts: '1234.5678',
        ok: true
    })
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue(true)
}));

describe('Agent Core skill', () => {
    const ctx = { agentName: 'Leo (COO)' };

    describe('agent.delegate', () => {
        it('should dispatch a sub-agent job via runAgentChat', async () => {
            const inputs = {
                personaId: 'smokey',
                task: 'Find the best Blue Dream product.',
                context: { brand: 'Essex' }
            };

            const result = await delegateTool.implementation!(ctx, inputs);

            expect(result.status).toBe('dispatched');
            expect(result.jobId).toBe('mock-job-123');
            
            const { runAgentChat } = require('@/app/dashboard/ceo/agents/actions');
            expect(runAgentChat).toHaveBeenCalledWith(
                expect.stringContaining('DELEGATION FROM: Leo (COO)'),
                'smokey'
            );
        });
    });

    describe('agent.broadcast', () => {
        it('should broadcast via Slack and Email', async () => {
            const inputs = {
                message: 'Goal achieved: $100k MRR!',
                channels: ['slack', 'email'],
                recipients: ['#hq', 'ceo@bakedbot.ai']
            };

            const result = await broadcastTool.implementation!(ctx, inputs);

            expect(result.message).toBe('Broadcast complete.');
            
            const { postMessage } = require('@/server/integrations/slack/service');
            expect(postMessage).toHaveBeenCalledWith(
                'user-123',
                '#hq',
                'Goal achieved: $100k MRR!'
            );

            const { sendOrderConfirmationEmail } = require('@/lib/email/dispatcher');
            expect(sendOrderConfirmationEmail).toHaveBeenCalled();
        });
    });
});
