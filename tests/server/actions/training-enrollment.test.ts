/**
 * Training Enrollment Unit Tests
 *
 * Tests for auto-enrollment functionality including role assignment,
 * cohort creation, and progress initialization.
 */

import { Timestamp } from '@google-cloud/firestore';

// Mock Firebase Admin Auth
const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);
const mockGetUser = jest.fn().mockResolvedValue({
    uid: 'test-user-123',
    email: 'student@example.com',
    emailVerified: true,
});

jest.mock('firebase-admin/auth', () => ({
    getAuth: jest.fn(() => ({
        setCustomUserClaims: mockSetCustomUserClaims,
        getUser: mockGetUser,
    })),
}));

// Mock Firestore
const mockCohortSet = jest.fn().mockResolvedValue(undefined);
const mockCohortUpdate = jest.fn().mockResolvedValue(undefined);
const mockCohortGet = jest.fn();
const mockProgressSet = jest.fn().mockResolvedValue(undefined);

const mockCohortDoc = {
    id: 'cohort-123',
    ref: {
        update: mockCohortUpdate,
    },
    data: jest.fn(() => ({
        id: 'cohort-123',
        name: 'Cohort Feb 2026',
        programId: 'bakedbot-builder-bootcamp-v1',
        startDate: Timestamp.now(),
        endDate: Timestamp.fromMillis(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000),
        participantIds: [],
        maxParticipants: 50,
        status: 'active',
        enablePeerReview: false,
        minReviewsRequired: 3,
        reviewersPerSubmission: 2,
        reviewDeadlineHours: 48,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    })),
};

const mockEmptyCohortsSnapshot = {
    docs: [],
};

const mockActiveCohortsSnapshot = {
    docs: [mockCohortDoc],
};

const mockFullCohortDoc = {
    ...mockCohortDoc,
    data: jest.fn(() => ({
        ...mockCohortDoc.data(),
        participantIds: Array(50).fill('user-id'), // Full cohort
    })),
};

const mockFullCohortsSnapshot = {
    docs: [mockFullCohortDoc],
};

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn((collectionName: string) => ({
            doc: jest.fn((docId?: string) => {
                if (collectionName === 'trainingCohorts') {
                    return {
                        id: docId || 'new-cohort-id',
                        set: mockCohortSet,
                        get: mockCohortGet.mockResolvedValue(mockCohortDoc),
                    };
                }
                // For users/{userId}/training/current
                return {
                    collection: jest.fn(() => ({
                        doc: jest.fn(() => ({
                            set: mockProgressSet,
                        })),
                    })),
                };
            }),
            where: jest.fn(() => ({
                orderBy: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue(mockActiveCohortsSnapshot),
                    })),
                })),
            })),
        })),
    })),
}));

// Mock auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'super-user-123',
        role: 'super_user',
    }),
}));

// Mock Next.js cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import { selfEnrollInTraining, enrollInCohort } from '@/server/actions/training';
import { logger } from '@/lib/logger';

