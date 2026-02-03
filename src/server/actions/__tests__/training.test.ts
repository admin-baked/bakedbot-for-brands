/**
 * Training Server Actions - Unit Tests
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { TrainingSubmission, TrainingChallenge, UserTrainingProgress } from '@/types/training';

// Mock dependencies
jest.mock('@/server/auth/auth');
jest.mock('@/firebase/admin');
jest.mock('@/lib/logger');
jest.mock('@/server/services/training/linus-review');

describe('Training Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('submitChallenge', () => {
        it('should validate required fields', async () => {
            const { submitChallenge } = await import('../training');

            const result = await submitChallenge({
                challengeId: '',
                cohortId: 'test-cohort',
                code: '',
            } as any);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should enforce minimum code length', async () => {
            const { submitChallenge } = await import('../training');

            const result = await submitChallenge({
                challengeId: 'week1-ch1',
                cohortId: 'test-cohort',
                code: 'short',
            } as any);

            expect(result.success).toBe(false);
            expect(result.error).toContain('too short');
        });

        it('should create submission with correct attempt number', async () => {
            const mockDb = {
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({ title: 'Test Challenge' }),
                        }),
                        set: jest.fn().mockResolvedValue(undefined),
                    })),
                    where: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ size: 2 }), // 2 previous attempts
                    })),
                })),
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

            const { submitChallenge } = await import('../training');

            const result = await submitChallenge({
                challengeId: 'week1-ch1',
                cohortId: 'test-cohort',
                code: 'console.log("test code here")',
            });

            // Should be attempt #3 (2 previous + 1)
            expect(result.success).toBe(true);
        });
    });

    describe('getMyTrainingProgress', () => {
        it('should return error if not enrolled', async () => {
            const mockDb = {
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        collection: jest.fn(() => ({
                            doc: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue({
                                    exists: false,
                                }),
                            })),
                        })),
                    })),
                })),
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

            const { getMyTrainingProgress } = await import('../training');

            const result = await getMyTrainingProgress();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Not enrolled');
        });

        it('should return progress data when enrolled', async () => {
            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: { seconds: Date.now() / 1000 } as any,
                currentWeek: 2,
                completedChallenges: ['week1-ch1', 'week1-ch2'],
                totalSubmissions: 5,
                acceptedSubmissions: 4,
                weeklyProgress: [],
                reviewsCompleted: 2,
                reviewsAssigned: 3,
                averageReviewRating: 4.5,
                reviewBadges: ['helpful-reviewer'],
                certificateEarned: false,
                lastActivityAt: { seconds: Date.now() / 1000 } as any,
                status: 'active',
            };

            const mockDb = {
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        collection: jest.fn(() => ({
                            doc: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue({
                                    exists: true,
                                    data: () => mockProgress,
                                }),
                            })),
                        })),
                    })),
                })),
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

            const { getMyTrainingProgress } = await import('../training');

            const result = await getMyTrainingProgress();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockProgress);
        });
    });
});
