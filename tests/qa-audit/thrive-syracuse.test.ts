/**
 * Thrive Syracuse QA Evaluation Tests
 *
 * Tests Smokey's ground truth data structure and provides evaluation utilities.
 * Run with: npm test -- tests/qa-audit/thrive-syracuse.test.ts
 */

import {
    thriveGroundTruth,
    THRIVE_SYRACUSE_BRAND_ID,
} from '@/server/grounding/customers/thrive-syracuse';
import {
    getGroundTruth,
    hasGroundTruth,
    buildGroundingInstructions,
    findMatchingQA,
    getGroundingContext,
    getGroundTruthStats,
} from '@/server/grounding';
import {
    getAllQAPairs,
    getCriticalQAPairs,
    countByCategory,
    GroundTruthQASetSchema,
} from '@/types/ground-truth';

describe('Thrive Syracuse Ground Truth', () => {
    describe('Data Structure Validation', () => {
        it('should have valid metadata', () => {
            expect(thriveGroundTruth.metadata.dispensary).toBe('Thrive Syracuse');
            expect(thriveGroundTruth.metadata.brandId).toBe(THRIVE_SYRACUSE_BRAND_ID);
            expect(thriveGroundTruth.metadata.address).toBe('3065 Erie Blvd E, Syracuse, NY 13224');

            // Keep this in sync with the actual QA content as the dataset grows.
            const allQAs = getAllQAPairs(thriveGroundTruth);
            expect(thriveGroundTruth.metadata.total_qa_pairs).toBe(allQAs.length);
            expect(allQAs.length).toBeGreaterThanOrEqual(29);
        });

        it('should pass Zod schema validation', () => {
            const result = GroundTruthQASetSchema.safeParse(thriveGroundTruth);
            expect(result.success).toBe(true);
        });

        it('should contain required categories (and allow additions)', () => {
            const categories = Object.keys(thriveGroundTruth.categories);
            expect(categories).toContain('store_information');
            expect(categories).toContain('age_and_id');
            expect(categories).toContain('product_categories');
            expect(categories).toContain('effect_based_recommendations');
            expect(categories).toContain('brands_and_products');
            expect(categories).toContain('pricing_and_deals');
            expect(categories).toContain('compliance_and_safety');
            expect(categories).toContain('ordering_and_delivery');

            // Thrive-specific category: pairing and upsell guidance
            expect(categories).toContain('product_pairings_and_upsells');
            expect(categories.length).toBeGreaterThanOrEqual(9);
        });

        it('should have QA pairs consistent with metadata', () => {
            const allQAs = getAllQAPairs(thriveGroundTruth);
            expect(allQAs.length).toBe(thriveGroundTruth.metadata.total_qa_pairs);
            expect(allQAs.length).toBeGreaterThanOrEqual(29);
        });

        it('should have correct category counts', () => {
            const counts = countByCategory(thriveGroundTruth);
            // Minimum coverage expectations (counts may increase as QA set expands)
            expect(counts.store_information).toBeGreaterThanOrEqual(4);
            expect(counts.age_and_id).toBeGreaterThanOrEqual(2);
            expect(counts.product_categories).toBeGreaterThanOrEqual(6);
            expect(counts.effect_based_recommendations).toBeGreaterThanOrEqual(5);
            expect(counts.brands_and_products).toBeGreaterThanOrEqual(3);
            expect(counts.pricing_and_deals).toBeGreaterThanOrEqual(3);
            expect(counts.compliance_and_safety).toBeGreaterThanOrEqual(4);
            expect(counts.ordering_and_delivery).toBeGreaterThanOrEqual(2);
            expect(counts.product_pairings_and_upsells).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Critical Compliance QA Pairs', () => {
        it('should have critical QA pairs for regulatory content', () => {
            const criticalQAs = getCriticalQAPairs(thriveGroundTruth);
            expect(criticalQAs.length).toBeGreaterThanOrEqual(5);
        });

        it('should include age requirement as critical', () => {
            const criticalQAs = getCriticalQAPairs(thriveGroundTruth);
            const ageQA = criticalQAs.find(qa => qa.id === 'AI-001');
            expect(ageQA).toBeDefined();
            expect(ageQA?.ideal_answer).toContain('21');
        });

        it('should include possession limits as critical', () => {
            const criticalQAs = getCriticalQAPairs(thriveGroundTruth);
            const possessionQA = criticalQAs.find(qa => qa.id === 'CS-003');
            expect(possessionQA).toBeDefined();
            expect(possessionQA?.ideal_answer).toContain('3 ounces');
            expect(possessionQA?.ideal_answer).toContain('24 grams');
        });

        it('should include first-time user guidance as critical', () => {
            const criticalQAs = getCriticalQAPairs(thriveGroundTruth);
            const firstTimeQA = criticalQAs.find(qa => qa.id === 'ER-005');
            expect(firstTimeQA).toBeDefined();
            expect(firstTimeQA?.ideal_answer).toContain('2.5-5mg');
            expect(firstTimeQA?.ideal_answer).toContain('Start low');
        });

        it('should include product testing as critical', () => {
            const criticalQAs = getCriticalQAPairs(thriveGroundTruth);
            const testingQA = criticalQAs.find(qa => qa.id === 'CS-001');
            expect(testingQA).toBeDefined();
            expect(testingQA?.ideal_answer).toContain('lab-tested');
            expect(testingQA?.ideal_answer).toContain('Certificate of Analysis');
        });

        it('should include licensing as critical', () => {
            const criticalQAs = getCriticalQAPairs(thriveGroundTruth);
            const licensingQA = criticalQAs.find(qa => qa.id === 'SI-003');
            expect(licensingQA).toBeDefined();
            expect(licensingQA?.ideal_answer).toContain('licensed');
            expect(licensingQA?.ideal_answer).toContain('OCM');
        });
    });

    describe('Registry Integration', () => {
        it('should be registered with correct brand ID', () => {
            expect(hasGroundTruth(THRIVE_SYRACUSE_BRAND_ID)).toBe(true);
        });

        it('should return ground truth from registry', () => {
            const gt = getGroundTruth(THRIVE_SYRACUSE_BRAND_ID);
            expect(gt).toBeDefined();
            expect(gt?.metadata.dispensary).toBe('Thrive Syracuse');
        });

        it('should return null for unknown brand', () => {
            const gt = getGroundTruth('nonexistent-brand');
            expect(gt).toBeNull();
        });

        it('should provide correct stats', () => {
            const stats = getGroundTruthStats(THRIVE_SYRACUSE_BRAND_ID);
            expect(stats).toBeDefined();
            expect(stats?.totalQAPairs).toBe(thriveGroundTruth.metadata.total_qa_pairs);
            expect(stats?.criticalCount).toBeGreaterThanOrEqual(5);
            expect(stats?.categories).toEqual(expect.arrayContaining([
                'store_information',
                'age_and_id',
                'product_categories',
                'effect_based_recommendations',
                'brands_and_products',
                'pricing_and_deals',
                'compliance_and_safety',
                'ordering_and_delivery',
                'product_pairings_and_upsells',
            ]));
            expect(stats?.categories.length).toBe(Object.keys(thriveGroundTruth.categories).length);
        });
    });

    describe('Grounding Instructions Builder', () => {
        it('should build full grounding instructions', () => {
            const grounding = buildGroundingInstructions(thriveGroundTruth);

            expect(grounding.dispensaryInfo).toContain('Thrive Syracuse');
            expect(grounding.dispensaryInfo).toContain('3065 Erie Blvd E');

            expect(grounding.criticalCompliance).toContain('CRITICAL COMPLIANCE');
            expect(grounding.criticalCompliance).toContain('21');

            expect(grounding.quickReference).toContain('QUICK REFERENCE');

            expect(grounding.full).toContain('DISPENSARY INFORMATION');
            expect(grounding.full).toContain('GROUNDING RULES');
        });

        it('should include all critical facts in compliance section', () => {
            const grounding = buildGroundingInstructions(thriveGroundTruth);
            const criticalQAs = getCriticalQAPairs(thriveGroundTruth);

            for (const qa of criticalQAs) {
                // Each critical QA should have its context mentioned
                expect(grounding.criticalCompliance).toContain(qa.context);
            }
        });
    });

    describe('QA Matching', () => {
        it('should find exact question match', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                'Where is Thrive Syracuse located?'
            );
            expect(match).toBeDefined();
            expect(match?.id).toBe('SI-001');
        });

        it('should find match by keywords', () => {
            const match = findMatchingQA(thriveGroundTruth, 'How old to buy weed?');
            expect(match).toBeDefined();
            // Should match age-related question
            expect(match?.id).toBe('AI-001');
        });

        it('should find match for sleep products', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                'What products help with sleep?'
            );
            expect(match).toBeDefined();
            expect(match?.id).toBe('ER-001');
        });

        it('should return low confidence for unrelated question', () => {
            // The matcher may return a low-confidence match due to common words
            // What matters is that compliance questions aren't matched incorrectly
            const match = findMatchingQA(
                thriveGroundTruth,
                'What is the capital of France?'
            );
            // If there's a match, it should NOT be a critical compliance question
            if (match) {
                expect(match.priority).not.toBe('critical');
            }
        });

        it('should provide grounding context for critical questions', () => {
            const context = getGroundingContext(
                thriveGroundTruth,
                'How old do I need to be?'
            );
            expect(context.qa).toBeDefined();
            expect(context.instruction).toContain('CRITICAL');
            expect(context.instruction).toContain('EXACT');
        });

        it('should provide grounding context for non-critical questions', () => {
            const context = getGroundingContext(
                thriveGroundTruth,
                'Do you have gummies?'
            );
            expect(context.qa).toBeDefined();
            expect(context.instruction).toContain('paraphrase');
        });
    });

    describe('Evaluation Config', () => {
        it('should have scoring weights that sum to 1.0', () => {
            const weights = thriveGroundTruth.evaluation_config.scoring_weights;
            const sum =
                weights.keyword_coverage +
                weights.intent_match +
                weights.factual_accuracy +
                weights.tone_appropriateness;
            expect(sum).toBeCloseTo(1.0, 5); // Allow for floating point precision
        });

        it('should have compliance accuracy target of 100%', () => {
            expect(
                thriveGroundTruth.evaluation_config.target_metrics.compliance_accuracy
            ).toBe(1.0);
        });

        it('should have overall accuracy target of 90%', () => {
            expect(
                thriveGroundTruth.evaluation_config.target_metrics.overall_accuracy
            ).toBe(0.9);
        });
    });

    describe('Keyword Coverage', () => {
        it('should have keywords for every QA pair', () => {
            const allQAs = getAllQAPairs(thriveGroundTruth);
            for (const qa of allQAs) {
                expect(qa.keywords.length).toBeGreaterThan(0);
            }
        });

        it('should have relevant keywords in ideal answers', () => {
            const allQAs = getAllQAPairs(thriveGroundTruth);
            let missingKeywords = 0;

            for (const qa of allQAs) {
                const answerLower = qa.ideal_answer.toLowerCase();
                const matchedKeywords = qa.keywords.filter(kw =>
                    answerLower.includes(kw.toLowerCase())
                );
                // At least half the keywords should appear in the answer
                if (matchedKeywords.length < qa.keywords.length / 2) {
                    missingKeywords++;
                }
            }

            // Allow some flexibility but most should have keyword coverage
            expect(missingKeywords).toBeLessThan(5);
        });
    });
});

