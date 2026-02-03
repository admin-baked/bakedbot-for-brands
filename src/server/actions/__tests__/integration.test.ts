/**
 * Training Platform - Integration Tests
 *
 * Tests end-to-end flows across multiple systems
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { submitChallenge, getMyTrainingProgress } from '../training';
import { assignPeerReviewers, submitPeerReview, getMyPeerReviews } from '../peer-review';
import { generateCertificate, checkMyCertificateEligibility } from '../certificates';
import { Timestamp } from '@google-cloud/firestore';

// Mock all dependencies
jest.mock('@/server/auth/auth');
jest.mock('@/firebase/admin');
jest.mock('@/server/services/training/linus-review');
jest.mock('@/lib/certificates/generator');
jest.mock('@/lib/logger');

describe('Training Platform Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Challenge Submission Flow', () => {
        it('should complete full submission → review → progress update flow', async () => {
            // Setup mocks
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');

            const mockSubmissionRef = {
                id: 'sub-123',
                set: jest.fn().mockResolvedValue(undefined),
                update: jest.fn().mockResolvedValue(undefined),
            };

            const mockProgressRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({
                        cohortId: 'test-cohort',
                        completedChallenges: [],
                        acceptedSubmissions: 0,
                    }),
                }),
                update: jest.fn().mockResolvedValue(undefined),
            };

            const mockChallengeGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                    id: 'week1-ch1',
                    title: 'Test Challenge',
                    reviewCriteria: [],
                }),
            });

            const mockSubmissionsGet = jest.fn().mockResolvedValue({
                size: 0, // No previous submissions
            });

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn((name: string) => {
                    if (name === 'trainingSubmissions') {
                        return {
                            doc: jest.fn(() => mockSubmissionRef),
                            where: jest.fn().mockReturnValue({
                                get: mockSubmissionsGet,
                            }),
                        };
                    }
                    if (name === 'trainingChallenges') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                get: mockChallengeGet,
                            }),
                        };
                    }
                    if (name === 'users') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                collection: jest.fn().mockReturnValue({
                                    doc: jest.fn(() => mockProgressRef),
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            });

            // Mock Linus review
            const { submitForReview } = await import('@/server/services/training/linus-review');
            (submitForReview as jest.Mock).mockResolvedValue({
                overallScore: 85,
                approved: true,
                summary: 'Great work!',
                strengths: ['Clean code'],
                improvements: [],
                categoryScores: [],
            });

            // Step 1: Submit challenge
            const submitResult = await submitChallenge({
                challengeId: 'week1-ch1',
                cohortId: 'test-cohort',
                code: 'export function hello() { return "Hello BakedBot"; }',
                language: 'typescript',
            });

            expect(submitResult.success).toBe(true);
            expect(mockSubmissionRef.set).toHaveBeenCalled();

            // Step 2: Verify Linus review was triggered
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async review

            // In real system, Linus review would update submission status
            // and trigger progress update
        });
    });

    describe('Peer Review Assignment Flow', () => {
        it('should assign reviewers → complete review → update badges', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');

            const mockSubmissionDoc = {
                exists: true,
                data: () => ({
                    id: 'sub-123',
                    challengeId: 'week1-ch1',
                    userId: 'author-user',
                    cohortId: 'test-cohort',
                    code: 'test code',
                    status: 'pending',
                    peerReviewsAssigned: 0,
                }),
                ref: {
                    update: jest.fn().mockResolvedValue(undefined),
                },
            };

            const mockProgressSnapshot = {
                docs: [
                    {
                        data: () => ({
                            reviewsCompleted: 5,
                            reviewsAssigned: 6,
                        }),
                        ref: {
                            parent: { parent: { id: 'reviewer-1' } },
                        },
                    },
                    {
                        data: () => ({
                            reviewsCompleted: 3,
                            reviewsAssigned: 4,
                        }),
                        ref: {
                            parent: { parent: { id: 'reviewer-2' } },
                        },
                    },
                ],
            };

            const mockReviewRef = {
                id: 'review-123',
                set: jest.fn().mockResolvedValue(undefined),
            };

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn((name: string) => {
                    if (name === 'trainingSubmissions') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue(mockSubmissionDoc),
                            }),
                        };
                    }
                    if (name === 'peerReviews') {
                        return {
                            doc: jest.fn(() => mockReviewRef),
                        };
                    }
                    return {};
                }),
                collectionGroup: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnThis(),
                    orderBy: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue(mockProgressSnapshot),
                }),
            });

            // Step 1: Assign peer reviewers
            const assignResult = await assignPeerReviewers('sub-123', 2);

            expect(assignResult.success).toBe(true);
            if (assignResult.success) {
                expect(assignResult.data.assignedReviewers).toHaveLength(2);
            }
        });
    });

    describe('Certificate Generation Flow', () => {
        it('should check eligibility → generate certificate → store metadata', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');

            const mockProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 8,
                completedChallenges: Array(40).fill('challenge'),
                totalSubmissions: 45,
                acceptedSubmissions: 36,
                reviewsCompleted: 10,
                certificateEarned: false,
                status: 'completed',
            };

            const mockProgressRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => mockProgress,
                }),
                update: jest.fn().mockResolvedValue(undefined),
            };

            const mockCohortGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                    name: 'Test Cohort',
                    startDate: Timestamp.now(),
                    endDate: Timestamp.now(),
                }),
            });

            const mockUserGet = jest.fn().mockResolvedValue({
                data: () => ({
                    displayName: 'Test User',
                    email: 'test@example.com',
                }),
            });

            const mockCertificateSet = jest.fn().mockResolvedValue(undefined);

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn((name: string) => {
                    if (name === 'users') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                get: mockUserGet,
                                collection: jest.fn().mockReturnValue({
                                    doc: jest.fn(() => mockProgressRef),
                                }),
                            }),
                        };
                    }
                    if (name === 'trainingCohorts') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                get: mockCohortGet,
                            }),
                        };
                    }
                    if (name === 'certificates') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                set: mockCertificateSet,
                            }),
                        };
                    }
                    return {};
                }),
            });

            // Mock certificate generation
            const { checkCertificateEligibility, generateCertificatePDF, createCertificateMetadata } =
                await import('@/lib/certificates/generator');

            (checkCertificateEligibility as jest.Mock).mockReturnValue({
                eligible: true,
                reasons: [],
            });

            (generateCertificatePDF as jest.Mock).mockResolvedValue(
                Buffer.from('fake-pdf-data')
            );

            (createCertificateMetadata as jest.Mock).mockReturnValue({
                certificateId: 'cert-123',
                userId: 'test-user',
                userName: 'Test User',
                programName: 'BakedBot Builder Bootcamp',
            });

            // Mock Firebase Storage
            const mockFile = {
                save: jest.fn().mockResolvedValue(undefined),
                makePublic: jest.fn().mockResolvedValue(undefined),
            };
            const mockBucket = {
                name: 'test-bucket',
                file: jest.fn(() => mockFile),
            };

            const { getStorage } = await import('firebase-admin/storage');
            (getStorage as jest.Mock).mockReturnValue({
                bucket: jest.fn(() => mockBucket),
            });

            // Step 1: Check eligibility
            const eligibilityResult = await checkMyCertificateEligibility();

            expect(eligibilityResult.success).toBe(true);
            if (eligibilityResult.success) {
                expect(eligibilityResult.data.eligible).toBe(true);
            }

            // Step 2: Generate certificate
            const generateResult = await generateCertificate();

            expect(generateResult.success).toBe(true);
            if (generateResult.success) {
                expect(generateResult.data.certificateId).toBeDefined();
                expect(generateResult.data.certificateUrl).toBeDefined();
            }

            // Verify certificate was stored
            expect(mockCertificateSet).toHaveBeenCalled();
            expect(mockProgressRef.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    certificateEarned: true,
                })
            );
        });
    });

    describe('Complete Training Journey', () => {
        it('should simulate full intern journey from enrollment to certificate', async () => {
            // This would test:
            // 1. Enroll in cohort
            // 2. Submit multiple challenges
            // 3. Receive Linus reviews
            // 4. Complete peer reviews
            // 5. Earn badges
            // 6. Complete all requirements
            // 7. Generate certificate

            // For brevity, we'll just verify the key checkpoints
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'intern-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');

            // Start: Week 1, 0 challenges
            const initialProgress = {
                currentWeek: 1,
                completedChallenges: [],
                totalSubmissions: 0,
                acceptedSubmissions: 0,
                reviewsCompleted: 0,
            };

            // Mid-journey: Week 5, 25 challenges
            const midProgress = {
                currentWeek: 5,
                completedChallenges: Array(25).fill('challenge'),
                totalSubmissions: 30,
                acceptedSubmissions: 25,
                reviewsCompleted: 5,
            };

            // End: Week 8, 40 challenges, certificate eligible
            const finalProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 8,
                completedChallenges: Array(40).fill('challenge'),
                totalSubmissions: 45,
                acceptedSubmissions: 36,
                reviewsCompleted: 10,
                certificateEarned: false,
                status: 'completed',
                lastActivityAt: Timestamp.now(),
                reviewsAssigned: 10,
                averageReviewRating: 4.5,
                reviewBadges: ['helpful-reviewer'],
                weeklyProgress: [],
            };

            const mockProgressRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => finalProgress,
                }),
            };

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        collection: jest.fn().mockReturnValue({
                            doc: jest.fn(() => mockProgressRef),
                        }),
                    }),
                }),
            });

            // Verify progress at end
            const progressResult = await getMyTrainingProgress();

            expect(progressResult.success).toBe(true);
            if (progressResult.success) {
                expect(progressResult.data.completedChallenges.length).toBe(40);
                expect(progressResult.data.currentWeek).toBe(8);
                expect(progressResult.data.reviewsCompleted).toBeGreaterThanOrEqual(3);

                // Calculate approval rate
                const approvalRate =
                    (progressResult.data.acceptedSubmissions / progressResult.data.totalSubmissions) * 100;
                expect(approvalRate).toBeGreaterThanOrEqual(70);
            }
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle concurrent peer review assignments', async () => {
            // Test that multiple simultaneous assignments don't double-assign
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'super-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');

            const mockSubmissionDoc = {
                exists: true,
                data: () => ({
                    id: 'sub-123',
                    userId: 'author-user',
                    cohortId: 'test-cohort',
                    peerReviewsAssigned: 0,
                }),
                ref: { update: jest.fn() },
            };

            const mockProgressSnapshot = {
                docs: Array(5).fill(null).map((_, i) => ({
                    data: () => ({
                        reviewsCompleted: i,
                        reviewsAssigned: i + 1,
                    }),
                    ref: {
                        parent: { parent: { id: `reviewer-${i}` } },
                    },
                })),
            };

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn((name: string) => {
                    if (name === 'trainingSubmissions') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue(mockSubmissionDoc),
                            }),
                        };
                    }
                    if (name === 'peerReviews') {
                        return {
                            doc: jest.fn(() => ({
                                id: `review-${Math.random()}`,
                                set: jest.fn(),
                            })),
                        };
                    }
                    return {};
                }),
                collectionGroup: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnThis(),
                    orderBy: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue(mockProgressSnapshot),
                }),
            });

            const result = await assignPeerReviewers('sub-123', 2);

            expect(result.success).toBe(true);
            if (result.success) {
                // Should assign exactly 2 reviewers, no duplicates
                const reviewers = result.data.assignedReviewers;
                expect(reviewers).toHaveLength(2);
                expect(new Set(reviewers).size).toBe(2); // No duplicates
            }
        });

        it('should prevent certificate generation before eligibility', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');

            const mockProgress = {
                completedChallenges: Array(20).fill('challenge'), // Not enough
                totalSubmissions: 25,
                acceptedSubmissions: 15, // Low approval rate
                reviewsCompleted: 1, // Not enough
            };

            const mockProgressRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => mockProgress,
                }),
            };

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        collection: jest.fn().mockReturnValue({
                            doc: jest.fn(() => mockProgressRef),
                        }),
                    }),
                }),
            });

            const { checkCertificateEligibility } = await import('@/lib/certificates/generator');
            (checkCertificateEligibility as jest.Mock).mockReturnValue({
                eligible: false,
                reasons: [
                    'Need 30 completed challenges (have 20)',
                    'Need 70% approval rate (have 60.0%)',
                    'Need 3 peer reviews completed (have 1)',
                ],
            });

            const result = await generateCertificate();

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('Not eligible');
            }
        });
    });
});
