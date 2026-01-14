/**
 * Unit Tests for Reranker Service
 */

import { RerankerDocument, simpleRerank } from '@/server/services/vector-search/reranker-service';

describe('RerankerService', () => {
    describe('simpleRerank', () => {
        const mockDocuments: RerankerDocument[] = [
            { id: 'doc-1', content: 'Cannabis delivery rules in California state regulations.', score: 0.85 },
            { id: 'doc-2', content: 'Storage requirements for cannabis products in warehouses.', score: 0.82 },
            { id: 'doc-3', content: 'Michigan delivery curfew is 9am to 9pm in Detroit.', score: 0.80 },
            { id: 'doc-4', content: 'Age verification requirements for all cannabis purchases.', score: 0.78 },
            { id: 'doc-5', content: 'Detroit Michigan cannabis dispensary licensing requirements.', score: 0.75 }
        ];

        it('boosts documents with exact query term matches', () => {
            const query = 'Detroit Michigan delivery rules';
            const ranked = simpleRerank(query, mockDocuments, 5);

            // doc-3 should be boosted (contains "Detroit", "Michigan", "delivery")
            // doc-5 should also be boosted (contains "Detroit", "Michigan")
            expect(ranked[0].id).toBe('doc-3');
        });

        it('respects topK limit', () => {
            const ranked = simpleRerank('cannabis', mockDocuments, 3);
            expect(ranked).toHaveLength(3);
        });

        it('assigns sequential ranks', () => {
            const ranked = simpleRerank('storage', mockDocuments, 5);
            for (let i = 0; i < ranked.length; i++) {
                expect(ranked[i].rank).toBe(i + 1);
            }
        });

        it('preserves original scores in output', () => {
            const ranked = simpleRerank('cannabis', mockDocuments, 3);
            for (const doc of ranked) {
                expect(doc.originalScore).toBeGreaterThan(0);
                expect(doc.rerankedScore).toBeGreaterThanOrEqual(doc.originalScore);
            }
        });

        it('gives extra boost for exact phrase match', () => {
            // Add a document with exact phrase
            const docsWithPhrase: RerankerDocument[] = [
                { id: 'exact', content: 'delivery rules apply to all packages', score: 0.70 },
                { id: 'partial', content: 'delivery requires following rules', score: 0.75 }
            ];

            const query = 'delivery rules';
            const ranked = simpleRerank(query, docsWithPhrase, 2);

            // The exact phrase match should be ranked higher despite lower original score
            expect(ranked[0].id).toBe('exact');
        });

        it('handles empty documents array', () => {
            const ranked = simpleRerank('query', [], 5);
            expect(ranked).toHaveLength(0);
        });

        it('ignores short query terms (< 3 chars)', () => {
            const docs: RerankerDocument[] = [
                { id: 'a', content: 'The quick brown fox.', score: 0.5 },
                { id: 'b', content: 'An apple a day.', score: 0.5 }
            ];

            // "a" and "an" should be ignored
            const ranked = simpleRerank('a an apple', docs, 2);
            
            // Only "apple" should contribute to matching
            expect(ranked[0].id).toBe('b');
        });
    });
});
