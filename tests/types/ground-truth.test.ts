/**
 * Ground Truth Type Unit Tests
 *
 * Tests the type definitions, Zod schemas, and helper functions
 * for the Ground Truth QA system.
 *
 * Run with: npm test -- tests/types/ground-truth.test.ts
 *
 * @version 1.0 - Added recommendation strategy tests
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
    // v1.0 imports
    GROUND_TRUTH_VERSION,
    STRATEGY_DESCRIPTIONS,
    EffectBasedStrategySchema,
    PriceTierStrategySchema,
    ExperienceLevelStrategySchema,
    ProductTypeStrategySchema,
    BrandAffinityStrategySchema,
    OccasionStrategySchema,
    HybridStrategySchema,
    RecommendationConfigSchema,
    getDefaultStrategy,
    getStrategyByType,
    hasRecommendationStrategies,
    getBeginnerSafety,
    isBeginnerSafetyEnabled,
    getComplianceSettings,
    createDefaultRecommendationConfig,
    type GroundTruthQASet,
    type GroundTruthQAPair,
    type GroundTruthCategory,
    type QAPriority,
    type RecommendationConfig,
    type RecommendationStrategyType,
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

// ============================================================================
// GROUND TRUTH v1.0 - RECOMMENDATION STRATEGIES TESTS
// ============================================================================

describe('Ground Truth v1.0 - Version', () => {
    it('should export version constant', () => {
        expect(GROUND_TRUTH_VERSION).toBe('1.0');
    });
});

describe('Ground Truth v1.0 - Strategy Descriptions', () => {
    it('should have descriptions for all strategy types', () => {
        const strategyTypes: RecommendationStrategyType[] = [
            'effect_based',
            'price_tier',
            'experience_level',
            'product_type',
            'brand_affinity',
            'occasion',
            'hybrid',
        ];

        for (const type of strategyTypes) {
            expect(STRATEGY_DESCRIPTIONS[type]).toBeDefined();
            expect(STRATEGY_DESCRIPTIONS[type].length).toBeGreaterThan(0);
        }
    });
});

describe('Ground Truth v1.0 - Strategy Schemas', () => {
    describe('EffectBasedStrategySchema', () => {
        it('should validate a correct effect-based strategy', () => {
            const strategy = {
                type: 'effect_based',
                effects: [
                    { name: 'relaxation', weight: 0.8 },
                    { name: 'energy', weight: 0.7, product_types: ['sativa'] },
                ],
                fallback_to_popular: true,
            };
            const result = EffectBasedStrategySchema.safeParse(strategy);
            expect(result.success).toBe(true);
        });

        it('should reject weight outside 0-1 range', () => {
            const strategy = {
                type: 'effect_based',
                effects: [{ name: 'relaxation', weight: 1.5 }],
            };
            const result = EffectBasedStrategySchema.safeParse(strategy);
            expect(result.success).toBe(false);
        });

        it('should accept optional THC/CBD ranges', () => {
            const strategy = {
                type: 'effect_based',
                effects: [
                    {
                        name: 'sleep',
                        weight: 0.9,
                        thc_range: { min: 15, max: 25 },
                        cbd_range: { min: 0, max: 5 },
                    },
                ],
            };
            const result = EffectBasedStrategySchema.safeParse(strategy);
            expect(result.success).toBe(true);
        });
    });

    describe('PriceTierStrategySchema', () => {
        it('should validate a correct price tier strategy', () => {
            const strategy = {
                type: 'price_tier',
                tiers: [
                    { name: 'budget', max_price: 30 },
                    { name: 'mid-range', min_price: 30, max_price: 60, default: true },
                    { name: 'premium', min_price: 60 },
                ],
                show_deals_first: true,
                value_scoring: true,
            };
            const result = PriceTierStrategySchema.safeParse(strategy);
            expect(result.success).toBe(true);
        });

        it('should accept tiers without price limits', () => {
            const strategy = {
                type: 'price_tier',
                tiers: [{ name: 'all' }],
            };
            const result = PriceTierStrategySchema.safeParse(strategy);
            expect(result.success).toBe(true);
        });
    });

    describe('ExperienceLevelStrategySchema', () => {
        it('should validate a correct experience level strategy', () => {
            const strategy = {
                type: 'experience_level',
                levels: [
                    {
                        name: 'beginner',
                        thc_max: 15,
                        dosage_guidance: 'Start low',
                        warnings: ['Wait before redosing'],
                    },
                    { name: 'experienced' },
                ],
                default_level: 'beginner',
                ask_if_unknown: true,
            };
            const result = ExperienceLevelStrategySchema.safeParse(strategy);
            expect(result.success).toBe(true);
        });

        it('should require default_level', () => {
            const strategy = {
                type: 'experience_level',
                levels: [{ name: 'beginner' }],
            };
            const result = ExperienceLevelStrategySchema.safeParse(strategy);
            expect(result.success).toBe(false);
        });
    });

    describe('ProductTypeStrategySchema', () => {
        it('should validate a correct product type strategy', () => {
            const strategy = {
                type: 'product_type',
                preferences: [
                    { category: 'flower', weight: 0.9 },
                    { category: 'edibles', weight: 0.7, subcategories: ['gummies', 'chocolates'] },
                ],
                exclude_categories: ['concentrates'],
            };
            const result = ProductTypeStrategySchema.safeParse(strategy);
            expect(result.success).toBe(true);
        });
    });

    describe('BrandAffinityStrategySchema', () => {
        it('should validate a correct brand affinity strategy', () => {
            const strategy = {
                type: 'brand_affinity',
                featured_brands: [
                    { name: 'Premium Brand', boost_weight: 1.5, message: 'Featured partner!' },
                ],
                house_brand: 'Store Brand',
                exclude_brands: ['Competitor'],
            };
            const result = BrandAffinityStrategySchema.safeParse(strategy);
            expect(result.success).toBe(true);
        });

        it('should enforce boost_weight between 1 and 2', () => {
            const strategy = {
                type: 'brand_affinity',
                featured_brands: [{ name: 'Brand', boost_weight: 0.5 }],
            };
            const result = BrandAffinityStrategySchema.safeParse(strategy);
            expect(result.success).toBe(false);
        });
    });

    describe('OccasionStrategySchema', () => {
        it('should validate a correct occasion strategy', () => {
            const strategy = {
                type: 'occasion',
                occasions: [
                    {
                        name: 'sleep',
                        effects: ['relaxation', 'sedation'],
                        product_types: ['edibles', 'tinctures'],
                        time_of_day: 'night',
                    },
                    {
                        name: 'social',
                        effects: ['euphoria', 'energy'],
                        time_of_day: 'any',
                    },
                ],
            };
            const result = OccasionStrategySchema.safeParse(strategy);
            expect(result.success).toBe(true);
        });

        it('should validate time_of_day enum', () => {
            const strategy = {
                type: 'occasion',
                occasions: [
                    { name: 'test', effects: ['test'], time_of_day: 'invalid' },
                ],
            };
            const result = OccasionStrategySchema.safeParse(strategy);
            expect(result.success).toBe(false);
        });
    });

    describe('HybridStrategySchema', () => {
        it('should validate a correct hybrid strategy', () => {
            const strategy = {
                type: 'hybrid',
                strategies: [
                    { strategy: 'effect_based', weight: 0.6, config: {} },
                    { strategy: 'price_tier', weight: 0.4, config: {} },
                ],
                combination_mode: 'weighted_average',
            };
            const result = HybridStrategySchema.safeParse(strategy);
            expect(result.success).toBe(true);
        });

        it('should validate combination_mode enum', () => {
            const strategy = {
                type: 'hybrid',
                strategies: [],
                combination_mode: 'invalid',
            };
            const result = HybridStrategySchema.safeParse(strategy);
            expect(result.success).toBe(false);
        });
    });
});

describe('Ground Truth v1.0 - RecommendationConfigSchema', () => {
    const validConfig: RecommendationConfig = {
        version: '1.0',
        default_strategy: 'effect_based',
        strategies: [
            {
                type: 'effect_based',
                effects: [{ name: 'relaxation', weight: 0.8 }],
            },
        ],
        constraints: {
            max_recommendations: 5,
            require_in_stock: true,
            min_confidence: 0.6,
        },
        beginner_safety: {
            enabled: true,
            max_thc_first_time: 10,
            max_edible_mg_first_time: 5,
            warning_message: 'Start low and go slow!',
        },
        compliance: {
            require_age_confirmation: true,
            medical_disclaimer: 'Not medical advice',
            no_health_claims: true,
        },
    };

    it('should validate a complete recommendation config', () => {
        const result = RecommendationConfigSchema.safeParse(validConfig);
        expect(result.success).toBe(true);
    });

    it('should reject invalid default_strategy', () => {
        const invalidConfig = {
            ...validConfig,
            default_strategy: 'invalid_strategy',
        };
        const result = RecommendationConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
    });

    it('should reject negative max_recommendations', () => {
        const invalidConfig = {
            ...validConfig,
            constraints: {
                ...validConfig.constraints,
                max_recommendations: -1,
            },
        };
        const result = RecommendationConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
    });

    it('should reject min_confidence outside 0-1 range', () => {
        const invalidConfig = {
            ...validConfig,
            constraints: {
                ...validConfig.constraints,
                min_confidence: 1.5,
            },
        };
        const result = RecommendationConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
    });
});

describe('Ground Truth v1.0 - GroundTruthQASetSchema with recommendation_config', () => {
    const baseGroundTruth: GroundTruthQASet = {
        metadata: {
            dispensary: 'Test Dispensary',
            address: '123 Test St',
            version: '1.0',
            created: '2026-01-22',
            last_updated: '2026-01-22',
            total_qa_pairs: 0,
            author: 'Test',
        },
        categories: {},
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

    it('should accept ground truth without recommendation_config', () => {
        const result = GroundTruthQASetSchema.safeParse(baseGroundTruth);
        expect(result.success).toBe(true);
    });

    it('should accept ground truth with valid recommendation_config', () => {
        const withConfig = {
            ...baseGroundTruth,
            recommendation_config: createDefaultRecommendationConfig(),
        };
        const result = GroundTruthQASetSchema.safeParse(withConfig);
        expect(result.success).toBe(true);
    });
});

describe('Ground Truth v1.0 - Helper Functions', () => {
    const testGroundTruthWithStrategies: GroundTruthQASet = {
        metadata: {
            dispensary: 'Test Dispensary',
            address: '123 Test St',
            version: '1.0',
            created: '2026-01-22',
            last_updated: '2026-01-22',
            total_qa_pairs: 0,
            author: 'Test',
        },
        categories: {},
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
        recommendation_config: {
            version: '1.0',
            default_strategy: 'effect_based',
            strategies: [
                {
                    type: 'effect_based',
                    effects: [{ name: 'relaxation', weight: 0.8 }],
                },
                {
                    type: 'price_tier',
                    tiers: [{ name: 'budget', max_price: 30 }],
                },
            ],
            constraints: {
                max_recommendations: 5,
                require_in_stock: true,
                min_confidence: 0.6,
            },
            beginner_safety: {
                enabled: true,
                max_thc_first_time: 10,
                max_edible_mg_first_time: 5,
                warning_message: 'Start low!',
            },
            compliance: {
                require_age_confirmation: true,
                medical_disclaimer: 'Disclaimer',
                no_health_claims: true,
            },
        },
    };

    const testGroundTruthWithoutStrategies: GroundTruthQASet = {
        ...testGroundTruthWithStrategies,
        recommendation_config: undefined,
    };

    describe('hasRecommendationStrategies', () => {
        it('should return true when strategies are configured', () => {
            expect(hasRecommendationStrategies(testGroundTruthWithStrategies)).toBe(true);
        });

        it('should return false when no recommendation_config', () => {
            expect(hasRecommendationStrategies(testGroundTruthWithoutStrategies)).toBe(false);
        });

        it('should return false when strategies array is empty', () => {
            const emptyStrategies = {
                ...testGroundTruthWithStrategies,
                recommendation_config: {
                    ...testGroundTruthWithStrategies.recommendation_config!,
                    strategies: [],
                },
            };
            expect(hasRecommendationStrategies(emptyStrategies)).toBe(false);
        });
    });

    describe('getDefaultStrategy', () => {
        it('should return the default strategy', () => {
            const strategy = getDefaultStrategy(testGroundTruthWithStrategies);
            expect(strategy).not.toBeNull();
            expect(strategy?.type).toBe('effect_based');
        });

        it('should return null when no recommendation_config', () => {
            const strategy = getDefaultStrategy(testGroundTruthWithoutStrategies);
            expect(strategy).toBeNull();
        });
    });

    describe('getStrategyByType', () => {
        it('should return strategy by type', () => {
            const effectStrategy = getStrategyByType(testGroundTruthWithStrategies, 'effect_based');
            expect(effectStrategy).not.toBeNull();
            expect(effectStrategy?.type).toBe('effect_based');

            const priceStrategy = getStrategyByType(testGroundTruthWithStrategies, 'price_tier');
            expect(priceStrategy).not.toBeNull();
            expect(priceStrategy?.type).toBe('price_tier');
        });

        it('should return null for non-existent strategy type', () => {
            const strategy = getStrategyByType(testGroundTruthWithStrategies, 'occasion');
            expect(strategy).toBeNull();
        });

        it('should return null when no recommendation_config', () => {
            const strategy = getStrategyByType(testGroundTruthWithoutStrategies, 'effect_based');
            expect(strategy).toBeNull();
        });
    });

    describe('getBeginnerSafety', () => {
        it('should return beginner safety settings', () => {
            const safety = getBeginnerSafety(testGroundTruthWithStrategies);
            expect(safety).not.toBeNull();
            expect(safety?.enabled).toBe(true);
            expect(safety?.max_thc_first_time).toBe(10);
            expect(safety?.max_edible_mg_first_time).toBe(5);
        });

        it('should return null when no recommendation_config', () => {
            const safety = getBeginnerSafety(testGroundTruthWithoutStrategies);
            expect(safety).toBeNull();
        });
    });

    describe('isBeginnerSafetyEnabled', () => {
        it('should return true when enabled', () => {
            expect(isBeginnerSafetyEnabled(testGroundTruthWithStrategies)).toBe(true);
        });

        it('should return false when no recommendation_config', () => {
            expect(isBeginnerSafetyEnabled(testGroundTruthWithoutStrategies)).toBe(false);
        });

        it('should return false when disabled', () => {
            const disabledSafety = {
                ...testGroundTruthWithStrategies,
                recommendation_config: {
                    ...testGroundTruthWithStrategies.recommendation_config!,
                    beginner_safety: {
                        ...testGroundTruthWithStrategies.recommendation_config!.beginner_safety,
                        enabled: false,
                    },
                },
            };
            expect(isBeginnerSafetyEnabled(disabledSafety)).toBe(false);
        });
    });

    describe('getComplianceSettings', () => {
        it('should return compliance settings', () => {
            const compliance = getComplianceSettings(testGroundTruthWithStrategies);
            expect(compliance).not.toBeNull();
            expect(compliance?.require_age_confirmation).toBe(true);
            expect(compliance?.no_health_claims).toBe(true);
        });

        it('should return null when no recommendation_config', () => {
            const compliance = getComplianceSettings(testGroundTruthWithoutStrategies);
            expect(compliance).toBeNull();
        });
    });
});

describe('Ground Truth v1.0 - createDefaultRecommendationConfig', () => {
    it('should create a valid default config', () => {
        const config = createDefaultRecommendationConfig();

        // Validate with schema
        const result = RecommendationConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
    });

    it('should have correct version', () => {
        const config = createDefaultRecommendationConfig();
        expect(config.version).toBe(GROUND_TRUTH_VERSION);
    });

    it('should include effect_based as default strategy', () => {
        const config = createDefaultRecommendationConfig();
        expect(config.default_strategy).toBe('effect_based');
    });

    it('should include three default strategies', () => {
        const config = createDefaultRecommendationConfig();
        expect(config.strategies.length).toBe(3);

        const types = config.strategies.map(s => s.type);
        expect(types).toContain('effect_based');
        expect(types).toContain('experience_level');
        expect(types).toContain('price_tier');
    });

    it('should have beginner safety enabled by default', () => {
        const config = createDefaultRecommendationConfig();
        expect(config.beginner_safety.enabled).toBe(true);
        expect(config.beginner_safety.max_thc_first_time).toBe(10);
        expect(config.beginner_safety.max_edible_mg_first_time).toBe(5);
    });

    it('should have compliance settings enabled', () => {
        const config = createDefaultRecommendationConfig();
        expect(config.compliance.require_age_confirmation).toBe(true);
        expect(config.compliance.no_health_claims).toBe(true);
    });

    it('should have reasonable constraints', () => {
        const config = createDefaultRecommendationConfig();
        expect(config.constraints.max_recommendations).toBe(5);
        expect(config.constraints.require_in_stock).toBe(true);
        expect(config.constraints.min_confidence).toBe(0.6);
    });
});
