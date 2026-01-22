/**
 * Ground Truth Type Unit Tests
 *
 * Tests the type definitions, Zod schemas, and helper functions
 * for the Ground Truth QA system.
 *
 * Run with: npm test -- tests/types/ground-truth.test.ts
 */

import {
    QAPairSchema,
    CategorySchema,
    EvaluationConfigSchema,
    GroundTruthQASetSchema,
    getAllQAPairs,
    getQAPairsByPriority,
    getCriticalQAPairs,
    countByCategory,
    PRIORITY_DESCRIPTIONS,
    type GroundTruthQASet,
    type GroundTruthQAPair,
    type GroundTruthCategory,
    type QAPriority,
} from '@/types/ground-truth';

describe('Ground Truth Types', () => {
    describe('QAPairSchema', () => {
        const validQAPair = {
            id: 'TEST-001',
            question: 'What is the test question?',
            ideal_answer: 'This is the ideal answer.',
            context: 'Test context',
            intent: 'Test intent',
            keywords: ['test', 'keyword'],
            priority: 'high' as QAPriority,
        };

        it('should validate a correct QA pair', () => {
            const result = QAPairSchema.safeParse(validQAPair);
            expect(result.success).toBe(true);
        });

        it('should accept all priority levels', () => {
            const priorities: QAPriority[] = ['critical', 'high', 'medium'];
            for (const priority of priorities) {
                const result = QAPairSchema.safeParse({ ...validQAPair, priority });
                expect(result.success).toBe(true);
            }
        });

        it('should reject invalid priority', () => {
            const result = QAPairSchema.safeParse({
                ...validQAPair,
                priority: 'invalid',
            });
            expect(result.success).toBe(false);
        });

        it('should reject missing required fields', () => {
            const incomplete = { id: 'TEST-001', question: 'Question?' };
            const result = QAPairSchema.safeParse(incomplete);
            expect(result.success).toBe(false);
        });

        it('should accept empty keywords array', () => {
            const result = QAPairSchema.safeParse({
                ...validQAPair,
                keywords: [],
            });
            expect(result.success).toBe(true);
        });
    });

    describe('CategorySchema', () => {
        const validCategory = {
            description: 'Test category description',
            qa_pairs: [
                {
                    id: 'TEST-001',
                    question: 'Test question?',
                    ideal_answer: 'Test answer.',
                    context: 'Context',
                    intent: 'Intent',
                    keywords: ['test'],
                    priority: 'high',
                },
            ],
        };

        it('should validate a correct category', () => {
            const result = CategorySchema.safeParse(validCategory);
            expect(result.success).toBe(true);
        });

        it('should accept empty qa_pairs array', () => {
            const result = CategorySchema.safeParse({
                description: 'Empty category',
                qa_pairs: [],
            });
            expect(result.success).toBe(true);
        });

        it('should reject missing description', () => {
            const result = CategorySchema.safeParse({
                qa_pairs: [],
            });
            expect(result.success).toBe(false);
        });
    });

    describe('EvaluationConfigSchema', () => {
        const validConfig = {
            scoring_weights: {
                keyword_coverage: 0.4,
                intent_match: 0.3,
                factual_accuracy: 0.2,
                tone_appropriateness: 0.1,
            },
            target_metrics: {
                overall_accuracy: 0.9,
                compliance_accuracy: 1.0,
                product_recommendations: 0.85,
                store_information: 0.95,
            },
            priority_levels: {
                critical: 'Must be 100% accurate',
                high: 'Target 95% accuracy',
                medium: 'Target 85% accuracy',
            },
        };

        it('should validate a correct evaluation config', () => {
            const result = EvaluationConfigSchema.safeParse(validConfig);
            expect(result.success).toBe(true);
        });

        it('should reject weights outside 0-1 range', () => {
            const invalidConfig = {
                ...validConfig,
                scoring_weights: {
                    ...validConfig.scoring_weights,
                    keyword_coverage: 1.5, // Invalid: > 1
                },
            };
            const result = EvaluationConfigSchema.safeParse(invalidConfig);
            expect(result.success).toBe(false);
        });

        it('should reject negative weights', () => {
            const invalidConfig = {
                ...validConfig,
                scoring_weights: {
                    ...validConfig.scoring_weights,
                    keyword_coverage: -0.1, // Invalid: < 0
                },
            };
            const result = EvaluationConfigSchema.safeParse(invalidConfig);
            expect(result.success).toBe(false);
        });
    });

    describe('GroundTruthQASetSchema', () => {
        const validGroundTruth: GroundTruthQASet = {
            metadata: {
                dispensary: 'Test Dispensary',
                brandId: 'test-brand',
                address: '123 Test St',
                version: '1.0',
                created: '2026-01-22',
                last_updated: '2026-01-22',
                total_qa_pairs: 1,
                author: 'Test Author',
            },
            categories: {
                test_category: {
                    description: 'Test category',
                    qa_pairs: [
                        {
                            id: 'T-001',
                            question: 'Test?',
                            ideal_answer: 'Answer.',
                            context: 'Context',
                            intent: 'Intent',
                            keywords: ['test'],
                            priority: 'high',
                        },
                    ],
                },
            },
            evaluation_config: {
                scoring_weights: {
                    keyword_coverage: 0.4,
                    intent_match: 0.3,
                    factual_accuracy: 0.2,
                    tone_appropriateness: 0.1,
                },
                target_metrics: {
                    overall_accuracy: 0.9,
                    compliance_accuracy: 1.0,
                    product_recommendations: 0.85,
                    store_information: 0.95,
                },
                priority_levels: {
                    critical: 'Critical',
                    high: 'High',
                    medium: 'Medium',
                },
            },
            maintenance_schedule: {
                weekly: ['Task 1'],
                monthly: ['Task 2'],
                quarterly: ['Task 3'],
            },
        };

        it('should validate a complete ground truth set', () => {
            const result = GroundTruthQASetSchema.safeParse(validGroundTruth);
            expect(result.success).toBe(true);
        });

        it('should accept optional brandId', () => {
            const withoutBrandId = {
                ...validGroundTruth,
                metadata: {
                    ...validGroundTruth.metadata,
                    brandId: undefined,
                },
            };
            const result = GroundTruthQASetSchema.safeParse(withoutBrandId);
            expect(result.success).toBe(true);
        });
    });
});

