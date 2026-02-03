/**
 * Certificate Generator - Unit Tests
 */

import { describe, expect, it } from '@jest/globals';
import { checkCertificateEligibility, createCertificateMetadata } from '../generator';
import type { UserTrainingProgress } from '@/types/training';

describe('Certificate Generator', () => {
    describe('checkCertificateEligibility', () => {
        const createMockProgress = (overrides: Partial<UserTrainingProgress> = {}): UserTrainingProgress => ({
            cohortId: 'test-cohort',
            programId: 'test-program',
            enrolledAt: { seconds: Date.now() / 1000 } as any,
            currentWeek: 8,
            completedChallenges: new Array(30).fill(0).map((_, i) => `challenge-${i}`),
            totalSubmissions: 40,
            acceptedSubmissions: 32,
            weeklyProgress: [],
            reviewsCompleted: 5,
            reviewsAssigned: 5,
            averageReviewRating: 4.5,
            reviewBadges: [],
            certificateEarned: false,
            lastActivityAt: { seconds: Date.now() / 1000 } as any,
            status: 'active',
            ...overrides,
        });

        it('should be eligible with minimum requirements met', () => {
            const progress = createMockProgress();

            const result = checkCertificateEligibility(progress);

            expect(result.eligible).toBe(true);
            expect(result.reasons).toHaveLength(0);
        });

        it('should fail if less than 30 challenges completed', () => {
            const progress = createMockProgress({
                completedChallenges: new Array(25).fill(0).map((_, i) => `challenge-${i}`),
            });

            const result = checkCertificateEligibility(progress);

            expect(result.eligible).toBe(false);
            expect(result.reasons).toContain(expect.stringContaining('30 completed challenges'));
        });

        it('should fail if approval rate below 70%', () => {
            const progress = createMockProgress({
                totalSubmissions: 40,
                acceptedSubmissions: 24, // 60% approval rate
            });

            const result = checkCertificateEligibility(progress);

            expect(result.eligible).toBe(false);
            expect(result.reasons).toContain(expect.stringContaining('70% approval rate'));
        });

        it('should fail if less than 3 peer reviews completed', () => {
            const progress = createMockProgress({
                reviewsCompleted: 2,
            });

            const result = checkCertificateEligibility(progress);

            expect(result.eligible).toBe(false);
            expect(result.reasons).toContain(expect.stringContaining('3 peer reviews'));
        });

        it('should fail if status is dropped', () => {
            const progress = createMockProgress({
                status: 'dropped',
            });

            const result = checkCertificateEligibility(progress);

            expect(result.eligible).toBe(false);
            expect(result.reasons).toContain(expect.stringContaining('dropped'));
        });

        it('should fail if status is paused', () => {
            const progress = createMockProgress({
                status: 'paused',
            });

            const result = checkCertificateEligibility(progress);

            expect(result.eligible).toBe(false);
            expect(result.reasons).toContain(expect.stringContaining('paused'));
        });

        it('should return multiple reasons when multiple requirements not met', () => {
            const progress = createMockProgress({
                completedChallenges: ['challenge-1'], // Only 1
                totalSubmissions: 10,
                acceptedSubmissions: 4, // 40% approval
                reviewsCompleted: 1,
            });

            const result = checkCertificateEligibility(progress);

            expect(result.eligible).toBe(false);
            expect(result.reasons.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('createCertificateMetadata', () => {
        it('should extract correct skills from challenges', () => {
            const mockProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: { seconds: Date.now() / 1000 } as any,
                currentWeek: 8,
                completedChallenges: [
                    'week1-ch1',
                    'week1-ch2',
                    'week2-ch1',
                    'week3-ch1',
                    'week4-ch1',
                ],
                totalSubmissions: 10,
                acceptedSubmissions: 9,
                weeklyProgress: [],
                reviewsCompleted: 5,
                reviewsAssigned: 5,
                averageReviewRating: 4.5,
                reviewBadges: [],
                certificateEarned: false,
                lastActivityAt: { seconds: Date.now() / 1000 } as any,
                status: 'active' as const,
            };

            const options = {
                userId: 'test-user',
                userName: 'Test User',
                userEmail: 'test@example.com',
                cohortName: 'Test Cohort',
                cohortStartDate: new Date('2026-01-01'),
                cohortEndDate: new Date('2026-03-01'),
                completedChallenges: mockProgress.completedChallenges,
            };

            const metadata = createCertificateMetadata(
                options,
                mockProgress,
                'TEST-CERT-123'
            );

            expect(metadata.certificateId).toBe('TEST-CERT-123');
            expect(metadata.userId).toBe('test-user');
            expect(metadata.userName).toBe('Test User');
            expect(metadata.skills).toContain('TypeScript');
            expect(metadata.skills).toContain('Firestore');
            expect(metadata.completedChallenges).toBe(5);
            expect(metadata.approvalRate).toBe(90);
        });

        it('should calculate approval rate correctly', () => {
            const mockProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: { seconds: Date.now() / 1000 } as any,
                currentWeek: 8,
                completedChallenges: ['week1-ch1'],
                totalSubmissions: 100,
                acceptedSubmissions: 75,
                weeklyProgress: [],
                reviewsCompleted: 5,
                reviewsAssigned: 5,
                averageReviewRating: 4.5,
                reviewBadges: [],
                certificateEarned: false,
                lastActivityAt: { seconds: Date.now() / 1000 } as any,
                status: 'active' as const,
            };

            const options = {
                userId: 'test-user',
                userName: 'Test User',
                userEmail: 'test@example.com',
                cohortName: 'Test Cohort',
                cohortStartDate: new Date('2026-01-01'),
                cohortEndDate: new Date('2026-03-01'),
                completedChallenges: ['week1-ch1'],
            };

            const metadata = createCertificateMetadata(
                options,
                mockProgress,
                'TEST-CERT-123'
            );

            expect(metadata.approvalRate).toBe(75);
        });

        it('should handle zero submissions gracefully', () => {
            const mockProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: { seconds: Date.now() / 1000 } as any,
                currentWeek: 1,
                completedChallenges: [],
                totalSubmissions: 0,
                acceptedSubmissions: 0,
                weeklyProgress: [],
                reviewsCompleted: 0,
                reviewsAssigned: 0,
                averageReviewRating: 0,
                reviewBadges: [],
                certificateEarned: false,
                lastActivityAt: { seconds: Date.now() / 1000 } as any,
                status: 'active' as const,
            };

            const options = {
                userId: 'test-user',
                userName: 'Test User',
                userEmail: 'test@example.com',
                cohortName: 'Test Cohort',
                cohortStartDate: new Date('2026-01-01'),
                cohortEndDate: new Date('2026-03-01'),
                completedChallenges: [],
            };

            const metadata = createCertificateMetadata(
                options,
                mockProgress,
                'TEST-CERT-123'
            );

            expect(metadata.approvalRate).toBe(0);
            expect(metadata.completedChallenges).toBe(0);
        });
    });
});
