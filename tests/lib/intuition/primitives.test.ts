
import { WorkOrder, StateSnapshot, Trace } from '@/types/intuition-os';

describe('Intuition OS Primitives', () => {

    it('should allow constructing a valid WorkOrder', () => {
        const snapshot: StateSnapshot = {
            userId: 'user-123',
            data: { key: 'value' },
            capturedAt: new Date()
        };

        const order: WorkOrder = {
            id: 'wo-1',
            agentId: 'smokey',
            goal: 'Test Goal',
            context: snapshot,
            priority: 'high'
        };

        expect(order).toBeDefined();
        expect(order.agentId).toBe('smokey');
    });

    it('should allows constructing a valid Trace', () => {
        const trace: Trace = {
            id: 'trace-1',
            workOrderId: 'wo-1',
            method: 'system_2_planning',
            steps: [
                {
                    stepId: 'step-1',
                    action: 'test_action',
                    input: {},
                    output: {},
                    timestamp: new Date()
                }
            ],
            durationMs: 100,
            startedAt: new Date(),
            completedAt: new Date()
        };

        expect(trace).toBeDefined();
        expect(trace.steps.length).toBe(1);
    });
});
