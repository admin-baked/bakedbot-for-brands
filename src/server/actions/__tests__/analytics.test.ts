/**
 * Analytics Server Actions - Unit Tests
 */

import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { UserTrainingProgress, TrainingSubmission } from '@/types/training';
import { Timestamp } from '@google-cloud/firestore';

// Mock dependencies.
// IMPORTANT: These mocks must be registered before importing `../analytics`, otherwise
// the actions will capture the real `requireUser()` which calls Next's `cookies()`.
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));

let getCohortAnalytics: typeof import('../analytics').getCohortAnalytics;
let getChallengeAnalytics: typeof import('../analytics').getChallengeAnalytics;
let getAtRiskInterns: typeof import('../analytics').getAtRiskInterns;

describe('Analytics Server Actions', () => {
    beforeAll(async () => {
        const mod = await import('../analytics');
        getCohortAnalytics = mod.getCohortAnalytics;
        getChallengeAnalytics = mod.getChallengeAnalytics;
        getAtRiskInterns = mod.getAtRiskInterns;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCohortAnalytics', () => {
        it('should calculate enrollment stats correctly', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'super-user' });

            const mockParticipants: (UserTrainingProgress & { userId: string })[] = [
                {
                    userId: 'user-1',
                    cohortId: 'test-cohort',
                    programId: 'test-program',
                    enrolledAt: Timestamp.now(),
                    currentWeek: 6,
                    completedChallenges: Array(30).fill('challenge'),
                    totalSubmissions: 35,
                    acceptedSubmissions: 28,
                    weeklyProgress: [],
                    certificateEarned: false,
                    lastActivityAt: Timestamp.now(),
                    status: 'active',
                    reviewsCompleted: 5,
                    reviewsAssigned: 6,
                    averageReviewRating: 4.5,
                    reviewBadges: [],
                },
                {
                    userId: 'user-2',
                    cohortId: 'test-cohort',
                    programId: 'test-program',
                    enrolledAt: Timestamp.now(),
                    currentWeek: 8,
                    completedChallenges: Array(40).fill('challenge'),
                    totalSubmissions: 45,
                    acceptedSubmissions: 40,
                    weeklyProgress: [],
                    certificateEarned: true,
                    lastActivityAt: Timestamp.now(),
                    status: 'completed',
                    reviewsCompleted: 10,
                    reviewsAssigned: 10,
                    averageReviewRating: 4.8,
                    reviewBadges: ['helpful-reviewer'],
                },
                {
                    userId: 'user-3',
                    cohortId: 'test-cohort',
                    programId: 'test-program',
                    enrolledAt: Timestamp.now(),
                    currentWeek: 3,
                    completedChallenges: Array(10).fill('challenge'),
                    totalSubmissions: 15,
                    acceptedSubmissions: 8,
                    weeklyProgress: [],
                    certificateEarned: false,
                    lastActivityAt: Timestamp.now(),
                    status: 'dropped',
                    reviewsCompleted: 1,
                    reviewsAssigned: 2,
                    averageReviewRating: 3.5,
                    reviewBadges: [],
                },
            ];

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockCohortGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ name: 'Test Cohort' }),
            });
            const mockProgressGet = jest.fn().mockResolvedValue({
                docs: mockParticipants.map(p => ({
                    data: () => p,
                    ref: {
                        parent: {
                            parent: { id: p.userId },
                        },
                    },
                })),
            });
            const mockSubmissionsGet = jest.fn().mockResolvedValue({ docs: [] });

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn((collectionName: string) => {
                    if (collectionName === 'trainingCohorts') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                get: mockCohortGet,
                            }),
                        };
                    }
                    if (collectionName === 'trainingSubmissions') {
                        return {
                            where: jest.fn().mockReturnValue({
                                get: mockSubmissionsGet,
                            }),
                        };
                    }
                    return {};
                }),
                collectionGroup: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        get: mockProgressGet,
                    }),
                }),
            });

            const result = await getCohortAnalytics('test-cohort');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.totalInterns).toBe(3);
                expect(result.data.activeInterns).toBe(1);
                expect(result.data.completedInterns).toBe(1);
                expect(result.data.droppedInterns).toBe(1);
            }
        });

        it('should calculate average week correctly', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'super-user' });

            const mockParticipants: (UserTrainingProgress & { userId: string })[] = [
                { currentWeek: 2 } as any,
                { currentWeek: 4 } as any,
                { currentWeek: 6 } as any,
            ];

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockCohortGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ name: 'Test Cohort' }),
            });
            const mockProgressGet = jest.fn().mockResolvedValue({
                docs: mockParticipants.map(p => ({
                    data: () => ({
                        ...p,
                        cohortId: 'test-cohort',
                        completedChallenges: [],
                        totalSubmissions: 0,
                        acceptedSubmissions: 0,
                        reviewsCompleted: 0,
                    }),
                    ref: {
                        parent: {
                            parent: { id: 'user-1' },
                        },
                    },
                })),
            });

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn((collectionName: string) => {
                    if (collectionName === 'trainingCohorts') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                get: mockCohortGet,
                            }),
                        };
                    }
                    if (collectionName === 'trainingSubmissions') {
                        return {
                            where: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue({ docs: [] }),
                            }),
                        };
                    }
                    return {};
                }),
                collectionGroup: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        get: mockProgressGet,
                    }),
                }),
            });

            const result = await getCohortAnalytics('test-cohort');

            expect(result.success).toBe(true);
            if (result.success) {
                // Average of 2, 4, 6 is 4.0
                expect(result.data.averageWeek).toBe(4.0);
            }
        });

        it('should reject if cohort not found', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'super-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockCohortGet = jest.fn().mockResolvedValue({ exists: false });

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        get: mockCohortGet,
                    }),
                }),
            });

            const result = await getCohortAnalytics('invalid-cohort');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('not found');
            }
        });
    });

    describe('getChallengeAnalytics', () => {
        it('should calculate participation stats correctly', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'super-user' });

            const mockSubmissions: TrainingSubmission[] = [
                {
                    id: 'sub-1',
                    challengeId: 'test-challenge',
                    userId: 'user-1',
                    cohortId: 'test-cohort',
                    code: 'code',
                    language: 'typescript',
                    status: 'approved',
                    attemptNumber: 1,
                    submittedAt: Timestamp.now(),
                    linusFeedback: {
                        overallScore: 85,
                        approved: true,
                        summary: 'Good',
                        strengths: [],
                        improvements: [],
                        categoryScores: [],
                    },
                },
                {
                    id: 'sub-2',
                    challengeId: 'test-challenge',
                    userId: 'user-2',
                    cohortId: 'test-cohort',
                    code: 'code',
                    language: 'typescript',
                    status: 'needs_revision',
                    attemptNumber: 1,
                    submittedAt: Timestamp.now(),
                    linusFeedback: {
                        overallScore: 60,
                        approved: false,
                        summary: 'Needs work',
                        strengths: [],
                        improvements: ['Fix types'],
                        categoryScores: [],
                    },
                },
                {
                    id: 'sub-3',
                    challengeId: 'test-challenge',
                    userId: 'user-2',
                    cohortId: 'test-cohort',
                    code: 'code',
                    language: 'typescript',
                    status: 'approved',
                    attemptNumber: 2,
                    submittedAt: Timestamp.now(),
                },
            ];

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockChallengeGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                    title: 'Test Challenge',
                    weekNumber: 1,
                }),
            });
            const mockSubmissionsGet = jest.fn().mockResolvedValue({
                docs: mockSubmissions.map(s => ({
                    data: () => s,
                })),
            });

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn((collectionName: string) => {
                    if (collectionName === 'trainingChallenges') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                get: mockChallengeGet,
                            }),
                        };
                    }
                    if (collectionName === 'trainingSubmissions') {
                        return {
                            where: jest.fn().mockReturnValue({
                                get: mockSubmissionsGet,
                            }),
                        };
                    }
                    return {};
                }),
            });

            const result = await getChallengeAnalytics('test-challenge');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.totalAttempts).toBe(3);
                expect(result.data.uniqueAttemptors).toBe(2);
                expect(result.data.completionRate).toBe(100); // Both users approved
                expect(result.data.passRateFirstAttempt).toBe(50); // 1/2 approved on first try
            }
        });

        it('should calculate average attempts correctly', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'super-user' });

            const mockSubmissions: TrainingSubmission[] = [
                { userId: 'user-1', attemptNumber: 1 } as any,
                { userId: 'user-2', attemptNumber: 1 } as any,
                { userId: 'user-2', attemptNumber: 2 } as any,
                { userId: 'user-2', attemptNumber: 3 } as any,
                { userId: 'user-3', attemptNumber: 1 } as any,
                { userId: 'user-3', attemptNumber: 2 } as any,
            ];

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockChallengeGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ title: 'Test', weekNumber: 1 }),
            });
            const mockSubmissionsGet = jest.fn().mockResolvedValue({
                docs: mockSubmissions.map(s => ({ data: () => s })),
            });

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn((collectionName: string) => {
                    if (collectionName === 'trainingChallenges') {
                        return {
                            doc: jest.fn().mockReturnValue({
                                get: mockChallengeGet,
                            }),
                        };
                    }
                    if (collectionName === 'trainingSubmissions') {
                        return {
                            where: jest.fn().mockReturnValue({
                                get: mockSubmissionsGet,
                            }),
                        };
                    }
                    return {};
                }),
            });

            const result = await getChallengeAnalytics('test-challenge');

            expect(result.success).toBe(true);
            if (result.success) {
                // user-1: 1 attempt, user-2: 3 attempts, user-3: 2 attempts
                // Average: (1 + 3 + 2) / 3 = 2.0
                expect(result.data.averageAttempts).toBe(2.0);
            }
        });
    });

    describe('getAtRiskInterns', () => {
        it('should detect interns behind schedule', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'super-user' });

            const now = Date.now();
            const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);

            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.fromMillis(twoWeeksAgo),
                currentWeek: 1, // Should be at week 3 (75% of 2 weeks)
                completedChallenges: Array(5).fill('challenge'),
                totalSubmissions: 10,
                acceptedSubmissions: 7,
                weeklyProgress: [],
                certificateEarned: false,
                lastActivityAt: Timestamp.now(),
                status: 'active',
                reviewsCompleted: 2,
                reviewsAssigned: 3,
                averageReviewRating: 4.0,
                reviewBadges: [],
            };

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockProgressGet = jest.fn().mockResolvedValue({
                docs: [
                    {
                        data: () => mockProgress,
                        ref: {
                            parent: {
                                parent: { id: 'user-1' },
                            },
                        },
                    },
                ],
            });
            const mockUserGet = jest.fn().mockResolvedValue({
                data: () => ({
                    displayName: 'Test User',
                    email: 'test@example.com',
                }),
            });

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        get: mockUserGet,
                    }),
                }),
                collectionGroup: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnThis(),
                    get: mockProgressGet,
                }),
            });

            const result = await getAtRiskInterns('test-cohort');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.length).toBeGreaterThan(0);
                expect(result.data[0].riskFactors).toContain('Behind schedule');
            }
        });

        it('should detect inactive interns', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'super-user' });

            const now = Date.now();
            const tenDaysAgo = now - (10 * 24 * 60 * 60 * 1000);

            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 4,
                completedChallenges: Array(20).fill('challenge'),
                totalSubmissions: 25,
                acceptedSubmissions: 20,
                weeklyProgress: [],
                certificateEarned: false,
                lastActivityAt: Timestamp.fromMillis(tenDaysAgo),
                status: 'active',
                reviewsCompleted: 3,
                reviewsAssigned: 4,
                averageReviewRating: 4.2,
                reviewBadges: [],
            };

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockProgressGet = jest.fn().mockResolvedValue({
                docs: [
                    {
                        data: () => mockProgress,
                        ref: {
                            parent: {
                                parent: { id: 'user-1' },
                            },
                        },
                    },
                ],
            });
            const mockUserGet = jest.fn().mockResolvedValue({
                data: () => ({ displayName: 'Inactive User' }),
            });

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        get: mockUserGet,
                    }),
                }),
                collectionGroup: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnThis(),
                    get: mockProgressGet,
                }),
            });

            const result = await getAtRiskInterns('test-cohort');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.length).toBeGreaterThan(0);
                expect(result.data[0].riskFactors).toContain('Inactive for 7+ days');
            }
        });

        it('should detect low approval rate', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'super-user' });

            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 5,
                completedChallenges: Array(15).fill('challenge'),
                totalSubmissions: 30,
                acceptedSubmissions: 10, // 33% approval rate (< 50%)
                weeklyProgress: [],
                certificateEarned: false,
                lastActivityAt: Timestamp.now(),
                status: 'active',
                reviewsCompleted: 5,
                reviewsAssigned: 5,
                averageReviewRating: 4.0,
                reviewBadges: [],
            };

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockProgressGet = jest.fn().mockResolvedValue({
                docs: [
                    {
                        data: () => mockProgress,
                        ref: {
                            parent: {
                                parent: { id: 'user-1' },
                            },
                        },
                    },
                ],
            });
            const mockUserGet = jest.fn().mockResolvedValue({
                data: () => ({ displayName: 'Struggling User' }),
            });

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        get: mockUserGet,
                    }),
                }),
                collectionGroup: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnThis(),
                    get: mockProgressGet,
                }),
            });

            const result = await getAtRiskInterns('test-cohort');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.length).toBeGreaterThan(0);
                expect(result.data[0].riskFactors).toContain('Low approval rate');
            }
        });

        it('should sort by number of risk factors', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'super-user' });

            const now = Date.now();
            const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
            const tenDaysAgo = now - (10 * 24 * 60 * 60 * 1000);

            const mockProgressDocs = [
                // User with 2 risk factors
                {
                    data: () => ({
                        cohortId: 'test-cohort',
                        enrolledAt: Timestamp.fromMillis(twoWeeksAgo),
                        currentWeek: 1, // Behind schedule
                        completedChallenges: [],
                        totalSubmissions: 0,
                        acceptedSubmissions: 0,
                        lastActivityAt: Timestamp.fromMillis(tenDaysAgo), // Inactive
                        status: 'active',
                        reviewsCompleted: 0,
                        reviewsAssigned: 0,
                    }),
                    ref: { parent: { parent: { id: 'user-1' } } },
                },
                // User with 1 risk factor
                {
                    data: () => ({
                        cohortId: 'test-cohort',
                        enrolledAt: Timestamp.now(),
                        currentWeek: 1,
                        completedChallenges: [],
                        totalSubmissions: 0,
                        acceptedSubmissions: 0,
                        lastActivityAt: Timestamp.fromMillis(tenDaysAgo), // Only inactive
                        status: 'active',
                        reviewsCompleted: 0,
                        reviewsAssigned: 0,
                    }),
                    ref: { parent: { parent: { id: 'user-2' } } },
                },
            ];

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockProgressGet = jest.fn().mockResolvedValue({
                docs: mockProgressDocs,
            });
            const mockUserGet = jest.fn().mockResolvedValue({
                data: () => ({ displayName: 'Test User' }),
            });

            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        get: mockUserGet,
                    }),
                }),
                collectionGroup: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnThis(),
                    get: mockProgressGet,
                }),
            });

            const result = await getAtRiskInterns('test-cohort');

            expect(result.success).toBe(true);
            if (result.success && result.data.length >= 2) {
                // First user should have more risk factors
                expect(result.data[0].riskFactors.length).toBeGreaterThan(result.data[1].riskFactors.length);
            }
        });
    });
});
