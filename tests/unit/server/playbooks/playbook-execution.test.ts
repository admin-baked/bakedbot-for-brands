/**
 * @jest-environment node
 */

import { executePlaybook } from '../actions';

// Mock the email dispatcher
jest.mock('@/lib/email/dispatcher', () => ({
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue(true)
}));

// Mock the agent runner
jest.mock('../actions', () => {
    const originalModule = jest.requireActual('../actions');
    return {
        ...originalModule,
        triggerAgentRun: jest.fn().mockResolvedValue({
            success: true,
            message: 'Mock agent run completed'
        })
    };
});

describe('Playbook Execution', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('executePlaybook', () => {
        it('should return error for unknown playbook', async () => {
            const result = await executePlaybook('nonexistent-playbook');
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
            expect(result.logs).toContain("Error: Playbook nonexistent-playbook is not defined in registry.");
        });

        it('should execute platform-health playbook', async () => {
            const result = await executePlaybook('platform-health');
            
            expect(result).toBeDefined();
            expect(result.logs).toBeDefined();
            expect(result.logs.some(l => l.includes('Platform Health'))).toBe(true);
        });

        it('should execute competitor-scan playbook', async () => {
            const result = await executePlaybook('competitor-scan');
            
            expect(result).toBeDefined();
            expect(result.logs.some(l => l.includes('Competitor'))).toBe(true);
        });

        it('should execute churn-predictor playbook', async () => {
            const result = await executePlaybook('churn-predictor');
            
            expect(result).toBeDefined();
            expect(result.logs.some(l => l.includes('Churn'))).toBe(true);
        });
    });

    describe('welcome-sequence with email', () => {
        it('should dispatch email via dispatcher when running welcome-sequence', async () => {
            const { sendOrderConfirmationEmail } = require('@/lib/email/dispatcher');
            
            const result = await executePlaybook('welcome-sequence');
            
            // Verify playbook completed
            expect(result).toBeDefined();
            expect(result.logs).toBeDefined();
            
            // Verify email was attempted
            const hasEmailLog = result.logs.some(l => 
                l.includes('Email dispatch result') || l.includes('Dispatching welcome emails')
            );
            expect(hasEmailLog).toBe(true);
        });
    });
});
