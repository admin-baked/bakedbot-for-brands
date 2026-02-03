/**
 * Peer Review Server Actions - Unit Tests
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { PeerReview } from '@/types/training';

jest.mock('@/server/auth/auth');
jest.mock('@/firebase/admin');
jest.mock('@/lib/logger');

describe('Peer Review Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('submitPeerReview', () => {
        it('should validate required fields', async () => {
            const { submitPeerReview } = await import('../peer-review');

            const result = await submitPeerReview({
                reviewId: 'test-review',
                rating: 3,
                strengths: [],
                improvements: [],
                questions: [],
                wouldApprove: true,
                rubricScores: [],
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should enforce rating range (1-5)', async () => {
            const { submitPeerReview } = await import('../peer-review');

            const result = await submitPeerReview({
                reviewId: 'test-review',
                rating: 6 as any, // Invalid rating
                strengths: ['Good code'],
                improvements: ['Add comments'],
                questions: [],
                wouldApprove: true,
                rubricScores: [],
            });

            expect(result.success).toBe(false);
        });

        it('should verify reviewer authorization', async () => {
            const mockReview: PeerReview = {
                id: 'test-review',
                submissionId: 'test-submission',
                reviewerId: 'different-user',
                authorId: 'author-user',
                challengeId: 'week1-ch1',
                cohortId: 'test-cohort',
                rating: 3,
                strengths: [],
                improvements: [],
                questions: [],
                wouldApprove: false,
                rubricScores: [],
                assignedAt: { seconds: Date.now() / 1000 } as any,
                status: 'pending',
                helpfulVotes: 0,
                flagged: false,
                createdAt: { seconds: Date.now() / 1000 } as any,
                updatedAt: { seconds: Date.now() / 1000 } as any,
            };

            const mockDb = {
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({
                            exists: true,
                            data: () => mockReview,
                        }),
                    })),
                })),
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

            const { submitPeerReview } = await import('../peer-review');

            const result = await submitPeerReview({
                reviewId: 'test-review',
                rating: 4,
                strengths: ['Good work'],
                improvements: ['Add tests'],
                questions: [],
                wouldApprove: true,
                rubricScores: [
                    { category: 'Code Quality', score: 4, comment: 'Nice' },
                ],
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unauthorized');
        });
    });

    describe('assignPeerReviewers', () => {
        it('should assign correct number of reviewers', async () => {
            const { assignPeerReviewers } = await import('../peer-review');

            const mockDb = {
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({
                                userId: 'author-user',
                                cohortId: 'test-cohort',
                                challengeId: 'week1-ch1',
                                status: 'approved',
                            }),
                        }),
                        ref: {
                            update: jest.fn().mockResolvedValue(undefined),
                        },
                    })),
                    add: jest.fn().mockResolvedValue({ id: 'new-review-id' }),
                })),
                collectionGroup: jest.fn(() => ({
                    where: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({
                        docs: [
                            { id: 'user1', ref: { parent: { parent: { id: 'user1' } } } },
                            { id: 'user2', ref: { parent: { parent: { id: 'user2' } } } },
                            { id: 'user3', ref: { parent: { parent: { id: 'user3' } } } },
                        ],
                    }),
                })),
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'admin-user', role: ['super_user'] });

            const { getAdminFirestore } = await import('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

            const result = await assignPeerReviewers('test-submission', 2);

            expect(result.success).toBe(true);
            expect(result.data?.assignedReviewers).toHaveLength(2);
        });

        it('should fail if not enough eligible reviewers', async () => {
            const mockDb = {
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({
                                userId: 'author-user',
                                cohortId: 'test-cohort',
                                challengeId: 'week1-ch1',
                                status: 'approved',
                            }),
                        }),
                    })),
                })),
                collectionGroup: jest.fn(() => ({
                    where: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({
                        docs: [
                            { id: 'user1', ref: { parent: { parent: { id: 'user1' } } } },
                        ],
                    }),
                })),
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'admin-user', role: ['super_user'] });

            const { getAdminFirestore } = await import('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

            const { assignPeerReviewers } = await import('../peer-review');

            const result = await assignPeerReviewers('test-submission', 2);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Not enough eligible reviewers');
        });
    });

    describe('markReviewHelpful', () => {
        it('should increment helpful votes', async () => {
            const mockUpdateFn = jest.fn().mockResolvedValue(undefined);

            const mockDb = {
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({
                                submissionId: 'test-submission',
                                reviewerId: 'reviewer-user',
                                helpfulVotes: 5,
                            }),
                        }),
                        ref: {
                            update: mockUpdateFn,
                        },
                    })),
                })),
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'author-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

            const { markReviewHelpful } = await import('../peer-review');

            const result = await markReviewHelpful('test-review');

            expect(result.success).toBe(true);
            expect(mockUpdateFn).toHaveBeenCalled();
        });
    });
});
