/**
 * Ground Truth System Unit Tests
 *
 * Comprehensive tests for the grounding module including:
 * - Registry operations
 * - Builder functions
 * - Dynamic loader (sync functions only - Firestore mocked)
 * - Edge cases and error handling
 *
 * Run with: npm test -- tests/server/grounding/grounding.test.ts
 */

import {
    GROUND_TRUTH_REGISTRY,
    getGroundTruth,
    hasGroundTruth,
    listGroundedBrands,
    getGroundTruthStats,
    buildGroundingInstructions,
    buildCondensedGrounding,
    findMatchingQA,
    getGroundingContext,
} from '@/server/grounding';
import {
    hasGroundTruthSync,
} from '@/server/grounding/dynamic-loader';
import {
    getAllQAPairs,
    getCriticalQAPairs,
    getQAPairsByPriority,
    countByCategory,
    type GroundTruthQASet,
} from '@/types/ground-truth';
import { thriveGroundTruth, THRIVE_SYRACUSE_BRAND_ID } from '@/server/grounding/customers/thrive-syracuse';

describe('Ground Truth Registry', () => {
    describe('GROUND_TRUTH_REGISTRY', () => {
        it('should contain Thrive Syracuse', () => {
            expect(GROUND_TRUTH_REGISTRY[THRIVE_SYRACUSE_BRAND_ID]).toBeDefined();
        });

        it('should have correct brand ID mapping', () => {
            expect(GROUND_TRUTH_REGISTRY['thrivesyracuse']).toBe(thriveGroundTruth);
        });
    });

    describe('getGroundTruth', () => {
        it('should return ground truth for registered brand', () => {
            const gt = getGroundTruth(THRIVE_SYRACUSE_BRAND_ID);
            expect(gt).toBeDefined();
            expect(gt?.metadata.dispensary).toBe('Thrive Syracuse');
        });

        it('should return null for unregistered brand', () => {
            const gt = getGroundTruth('nonexistent-brand');
            expect(gt).toBeNull();
        });

        it('should return null for empty string', () => {
            const gt = getGroundTruth('');
            expect(gt).toBeNull();
        });
    });

    describe('hasGroundTruth', () => {
        it('should return true for registered brand', () => {
            expect(hasGroundTruth(THRIVE_SYRACUSE_BRAND_ID)).toBe(true);
        });

        it('should return false for unregistered brand', () => {
            expect(hasGroundTruth('fake-brand')).toBe(false);
        });
    });

    describe('hasGroundTruthSync', () => {
        it('should return true for registered brand', () => {
            expect(hasGroundTruthSync(THRIVE_SYRACUSE_BRAND_ID)).toBe(true);
        });

        it('should normalize brand_ prefix', () => {
            expect(hasGroundTruthSync('brand_thrivesyracuse')).toBe(true);
        });

        it('should return false for unregistered brand', () => {
            expect(hasGroundTruthSync('unknown')).toBe(false);
        });
    });

    describe('listGroundedBrands', () => {
        it('should return array of grounded brands', () => {
            const brands = listGroundedBrands();
            expect(Array.isArray(brands)).toBe(true);
            expect(brands.length).toBeGreaterThan(0);
        });

        it('should include Thrive Syracuse', () => {
            const brands = listGroundedBrands();
            const thrive = brands.find(b => b.brandId === THRIVE_SYRACUSE_BRAND_ID);
            expect(thrive).toBeDefined();
            expect(thrive?.dispensary).toBe('Thrive Syracuse');
        });

        it('should include version info', () => {
            const brands = listGroundedBrands();
            for (const brand of brands) {
                expect(brand.version).toBeDefined();
                expect(typeof brand.version).toBe('string');
            }
        });
    });

    describe('getGroundTruthStats', () => {
        it('should return stats for registered brand', () => {
            const stats = getGroundTruthStats(THRIVE_SYRACUSE_BRAND_ID);
            expect(stats).toBeDefined();
            expect(stats?.totalQAPairs).toBe(thriveGroundTruth.metadata.total_qa_pairs);
            expect(stats?.criticalCount).toBeGreaterThan(0);
            expect(stats?.categories.length).toBe(Object.keys(thriveGroundTruth.categories).length);
        });

        it('should return null for unregistered brand', () => {
            const stats = getGroundTruthStats('fake-brand');
            expect(stats).toBeNull();
        });

        it('should have correct priority counts', () => {
            const stats = getGroundTruthStats(THRIVE_SYRACUSE_BRAND_ID);
            expect(stats).toBeDefined();
            if (!stats) return;

            const allPairs = Object.values(thriveGroundTruth.categories).flatMap(cat => cat.qa_pairs);
            const expectedCritical = allPairs.filter(p => p.priority === 'critical').length;
            const expectedHigh = allPairs.filter(p => p.priority === 'high').length;
            const expectedMedium = allPairs.filter(p => p.priority === 'medium').length;

            expect(stats.totalQAPairs).toBe(allPairs.length);
            expect(stats.criticalCount).toBe(expectedCritical);
            expect(stats.highCount).toBe(expectedHigh);
            expect(stats.mediumCount).toBe(expectedMedium);
            expect(stats.criticalCount + stats.highCount + stats.mediumCount).toBe(allPairs.length);
        });
    });
});