describe('Training Enrollment', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('selfEnrollInTraining', () => {
        it('should enroll a new user and set intern role', async () => {
            const result = await selfEnrollInTraining('test-user-123');

            expect(result.success).toBe(true);
            expect(result.data?.cohortId).toBe('cohort-123');

            // Verify role was set
            expect(mockSetCustomUserClaims).toHaveBeenCalledWith(
                'test-user-123',
                expect.objectContaining({
                    role: 'intern',
                    enrollmentDate: expect.any(String),
                })
            );

            // Verify user was added to cohort
            expect(mockCohortUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    participantIds: expect.arrayContaining(['test-user-123']),
                })
            );

            // Verify progress was initialized
            expect(mockProgressSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    cohortId: 'cohort-123',
                    programId: 'bakedbot-builder-bootcamp-v1',
                    currentWeek: 1,
                    completedChallenges: [],
                    status: 'active',
                })
            );
        });

        it('should create a new cohort if none exist', async () => {
            // Temporarily mock empty cohorts response
            const originalMock = require('@/firebase/admin').getAdminFirestore;
            const { getAdminFirestore } = require('@/firebase/admin');

            (getAdminFirestore as jest.Mock).mockImplementationOnce(() => ({
                collection: jest.fn(() => ({
                    doc: jest.fn((docId?: string) => ({
                        id: docId || 'new-cohort-id',
                        set: mockCohortSet,
                        get: jest.fn().mockResolvedValue({
                            ...mockCohortDoc,
                            id: 'new-cohort-id',
                        }),
                        collection: jest.fn(() => ({
                            doc: jest.fn(() => ({
                                set: mockProgressSet,
                            })),
                        })),
                    })),
                    where: jest.fn(() => ({
                        orderBy: jest.fn(() => ({
                            limit: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue(mockEmptyCohortsSnapshot),
                            })),
                        })),
                    })),
                })),
            }));

            const result = await selfEnrollInTraining('test-user-123');

            expect(result.success).toBe(true);
            expect(mockCohortSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    programId: 'bakedbot-builder-bootcamp-v1',
                    status: 'active',
                    maxParticipants: 50,
                    participantIds: [],
                })
            );
            expect(logger.info).toHaveBeenCalledWith(
                '[Training] Created default cohort',
                expect.any(Object)
            );
        });

        it('should create a new cohort if all existing cohorts are full', async () => {
            // Temporarily mock full cohorts response
            const { getAdminFirestore } = require('@/firebase/admin');

            (getAdminFirestore as jest.Mock).mockImplementationOnce(() => ({
                collection: jest.fn(() => ({
                    doc: jest.fn((docId?: string) => ({
                        id: docId || 'new-cohort-id',
                        set: mockCohortSet,
                        get: jest.fn().mockResolvedValue({
                            ...mockCohortDoc,
                            id: 'new-cohort-id',
                        }),
                        collection: jest.fn(() => ({
                            doc: jest.fn(() => ({
                                set: mockProgressSet,
                            })),
                        })),
                    })),
                    where: jest.fn(() => ({
                        orderBy: jest.fn(() => ({
                            limit: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue(mockFullCohortsSnapshot),
                            })),
                        })),
                    })),
                })),
            }));

            const result = await selfEnrollInTraining('test-user-123');

            expect(result.success).toBe(true);
            expect(mockCohortSet).toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                '[Training] No active cohort with space, creating default cohort'
            );
        });

        it('should handle user not found error', async () => {
            mockGetUser.mockRejectedValueOnce(new Error('User not found'));

            const result = await selfEnrollInTraining('invalid-user');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(logger.error).toHaveBeenCalledWith(
                '[Training] Self-enrollment failed',
                expect.any(Object)
            );
        });

        it('should handle Firestore errors gracefully', async () => {
            mockCohortUpdate.mockRejectedValueOnce(new Error('Firestore error'));

            const result = await selfEnrollInTraining('test-user-123');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Firestore error');
            expect(logger.error).toHaveBeenCalled();
        });

        it('should log all enrollment steps', async () => {
            await selfEnrollInTraining('test-user-123');

            expect(logger.info).toHaveBeenCalledWith(
                '[Training] Self-enrollment started',
                expect.objectContaining({
                    userId: 'test-user-123',
                    email: 'student@example.com',
                })
            );

            expect(logger.info).toHaveBeenCalledWith(
                '[Training] Intern role set',
                expect.objectContaining({ userId: 'test-user-123' })
            );

            expect(logger.info).toHaveBeenCalledWith(
                '[Training] Self-enrollment completed',
                expect.objectContaining({
                    userId: 'test-user-123',
                    cohortId: 'cohort-123',
                })
            );
        });

        it('should initialize progress with correct defaults', async () => {
            await selfEnrollInTraining('test-user-123');

            expect(mockProgressSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    cohortId: 'cohort-123',
                    programId: 'bakedbot-builder-bootcamp-v1',
                    currentWeek: 1,
                    completedChallenges: [],
                    totalSubmissions: 0,
                    acceptedSubmissions: 0,
                    weeklyProgress: [],
                    certificateEarned: false,
                    status: 'active',
                    reviewsCompleted: 0,
                    reviewsAssigned: 0,
                    averageReviewRating: 0,
                    reviewBadges: [],
                })
            );
        });
    });

    describe('enrollInCohort (Admin)', () => {
        it('should allow super users to enroll others', async () => {
            const mockCohortDocForEnroll = {
                exists: true,
                id: 'cohort-123',
                ref: {
                    update: mockCohortUpdate,
                },
                data: jest.fn(() => ({
                    id: 'cohort-123',
                    participantIds: ['existing-user'],
                    maxParticipants: 50,
                    programId: 'bakedbot-builder-bootcamp-v1',
                })),
            };

            const { getAdminFirestore } = require('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockImplementationOnce(() => ({
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue(mockCohortDocForEnroll),
                        ref: mockCohortDocForEnroll.ref,
                        collection: jest.fn(() => ({
                            doc: jest.fn(() => ({
                                set: mockProgressSet,
                            })),
                        })),
                    })),
                })),
            }));

            const result = await enrollInCohort('new-user-123', 'cohort-123');

            expect(result.success).toBe(true);
            expect(mockCohortUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    participantIds: expect.arrayContaining(['existing-user', 'new-user-123']),
                })
            );
        });

        it('should reject enrollment when cohort is full', async () => {
            const mockFullCohortDocForEnroll = {
                exists: true,
                id: 'cohort-123',
                data: jest.fn(() => ({
                    id: 'cohort-123',
                    participantIds: Array(50).fill('user'),
                    maxParticipants: 50,
                })),
            };

            const { getAdminFirestore } = require('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockImplementationOnce(() => ({
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue(mockFullCohortDocForEnroll),
                    })),
                })),
            }));

            const result = await enrollInCohort('new-user-123', 'cohort-123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Cohort is full');
        });

        it('should reject enrollment when cohort not found', async () => {
            const { getAdminFirestore } = require('@/firebase/admin');
            (getAdminFirestore as jest.Mock).mockImplementationOnce(() => ({
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ exists: false }),
                    })),
                })),
            }));

            const result = await enrollInCohort('new-user-123', 'invalid-cohort');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Cohort not found');
        });
    });
});
