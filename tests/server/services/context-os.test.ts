/**
 * Unit Tests for Context OS Decision Log Service
 */

import { DecisionLogService, DecisionTrace, EvaluatorResult } from '../../../src/server/services/context-os';

// Mock Firestore
jest.mock('firebase-admin/firestore', () => {
    const mockDoc = {
        id: 'mock-decision-id',
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
                id: 'mock-decision-id',
                agentId: 'craig',
                task: 'Generate marketing email',
                reasoning: 'Approved by Deebo',
                outcome: 'approved',
                timestamp: { toDate: () => new Date() },
            }),
        }),
        update: jest.fn().mockResolvedValue(undefined),
    };

    const mockCollection = {
        doc: jest.fn(() => mockDoc),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
            docs: [
                {
                    id: 'decision-1',
                    data: () => ({
                        id: 'decision-1',
                        agentId: 'craig',
                        task: 'Generate marketing email',
                        reasoning: 'Approved by Deebo',
                        outcome: 'approved',
                        timestamp: { toDate: () => new Date() },
                        metadata: {},
                    }),
                },
            ],
        }),
    };

    return {
        getFirestore: jest.fn(() => ({
            collection: jest.fn(() => mockCollection),
        })),
        FieldValue: {
            arrayUnion: jest.fn((val) => val),
        },
        Timestamp: {
            fromDate: jest.fn((d) => d),
        },
    };
});

describe('Context OS Decision Log Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logDecision', () => {
        it('should log a decision and return an ID', async () => {
            const decision = {
                agentId: 'craig',
                task: 'Generate marketing email',
                inputs: { template: 'promo' },
                reasoning: 'Following brand guidelines',
                outcome: 'approved' as const,
                metadata: { brandId: 'brand-123' },
            };

            const result = await DecisionLogService.logDecision(decision);

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });
    });

    describe('queryDecisions', () => {
        it('should query decisions with filters', async () => {
            const results = await DecisionLogService.queryDecisions({
                agentId: 'craig',
                limit: 10,
            });

            expect(Array.isArray(results)).toBe(true);
            expect(results[0]).toHaveProperty('agentId');
            expect(results[0]).toHaveProperty('task');
            expect(results[0]).toHaveProperty('outcome');
        });

        it('should filter by outcome', async () => {
            const results = await DecisionLogService.queryDecisions({
                outcome: 'approved',
            });

            expect(Array.isArray(results)).toBe(true);
        });
    });

    describe('getDecisionById', () => {
        it('should return a decision by ID', async () => {
            const result = await DecisionLogService.getDecisionById('mock-decision-id');

            expect(result).toBeDefined();
            expect(result?.agentId).toBe('craig');
        });
    });

    describe('getRecentAgentDecisions', () => {
        it('should get recent decisions for an agent', async () => {
            const results = await DecisionLogService.getRecentAgentDecisions('craig', 5);

            expect(Array.isArray(results)).toBe(true);
        });
    });

    describe('createDecisionFromGauntlet', () => {
        it('should create a decision trace from Gauntlet results', () => {
            const evaluatorResults: EvaluatorResult[] = [
                {
                    evaluatorName: 'DeeboEvaluator',
                    passed: true,
                    score: 95,
                    issues: [],
                },
            ];

            const result = DecisionLogService.createDecisionFromGauntlet(
                'craig',
                'Generate marketing email',
                'Email content here...',
                evaluatorResults,
                true,
                { brandId: 'brand-123' }
            );

            expect(result.agentId).toBe('craig');
            expect(result.task).toBe('Generate marketing email');
            expect(result.outcome).toBe('approved');
            expect(result.evaluators).toHaveLength(1);
            expect(result.evaluators?.[0].evaluatorName).toBe('DeeboEvaluator');
        });

        it('should mark outcome as rejected when verification fails', () => {
            const evaluatorResults: EvaluatorResult[] = [
                {
                    evaluatorName: 'DeeboEvaluator',
                    passed: false,
                    score: 30,
                    issues: ['Contains prohibited health claim'],
                },
            ];

            const result = DecisionLogService.createDecisionFromGauntlet(
                'craig',
                'Generate marketing email',
                'This will cure your anxiety!',
                evaluatorResults,
                false
            );

            expect(result.outcome).toBe('rejected');
            expect(result.reasoning).toContain('Failed verification');
        });
    });
});