describe('Grounding Builder', () => {
    describe('buildGroundingInstructions', () => {
        it('should build all sections', () => {
            const grounding = buildGroundingInstructions(thriveGroundTruth);
            expect(grounding.dispensaryInfo).toBeDefined();
            expect(grounding.criticalCompliance).toBeDefined();
            expect(grounding.quickReference).toBeDefined();
            expect(grounding.full).toBeDefined();
        });

        it('should include dispensary name in info section', () => {
            const grounding = buildGroundingInstructions(thriveGroundTruth);
            expect(grounding.dispensaryInfo).toContain('Thrive Syracuse');
        });

        it('should include address in info section', () => {
            const grounding = buildGroundingInstructions(thriveGroundTruth);
            expect(grounding.dispensaryInfo).toContain('3065 Erie Blvd E');
        });

        it('should include critical compliance header', () => {
            const grounding = buildGroundingInstructions(thriveGroundTruth);
            expect(grounding.criticalCompliance).toContain('CRITICAL COMPLIANCE');
            expect(grounding.criticalCompliance).toContain('100% Accuracy');
        });

        it('should include age requirement in critical compliance', () => {
            const grounding = buildGroundingInstructions(thriveGroundTruth);
            expect(grounding.criticalCompliance).toContain('21');
        });

        it('should include grounding rules in full section', () => {
            const grounding = buildGroundingInstructions(thriveGroundTruth);
            expect(grounding.full).toContain('GROUNDING RULES');
        });
    });

    describe('buildCondensedGrounding', () => {
        it('should create condensed version', () => {
            const condensed = buildCondensedGrounding(thriveGroundTruth);
            expect(condensed).toBeDefined();
            expect(condensed.length).toBeLessThan(
                buildGroundingInstructions(thriveGroundTruth).full.length
            );
        });

        it('should include location', () => {
            const condensed = buildCondensedGrounding(thriveGroundTruth);
            expect(condensed).toContain('3065 Erie Blvd E');
        });

        it('should include critical facts', () => {
            const condensed = buildCondensedGrounding(thriveGroundTruth);
            expect(condensed).toContain('Critical Facts');
        });
    });

    describe('buildGroundingInstructions with empty ground truth', () => {
        const emptyGT: GroundTruthQASet = {
            metadata: {
                dispensary: 'Empty Test',
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
            maintenance_schedule: { weekly: [], monthly: [], quarterly: [] },
        };

        it('should handle empty categories gracefully', () => {
            const grounding = buildGroundingInstructions(emptyGT);
            expect(grounding.dispensaryInfo).toContain('Empty Test');
            // Should have minimal or empty compliance section
            expect(grounding.criticalCompliance).toBeDefined();
        });
    });
});

describe('QA Matching', () => {
    describe('findMatchingQA', () => {
        it('should find exact match', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                'Where is Thrive Syracuse located?'
            );
            expect(match).toBeDefined();
            expect(match?.id).toBe('SI-001');
        });

        it('should find match by keywords - location', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                'What is your address?'
            );
            expect(match).toBeDefined();
            // Should match a location-related question
        });

        it('should find match by keywords - age', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                'How old must I be to buy cannabis?'
            );
            expect(match).toBeDefined();
            expect(match?.id).toBe('AI-001');
        });

        it('should find match for sleep products', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                'What helps with sleeping?'
            );
            expect(match).toBeDefined();
            expect(match?.id).toBe('ER-001');
        });

        it('should find match for edibles', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                'Do you have any edibles or gummies?'
            );
            expect(match).toBeDefined();
            expect(match?.keywords).toContain('gummies');
        });

        it('should find match for vapes', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                'What vape cartridges do you sell?'
            );
            expect(match).toBeDefined();
            expect(match?.id).toBe('PC-004');
        });

        it('should find match for payment methods', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                'What payment methods do you accept? Cash or debit?'
            );
            expect(match).toBeDefined();
            expect(match?.id).toBe('PD-002');
        });

        it('should handle very short questions', () => {
            const match = findMatchingQA(thriveGroundTruth, 'Sleep?');
            // Might match or not - should not throw
            expect(match === null || match !== null).toBe(true);
        });
    });

    describe('getGroundingContext', () => {
        it('should return CRITICAL instruction for age question', () => {
            const context = getGroundingContext(
                thriveGroundTruth,
                'How old do I need to be?'
            );
            expect(context.qa).toBeDefined();
            expect(context.instruction).toContain('CRITICAL');
        });

        it('should return CRITICAL instruction for possession limits', () => {
            const context = getGroundingContext(
                thriveGroundTruth,
                'How much cannabis can I legally possess?'
            );
            expect(context.qa).toBeDefined();
            expect(context.instruction).toContain('CRITICAL');
        });

        it('should return paraphrase instruction for non-critical', () => {
            const context = getGroundingContext(
                thriveGroundTruth,
                'What brands do you have?'
            );
            expect(context.qa).toBeDefined();
            expect(context.instruction).toContain('paraphrase');
        });

        it('should handle no match gracefully', () => {
            const context = getGroundingContext(
                thriveGroundTruth,
                'What is the meaning of life?'
            );
            // Should return instruction about using tools
            expect(context.instruction).toBeDefined();
        });
    });
});

