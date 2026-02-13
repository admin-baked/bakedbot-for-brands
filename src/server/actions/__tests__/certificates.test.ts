/**
 * Certificate Server Actions - Unit Tests
 */

import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { UserTrainingProgress, CertificateMetadata } from '@/types/training';
import { Timestamp } from '@google-cloud/firestore';

// Mock dependencies
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));
jest.mock('firebase-admin/storage', () => ({
    getStorage: jest.fn(),
}));
jest.mock('@/lib/certificates/generator', () => ({
    generateCertificatePDF: jest.fn(),
    checkCertificateEligibility: jest.fn(),
    createCertificateMetadata: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));

let generateCertificate: typeof import('../certificates').generateCertificate;
let verifyCertificate: typeof import('../certificates').verifyCertificate;
let checkMyCertificateEligibility: typeof import('../certificates').checkMyCertificateEligibility;
let getMyCertificate: typeof import('../certificates').getMyCertificate;

describe('Certificate Server Actions', () => {
    beforeAll(async () => {
        const mod = await import('../certificates');
        generateCertificate = mod.generateCertificate;
        verifyCertificate = mod.verifyCertificate;
        checkMyCertificateEligibility = mod.checkMyCertificateEligibility;
        getMyCertificate = mod.getMyCertificate;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateCertificate', () => {
        it('should return existing certificate if already earned', async () => {
            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 8,
                completedChallenges: Array(40).fill('challenge'),
                totalSubmissions: 40,
                acceptedSubmissions: 35,
                weeklyProgress: [],
                certificateEarned: true,
                certificateUrl: 'https://storage.googleapis.com/bucket/cert-123.pdf',
                lastActivityAt: Timestamp.now(),
                status: 'completed',
                reviewsCompleted: 10,
                reviewsAssigned: 10,
                averageReviewRating: 4.5,
                reviewBadges: [],
            };

            // Mock requireUser to return valid user
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            // Mock Firestore to return progress with certificate
            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => mockProgress,
            });
            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        collection: jest.fn().mockReturnValue({
                            doc: jest.fn().mockReturnValue({
                                get: mockGet,
                            }),
                        }),
                    }),
                }),
            });

            const result = await generateCertificate();

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.certificateUrl).toBe(mockProgress.certificateUrl);
            }
        });

        it('should reject if not enrolled', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockGet = jest.fn().mockResolvedValue({ exists: false });
            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        collection: jest.fn().mockReturnValue({
                            doc: jest.fn().mockReturnValue({
                                get: mockGet,
                            }),
                        }),
                    }),
                }),
            });

            const result = await generateCertificate();

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('not enrolled');
            }
        });

        it('should reject if not eligible', async () => {
            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 4,
                completedChallenges: Array(15).fill('challenge'), // Not enough
                totalSubmissions: 20,
                acceptedSubmissions: 10, // Low approval rate
                weeklyProgress: [],
                certificateEarned: false,
                lastActivityAt: Timestamp.now(),
                status: 'active',
                reviewsCompleted: 1, // Not enough
                reviewsAssigned: 2,
                averageReviewRating: 4.0,
                reviewBadges: [],
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => mockProgress,
            });
            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        collection: jest.fn().mockReturnValue({
                            doc: jest.fn().mockReturnValue({
                                get: mockGet,
                            }),
                        }),
                    }),
                }),
            });

            // Mock checkCertificateEligibility
            const { checkCertificateEligibility } = await import('@/lib/certificates/generator');
            (checkCertificateEligibility as jest.Mock).mockReturnValue({
                eligible: false,
                reasons: [
                    'Need 30 completed challenges (have 15)',
                    'Need 70% approval rate (have 50.0%)',
                    'Need 3 peer reviews completed (have 1)',
                ],
            });

            const result = await generateCertificate();

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('Not eligible');
            }
        });

        it('should allow super_user to generate for any user', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({
                uid: 'admin-user',
                role: ['super_user'],
            });

            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 8,
                completedChallenges: Array(40).fill('challenge'),
                totalSubmissions: 40,
                acceptedSubmissions: 35,
                weeklyProgress: [],
                certificateEarned: true,
                certificateUrl: 'https://storage.googleapis.com/bucket/cert-other.pdf',
                lastActivityAt: Timestamp.now(),
                status: 'completed',
                reviewsCompleted: 10,
                reviewsAssigned: 10,
                averageReviewRating: 4.5,
                reviewBadges: [],
            };

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => mockProgress,
            });
            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        collection: jest.fn().mockReturnValue({
                            doc: jest.fn().mockReturnValue({
                                get: mockGet,
                            }),
                        }),
                    }),
                }),
            });

            const result = await generateCertificate('other-user');

            expect(result.success).toBe(true);
        });
    });

    describe('verifyCertificate', () => {
        it('should verify valid certificate', async () => {
            const mockCertificate: CertificateMetadata = {
                certificateId: 'cert-123',
                userId: 'test-user',
                userName: 'Test User',
                userEmail: 'test@example.com',
                programName: 'BakedBot Builder Bootcamp',
                cohortName: 'Summer 2024',
                issueDate: new Date('2024-08-01'),
                completedChallenges: 40,
                approvalRate: 87.5,
                reviewsCompleted: 15,
                skillsEarned: ['TypeScript', 'React', 'Firestore'],
                verificationUrl: 'https://bakedbot.ai/verify/cert-123',
            };

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                    ...mockCertificate,
                    issueDate: Timestamp.fromDate(mockCertificate.issueDate),
                }),
            });
            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        get: mockGet,
                    }),
                }),
            });

            const result = await verifyCertificate('cert-123');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.certificateId).toBe('cert-123');
                expect(result.data.userName).toBe('Test User');
            }
        });

        it('should reject invalid certificate ID', async () => {
            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockGet = jest.fn().mockResolvedValue({ exists: false });
            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        get: mockGet,
                    }),
                }),
            });

            const result = await verifyCertificate('invalid-id');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('not found');
            }
        });
    });

    describe('checkMyCertificateEligibility', () => {
        it('should return eligible status with progress', async () => {
            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 8,
                completedChallenges: Array(35).fill('challenge'),
                totalSubmissions: 40,
                acceptedSubmissions: 32,
                weeklyProgress: [],
                certificateEarned: false,
                lastActivityAt: Timestamp.now(),
                status: 'active',
                reviewsCompleted: 5,
                reviewsAssigned: 5,
                averageReviewRating: 4.2,
                reviewBadges: [],
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => mockProgress,
            });
            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        collection: jest.fn().mockReturnValue({
                            doc: jest.fn().mockReturnValue({
                                get: mockGet,
                            }),
                        }),
                    }),
                }),
            });

            const { checkCertificateEligibility } = await import('@/lib/certificates/generator');
            (checkCertificateEligibility as jest.Mock).mockReturnValue({
                eligible: true,
                reasons: [],
            });

            const result = await checkMyCertificateEligibility();

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.eligible).toBe(true);
                expect(result.data.progress.completedChallenges).toBe(35);
                expect(result.data.progress.approvalRate).toBe(80);
                expect(result.data.progress.reviewsCompleted).toBe(5);
            }
        });

        it('should calculate approval rate correctly', async () => {
            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 6,
                completedChallenges: Array(25).fill('challenge'),
                totalSubmissions: 30,
                acceptedSubmissions: 21, // 70% approval
                weeklyProgress: [],
                certificateEarned: false,
                lastActivityAt: Timestamp.now(),
                status: 'active',
                reviewsCompleted: 3,
                reviewsAssigned: 4,
                averageReviewRating: 4.0,
                reviewBadges: [],
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => mockProgress,
            });
            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        collection: jest.fn().mockReturnValue({
                            doc: jest.fn().mockReturnValue({
                                get: mockGet,
                            }),
                        }),
                    }),
                }),
            });

            const { checkCertificateEligibility } = await import('@/lib/certificates/generator');
            (checkCertificateEligibility as jest.Mock).mockReturnValue({
                eligible: false,
                reasons: ['Need 30 completed challenges (have 25)'],
            });

            const result = await checkMyCertificateEligibility();

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.progress.approvalRate).toBe(70);
            }
        });
    });

    describe('getMyCertificate', () => {
        it('should return certificate if earned', async () => {
            const certificateUrl = 'https://storage.googleapis.com/bucket/certs/user-123/cert-456.pdf';
            const issuedAt = Timestamp.now();

            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 8,
                completedChallenges: Array(40).fill('challenge'),
                totalSubmissions: 40,
                acceptedSubmissions: 36,
                weeklyProgress: [],
                certificateEarned: true,
                certificateUrl,
                certificateIssuedAt: issuedAt,
                lastActivityAt: Timestamp.now(),
                status: 'completed',
                reviewsCompleted: 10,
                reviewsAssigned: 10,
                averageReviewRating: 4.7,
                reviewBadges: ['helpful-reviewer'],
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => mockProgress,
            });
            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        collection: jest.fn().mockReturnValue({
                            doc: jest.fn().mockReturnValue({
                                get: mockGet,
                            }),
                        }),
                    }),
                }),
            });

            const result = await getMyCertificate();

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.certificateUrl).toBe(certificateUrl);
                expect(result.data.certificateId).toBe('cert-456');
            }
        });

        it('should reject if certificate not earned', async () => {
            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 5,
                completedChallenges: Array(20).fill('challenge'),
                totalSubmissions: 25,
                acceptedSubmissions: 18,
                weeklyProgress: [],
                certificateEarned: false,
                lastActivityAt: Timestamp.now(),
                status: 'active',
                reviewsCompleted: 2,
                reviewsAssigned: 3,
                averageReviewRating: 4.0,
                reviewBadges: [],
            };

            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });

            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => mockProgress,
            });
            (getAdminFirestore as jest.Mock).mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        collection: jest.fn().mockReturnValue({
                            doc: jest.fn().mockReturnValue({
                                get: mockGet,
                            }),
                        }),
                    }),
                }),
            });

            const result = await getMyCertificate();

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('not yet earned');
            }
        });
    });
});