describe('Ground Truth Helper Functions', () => {
    // Create a test ground truth set
    const testGroundTruth: GroundTruthQASet = {
        metadata: {
            dispensary: 'Test Dispensary',
            address: '123 Test St',
            version: '1.0',
            created: '2026-01-22',
            last_updated: '2026-01-22',
            total_qa_pairs: 5,
            author: 'Test',
        },
        categories: {
            category_a: {
                description: 'Category A',
                qa_pairs: [
                    {
                        id: 'A-001',
                        question: 'Question A1?',
                        ideal_answer: 'Answer A1',
                        context: 'Context A1',
                        intent: 'Intent A1',
                        keywords: ['a1'],
                        priority: 'critical',
                    },
                    {
                        id: 'A-002',
                        question: 'Question A2?',
                        ideal_answer: 'Answer A2',
                        context: 'Context A2',
                        intent: 'Intent A2',
                        keywords: ['a2'],
                        priority: 'high',
                    },
                ],
            },
            category_b: {
                description: 'Category B',
                qa_pairs: [
                    {
                        id: 'B-001',
                        question: 'Question B1?',
                        ideal_answer: 'Answer B1',
                        context: 'Context B1',
                        intent: 'Intent B1',
                        keywords: ['b1'],
                        priority: 'critical',
                    },
                    {
                        id: 'B-002',
                        question: 'Question B2?',
                        ideal_answer: 'Answer B2',
                        context: 'Context B2',
                        intent: 'Intent B2',
                        keywords: ['b2'],
                        priority: 'medium',
                    },
                    {
                        id: 'B-003',
                        question: 'Question B3?',
                        ideal_answer: 'Answer B3',
                        context: 'Context B3',
                        intent: 'Intent B3',
                        keywords: ['b3'],
                        priority: 'high',
                    },
                ],
            },
        },
        evaluation_config: {
            scoring_weights: {
                keyword_coverage: 0.4,
                intent_match: 0.3,
                factual_accuracy: 0.2,
                tone_appropriateness: 0.1,
            },
            target_metrics: {
                overall_accuracy: 0.9,
                compliance_accuracy: 1.0,
                product_recommendations: 0.85,
                store_information: 0.95,
            },
            priority_levels: {
                critical: 'Critical',
                high: 'High',
                medium: 'Medium',
            },
        },
        maintenance_schedule: {
            weekly: [],
            monthly: [],
            quarterly: [],
        },
    };

    describe('getAllQAPairs', () => {
        it('should return all QA pairs from all categories', () => {
            const allQAs = getAllQAPairs(testGroundTruth);
            expect(allQAs.length).toBe(5);
        });

        it('should include QA pairs from both categories', () => {
            const allQAs = getAllQAPairs(testGroundTruth);
            const ids = allQAs.map(qa => qa.id);
            expect(ids).toContain('A-001');
            expect(ids).toContain('A-002');
            expect(ids).toContain('B-001');
            expect(ids).toContain('B-002');
            expect(ids).toContain('B-003');
        });

        it('should return empty array for ground truth with no categories', () => {
            const emptyGT: GroundTruthQASet = {
                ...testGroundTruth,
                categories: {},
            };
            const allQAs = getAllQAPairs(emptyGT);
            expect(allQAs.length).toBe(0);
        });
    });

    describe('getQAPairsByPriority', () => {
        it('should return only critical priority QA pairs', () => {
            const criticalQAs = getQAPairsByPriority(testGroundTruth, 'critical');
            expect(criticalQAs.length).toBe(2);
            expect(criticalQAs.every(qa => qa.priority === 'critical')).toBe(true);
        });

        it('should return only high priority QA pairs', () => {
            const highQAs = getQAPairsByPriority(testGroundTruth, 'high');
            expect(highQAs.length).toBe(2);
            expect(highQAs.every(qa => qa.priority === 'high')).toBe(true);
        });

        it('should return only medium priority QA pairs', () => {
            const mediumQAs = getQAPairsByPriority(testGroundTruth, 'medium');
            expect(mediumQAs.length).toBe(1);
            expect(mediumQAs[0].id).toBe('B-002');
        });
    });

    describe('getCriticalQAPairs', () => {
        it('should return critical QA pairs', () => {
            const criticalQAs = getCriticalQAPairs(testGroundTruth);
            expect(criticalQAs.length).toBe(2);
        });

        it('should return same result as getQAPairsByPriority with critical', () => {
            const critical1 = getCriticalQAPairs(testGroundTruth);
            const critical2 = getQAPairsByPriority(testGroundTruth, 'critical');
            expect(critical1).toEqual(critical2);
        });
    });

    describe('countByCategory', () => {
        it('should return correct counts per category', () => {
            const counts = countByCategory(testGroundTruth);
            expect(counts.category_a).toBe(2);
            expect(counts.category_b).toBe(3);
        });

        it('should return empty object for no categories', () => {
            const emptyGT: GroundTruthQASet = {
                ...testGroundTruth,
                categories: {},
            };
            const counts = countByCategory(emptyGT);
            expect(Object.keys(counts).length).toBe(0);
        });
    });
});

describe('Priority Descriptions', () => {
    it('should have descriptions for all priority levels', () => {
        expect(PRIORITY_DESCRIPTIONS.critical).toBeDefined();
        expect(PRIORITY_DESCRIPTIONS.high).toBeDefined();
        expect(PRIORITY_DESCRIPTIONS.medium).toBeDefined();
    });

    it('should mention accuracy requirements', () => {
        expect(PRIORITY_DESCRIPTIONS.critical).toContain('100%');
        expect(PRIORITY_DESCRIPTIONS.high).toContain('95%');
        expect(PRIORITY_DESCRIPTIONS.medium).toContain('85%');
    });
});