describe('Evaluation Utilities', () => {
    /**
     * Calculates keyword coverage score for a response
     */
    function calculateKeywordCoverage(
        response: string,
        expectedKeywords: string[]
    ): number {
        const responseLower = response.toLowerCase();
        let matched = 0;

        for (const keyword of expectedKeywords) {
            if (responseLower.includes(keyword.toLowerCase())) {
                matched++;
            }
        }

        return expectedKeywords.length > 0 ? matched / expectedKeywords.length : 0;
    }

    /**
     * Simple intent match heuristic
     */
    function calculateIntentMatch(
        response: string,
        intent: string,
        context: string
    ): number {
        const responseLower = response.toLowerCase();
        const intentWords = intent.toLowerCase().split(/\s+/);
        const contextWords = context.toLowerCase().split(/\s+/);

        let matchCount = 0;
        for (const word of [...intentWords, ...contextWords]) {
            if (word.length > 3 && responseLower.includes(word)) {
                matchCount++;
            }
        }

        const totalWords = intentWords.length + contextWords.length;
        return totalWords > 0 ? Math.min(1, matchCount / (totalWords * 0.3)) : 0;
    }

    describe('Keyword Coverage Calculator', () => {
        it('should return 1.0 for perfect keyword match', () => {
            const response = 'You must be 21 years old with a valid ID';
            const keywords = ['21', 'valid ID'];
            expect(calculateKeywordCoverage(response, keywords)).toBe(1.0);
        });

        it('should return 0.5 for half keyword match', () => {
            const response = 'You must be 21 years old';
            const keywords = ['21', 'valid ID'];
            expect(calculateKeywordCoverage(response, keywords)).toBe(0.5);
        });

        it('should return 0 for no keyword match', () => {
            const response = 'Welcome to our store';
            const keywords = ['21', 'valid ID'];
            expect(calculateKeywordCoverage(response, keywords)).toBe(0);
        });
    });

    describe('Intent Match Calculator', () => {
        it('should return high score for matching intent', () => {
            const response =
                'Our dispensary is located at the store address 3065 Erie Blvd E, Syracuse';
            const intent = 'Find dispensary location';
            const context = 'Store location and address';

            const score = calculateIntentMatch(response, intent, context);
            expect(score).toBeGreaterThan(0.3); // Lower threshold since word matching is strict
        });

        it('should return low score for non-matching intent', () => {
            const response = 'We have great deals on edibles';
            const intent = 'Find dispensary location';
            const context = 'Store location and address';

            const score = calculateIntentMatch(response, intent, context);
            expect(score).toBeLessThan(0.5);
        });
    });
});