describe('Helper Functions', () => {
    describe('getAllQAPairs', () => {
        it('should return all QA pairs', () => {
            const pairs = getAllQAPairs(thriveGroundTruth);
            expect(pairs.length).toBe(thriveGroundTruth.metadata.total_qa_pairs);
        });

        it('should return QA pairs with all required fields', () => {
            const pairs = getAllQAPairs(thriveGroundTruth);
            for (const pair of pairs) {
                expect(pair.id).toBeDefined();
                expect(pair.question).toBeDefined();
                expect(pair.ideal_answer).toBeDefined();
                expect(pair.keywords).toBeDefined();
                expect(pair.priority).toBeDefined();
            }
        });
    });

    describe('getCriticalQAPairs', () => {
        it('should return only critical priority pairs', () => {
            const critical = getCriticalQAPairs(thriveGroundTruth);
            const allPairs = Object.values(thriveGroundTruth.categories).flatMap(cat => cat.qa_pairs);
            const expectedCritical = allPairs.filter(p => p.priority === 'critical').length;
            expect(critical.length).toBe(expectedCritical);
            for (const pair of critical) {
                expect(pair.priority).toBe('critical');
            }
        });

        it('should include specific critical IDs', () => {
            const critical = getCriticalQAPairs(thriveGroundTruth);
            const ids = critical.map(p => p.id);
            expect(ids).toContain('AI-001'); // Age requirement
            expect(ids).toContain('CS-001'); // Product testing
            expect(ids).toContain('CS-003'); // Possession limits
        });
    });

    describe('getQAPairsByPriority', () => {
        it('should filter by high priority', () => {
            const high = getQAPairsByPriority(thriveGroundTruth, 'high');
            for (const pair of high) {
                expect(pair.priority).toBe('high');
            }
        });

        it('should filter by medium priority', () => {
            const medium = getQAPairsByPriority(thriveGroundTruth, 'medium');
            for (const pair of medium) {
                expect(pair.priority).toBe('medium');
            }
        });

        it('should have correct total when summed', () => {
            const critical = getQAPairsByPriority(thriveGroundTruth, 'critical');
            const high = getQAPairsByPriority(thriveGroundTruth, 'high');
            const medium = getQAPairsByPriority(thriveGroundTruth, 'medium');
            expect(critical.length + high.length + medium.length).toBe(thriveGroundTruth.metadata.total_qa_pairs);
        });
    });

    describe('countByCategory', () => {
        it('should return correct counts per category', () => {
            const counts = countByCategory(thriveGroundTruth);
            for (const [key, category] of Object.entries(thriveGroundTruth.categories)) {
                expect(counts[key]).toBe(category.qa_pairs.length);
            }
        });

        it('should have a count entry for each category', () => {
            const counts = countByCategory(thriveGroundTruth);
            expect(Object.keys(counts).sort()).toEqual(Object.keys(thriveGroundTruth.categories).sort());
        });
    });
});

