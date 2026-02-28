/**
 * Peer Review Server Actions - Unit Tests
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { PeerReview } from '@/types/training';

jest.mock('@google-cloud/firestore', () => ({
    Timestamp: {
        now: jest.fn(() => ({ seconds: Date.now() / 1000 })),
    },
    FieldValue: {
        increment: jest.fn((value: number) => ({ __increment: value })),
    },
}));
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));
jest.mock('@/server/auth/auth');
jest.mock('@/firebase/admin');
jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));

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

        it('should reject invalid review id path', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');

            const { submitPeerReview } = await import('../peer-review');
            const result = await submitPeerReview({
                reviewId: 'bad/review-id',
                rating: 4,
                strengths: ['Good work'],
                improvements: ['Add tests'],
                questions: [],
                wouldApprove: true,
                rubricScores: [{ category: 'Code Quality', score: 4 }],
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid review id');
            expect(getAdminFirestore).not.toHaveBeenCalled();
        });
    });

    describe('assignPeerReviewers', () => {
        it('should assign correct number of reviewers', async () => {
            const { assignPeerReviewers } = await import('../peer-review');
            const mockSubmissionUpdate = jest.fn().mockResolvedValue(undefined);
            const mockReviewerProgressUpdate = jest.fn().mockResolvedValue(undefined);

            let reviewCounter = 0;
            const pendingReviewsCount = {
                get: jest.fn().mockResolvedValue({
                    data: () => ({ count: 0 }),
                }),
            };
            const peerReviewsCollection = {
                where: jest.fn().mockReturnThis(),
                count: jest.fn().mockReturnValue(pendingReviewsCount),
                doc: jest.fn(() => ({
                    id: `review-${++reviewCounter}`,
                    set: jest.fn().mockResolvedValue(undefined),
                })),
            };

            const mockDb = {
                collection: jest.fn((name: string) => {
                    if (name === 'trainingSubmissions') {
                        return {
                            doc: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue({
                                    exists: true,
                                    data: () => ({
                                        userId: 'author-user',
                                        cohortId: 'test-cohort',
                                        challengeId: 'week1-ch1',
                                        status: 'approved',
                                    }),
                                    ref: {
                                        update: mockSubmissionUpdate,
                                    },
                                }),
                            })),
                        };
                    }

                    if (name === 'peerReviews') {
                        return peerReviewsCollection;
                    }

                    if (name === 'users') {
                        return {
                            doc: jest.fn(() => ({
                                collection: jest.fn(() => ({
                                    doc: jest.fn(() => ({
                                        update: mockReviewerProgressUpdate,
                                    })),
                                })),
                            })),
                        };
                    }

                    return {};
                }),
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

        it('should reject invalid submission id path', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'admin-user', role: ['super_user'] });

            const { getAdminFirestore } = await import('@/firebase/admin');

            const { assignPeerReviewers } = await import('../peer-review');
            const result = await assignPeerReviewers('bad/submission-id', 2);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid submission id');
            expect(getAdminFirestore).not.toHaveBeenCalled();
        });
    });

    describe('markReviewHelpful', () => {
        it('should increment helpful votes', async () => {
            const mockUpdateFn = jest.fn().mockResolvedValue(undefined);

            const mockDb = {
                collection: jest.fn((name: string) => {
                    if (name === 'peerReviews') {
                        return {
                            doc: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue({
                                    exists: true,
                                    data: () => ({
                                        submissionId: 'test-submission',
                                        reviewerId: 'reviewer-user',
                                        helpfulVotes: 5,
                                    }),
                                    ref: {
                                        update: mockUpdateFn,
                                    },
                                }),
                            })),
                            where: jest.fn().mockReturnThis(),
                            get: jest.fn().mockResolvedValue({
                                empty: true,
                                docs: [],
                            }),
                        };
                    }

                    if (name === 'trainingSubmissions') {
                        return {
                            doc: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue({
                                    exists: true,
                                    data: () => ({
                                        userId: 'author-user',
                                    }),
                                }),
                            })),
                        };
                    }

                    return {};
                }),
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

        it('should reject invalid review id path', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'author-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');

            const { markReviewHelpful } = await import('../peer-review');
            const result = await markReviewHelpful('bad/review-id');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid review id');
            expect(getAdminFirestore).not.toHaveBeenCalled();
        });
    });

    describe('getReceivedReviews', () => {
        it('should reject invalid submission id path', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');

            const { getReceivedReviews } = await import('../peer-review');
            const result = await getReceivedReviews('bad/submission-id');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid submission id');
            expect(getAdminFirestore).not.toHaveBeenCalled();
        });

        it('should not treat substring role matches as super access', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({
                uid: 'regular-user',
                role: 'not_super_user',
            });

            const mockDb = {
                collection: jest.fn((name: string) => {
                    if (name === 'trainingSubmissions') {
                        return {
                            doc: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue({
                                    exists: true,
                                    data: () => ({
                                        userId: 'submission-owner',
                                    }),
                                }),
                            })),
                        };
                    }

                    return {
                        where: jest.fn().mockReturnThis(),
                        get: jest.fn().mockResolvedValue({ docs: [] }),
                    };
                }),
            };

            const { getAdminFirestore } = await import('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

            const { getReceivedReviews } = await import('../peer-review');
            const result = await getReceivedReviews('submission-123');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unauthorized');
        });
    });

    describe('skipPeerReview', () => {
        it('should reject invalid review id path', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'author-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            const { skipPeerReview } = await import('../peer-review');

            const result = await skipPeerReview('bad/review-id', 'Need more time');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid review id');
            expect(getAdminFirestore).not.toHaveBeenCalled();
        });

        it('should reject empty skip reason', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'author-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            const { skipPeerReview } = await import('../peer-review');

            const result = await skipPeerReview('review-123', '   ');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Skip reason required');
            expect(getAdminFirestore).not.toHaveBeenCalled();
        });
    });
});
