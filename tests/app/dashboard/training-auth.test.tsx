/**
 * Training Page Auth Error Handling Tests
 *
 * Tests for graceful redirect behavior when auth fails on training pages.
 */

import { redirect } from 'next/navigation';

// Mock Next.js redirect
jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
}));

// Mock Firebase Admin
const mockTrainingProgramDoc = {
    exists: true,
    data: () => ({
        id: 'bakedbot-builder-bootcamp-v1',
        name: 'BakedBot Builder Bootcamp',
        durationWeeks: 8,
        curriculum: [
            { weekNumber: 1, title: 'Foundations', challengeIds: [] },
            { weekNumber: 2, title: 'Firestore', challengeIds: [] },
        ],
    }),
};

const mockProgressDoc = {
    exists: true,
    data: () => ({
        cohortId: 'cohort-123',
        programId: 'bakedbot-builder-bootcamp-v1',
        currentWeek: 1,
        completedChallenges: [],
    }),
};

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn().mockResolvedValue(mockTrainingProgramDoc),
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue(mockProgressDoc),
                    })),
                })),
            })),
        })),
    })),
}));

// Mock auth - will be overridden per test
const mockRequireUser = jest.fn();
jest.mock('@/server/auth/auth', () => ({
    requireUser: mockRequireUser,
}));

// Mock TrainingPageClient component
jest.mock('@/app/dashboard/training/page-client', () => ({
    TrainingPageClient: () => <div data-testid="training-client">Training Content</div>,
}));

describe('Training Page Auth Error Handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Main Training Page', () => {
        it('should redirect to /customer-login when user is not authenticated', async () => {
            mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized: No session cookie found.'));

            // Dynamic import to execute the page component
            const TrainingPage = (await import('@/app/dashboard/training/page')).default;
            await TrainingPage();

            expect(redirect).toHaveBeenCalledWith('/customer-login');
        });

        it('should redirect to /customer-login when user lacks required role', async () => {
            mockRequireUser.mockRejectedValueOnce(new Error('Forbidden: You do not have the required permissions.'));

            const TrainingPage = (await import('@/app/dashboard/training/page')).default;
            await TrainingPage();

            expect(redirect).toHaveBeenCalledWith('/customer-login');
        });

        it('should render normally when user has intern role', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'user-123',
                email: 'student@example.com',
                role: 'intern',
            });

            const TrainingPage = (await import('@/app/dashboard/training/page')).default;
            const result = await TrainingPage();

            expect(redirect).not.toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should render normally when user has super_user role', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'admin-123',
                email: 'admin@bakedbot.ai',
                role: 'super_user',
            });

            const TrainingPage = (await import('@/app/dashboard/training/page')).default;
            const result = await TrainingPage();

            expect(redirect).not.toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should show enrollment message when user has no progress', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'user-123',
                email: 'student@example.com',
                role: 'intern',
            });

            // Mock empty progress
            const { getAdminFirestore } = require('@/firebase/admin');
            getAdminFirestore.mockReturnValueOnce({
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue(mockTrainingProgramDoc),
                        collection: jest.fn(() => ({
                            doc: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue({ exists: false }),
                            })),
                        })),
                    })),
                })),
            });

            const TrainingPage = (await import('@/app/dashboard/training/page')).default;
            const result = await TrainingPage();

            // Should render JSX with enrollment message
            expect(result).toBeDefined();
            expect(redirect).not.toHaveBeenCalled();
        });
    });

    describe('Training Admin Page', () => {
        it('should redirect to /dashboard when user is not super_user', async () => {
            mockRequireUser.mockRejectedValueOnce(new Error('Forbidden: You do not have the required permissions.'));

            const TrainingAdminPage = (await import('@/app/dashboard/training/admin/page')).default;
            await TrainingAdminPage();

            expect(redirect).toHaveBeenCalledWith('/dashboard');
        });

        it('should redirect to /dashboard when user is not authenticated', async () => {
            mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));

            const TrainingAdminPage = (await import('@/app/dashboard/training/admin/page')).default;
            await TrainingAdminPage();

            expect(redirect).toHaveBeenCalledWith('/dashboard');
        });

        it('should render normally when user is super_user', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'admin-123',
                email: 'admin@bakedbot.ai',
                role: 'super_user',
            });

            // Mock Firestore for admin page data
            const { getAdminFirestore } = require('@/firebase/admin');
            getAdminFirestore.mockReturnValueOnce({
                collection: jest.fn(() => ({
                    orderBy: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ docs: [] }),
                        limit: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({ docs: [] }),
                        })),
                    })),
                    count: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
                    })),
                    where: jest.fn(() => ({
                        count: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
                        })),
                    })),
                })),
                collectionGroup: jest.fn(() => ({
                    where: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ size: 0 }),
                    })),
                })),
            });

            const TrainingAdminPage = (await import('@/app/dashboard/training/admin/page')).default;
            const result = await TrainingAdminPage();

            expect(redirect).not.toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('Error Scenarios', () => {
        it('should handle auth errors without breaking the app', async () => {
            mockRequireUser.mockRejectedValueOnce(new Error('Random auth error'));

            const TrainingPage = (await import('@/app/dashboard/training/page')).default;
            await TrainingPage();

            // Should redirect gracefully
            expect(redirect).toHaveBeenCalledWith('/customer-login');
        });

        it('should handle network errors during auth check', async () => {
            mockRequireUser.mockRejectedValueOnce(new Error('Network error'));

            const TrainingPage = (await import('@/app/dashboard/training/page')).default;
            await TrainingPage();

            expect(redirect).toHaveBeenCalled();
        });
    });
});