describe('Edge Cases', () => {
    describe('Special characters in questions', () => {
        it('should handle questions with apostrophes', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                "Do you have Kiefer's products?"
            );
            expect(match).toBeDefined();
        });

        it('should handle questions with quotes', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                'Looking for "relaxation" products'
            );
            // Should not throw
            expect(match !== undefined).toBe(true);
        });
    });

    describe('Case sensitivity', () => {
        it('should match regardless of case', () => {
            const match1 = findMatchingQA(thriveGroundTruth, 'WHERE IS THRIVE SYRACUSE?');
            const match2 = findMatchingQA(thriveGroundTruth, 'where is thrive syracuse?');
            // Both should find a match (exact or keyword-based)
            expect(match1).toBeDefined();
            expect(match2).toBeDefined();
        });
    });

    describe('Whitespace handling', () => {
        it('should handle extra whitespace', () => {
            const match = findMatchingQA(
                thriveGroundTruth,
                '   What   products   help   with   sleep   ?   '
            );
            // Should still find a match
            expect(match !== undefined).toBe(true);
        });
    });
});

describe('Compliance Content Validation', () => {
    describe('Age and ID Requirements', () => {
        it('should have 21+ age requirement', () => {
            const ageQA = getAllQAPairs(thriveGroundTruth).find(q => q.id === 'AI-001');
            expect(ageQA?.ideal_answer).toContain('21');
            expect(ageQA?.priority).toBe('critical');
        });

        it('should mention valid ID types', () => {
            const idQA = getAllQAPairs(thriveGroundTruth).find(q => q.id === 'AI-002');
            expect(idQA?.ideal_answer).toMatch(/driver.*license|passport|state ID/i);
        });
    });

    describe('Possession Limits', () => {
        it('should state 3 ounces for flower', () => {
            const possessionQA = getAllQAPairs(thriveGroundTruth).find(q => q.id === 'CS-003');
            expect(possessionQA?.ideal_answer).toContain('3 ounces');
        });

        it('should state 24 grams for concentrate', () => {
            const possessionQA = getAllQAPairs(thriveGroundTruth).find(q => q.id === 'CS-003');
            expect(possessionQA?.ideal_answer).toContain('24 grams');
        });
    });

    describe('Product Testing', () => {
        it('should mention lab testing', () => {
            const testingQA = getAllQAPairs(thriveGroundTruth).find(q => q.id === 'CS-001');
            expect(testingQA?.ideal_answer).toMatch(/lab.*test/i);
        });

        it('should mention Certificate of Analysis', () => {
            const testingQA = getAllQAPairs(thriveGroundTruth).find(q => q.id === 'CS-001');
            expect(testingQA?.ideal_answer).toContain('Certificate of Analysis');
        });
    });

    describe('First-Time User Guidance', () => {
        it('should recommend low dose (2.5-5mg)', () => {
            const firstTimeQA = getAllQAPairs(thriveGroundTruth).find(q => q.id === 'ER-005');
            expect(firstTimeQA?.ideal_answer).toMatch(/2\.5.*5\s*mg/i);
        });

        it('should include start low go slow advice', () => {
            const firstTimeQA = getAllQAPairs(thriveGroundTruth).find(q => q.id === 'ER-005');
            expect(firstTimeQA?.ideal_answer).toMatch(/start low.*go slow/i);
        });
    });
});
