/**
 * Slack Bot Service - Unit Tests
 */

import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { UserTrainingProgress, PeerReview } from '@/types/training';
import { Timestamp } from '@google-cloud/firestore';

// Mock Slack Web API
const mockPostMessage = jest.fn().mockResolvedValue({ ok: true });

jest.mock('@slack/web-api', () => ({
    WebClient: jest.fn().mockImplementation(() => ({
        chat: {
            postMessage: mockPostMessage,
        },
    })),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

let sendNotification: typeof import('../bot').sendNotification;
let notifyPeerReviewAssigned: typeof import('../bot').notifyPeerReviewAssigned;
let notifyPeerReviewReceived: typeof import('../bot').notifyPeerReviewReceived;
let notifyChallengeCompleted: typeof import('../bot').notifyChallengeCompleted;
let sendWeeklyDigest: typeof import('../bot').sendWeeklyDigest;
let formatProgress: typeof import('../bot').formatProgress;
let formatPendingReviews: typeof import('../bot').formatPendingReviews;
let formatLeaderboard: typeof import('../bot').formatLeaderboard;

describe('Slack Bot Service', () => {
    beforeAll(async () => {
        const mod = await import('../bot');
        sendNotification = mod.sendNotification;
        notifyPeerReviewAssigned = mod.notifyPeerReviewAssigned;
        notifyPeerReviewReceived = mod.notifyPeerReviewReceived;
        notifyChallengeCompleted = mod.notifyChallengeCompleted;
        sendWeeklyDigest = mod.sendWeeklyDigest;
        formatProgress = mod.formatProgress;
        formatPendingReviews = mod.formatPendingReviews;
        formatLeaderboard = mod.formatLeaderboard;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sendNotification', () => {
        it('should send notification via Slack API', async () => {
            await sendNotification({
                channel: 'U123456',
                text: 'Test message',
            });

            expect(mockPostMessage).toHaveBeenCalledWith({
                channel: 'U123456',
                text: 'Test message',
                blocks: undefined,
            });
        });

        it('should include blocks if provided', async () => {
            const blocks = [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: 'Block content',
                    },
                },
            ];

            await sendNotification({
                channel: 'U123456',
                text: 'Test',
                blocks,
            });

            expect(mockPostMessage).toHaveBeenCalledWith({
                channel: 'U123456',
                text: 'Test',
                blocks,
            });
        });
    });

    describe('notifyPeerReviewAssigned', () => {
        it('should format peer review assignment notification', async () => {
            await notifyPeerReviewAssigned(
                'U123456',
                'John Doe',
                'Week 1 - Hello BakedBot',
                'review-123'
            );

            expect(mockPostMessage).toHaveBeenCalled();
            const call = mockPostMessage.mock.calls[0][0];
            expect(call.channel).toBe('U123456');
            expect(call.text).toContain('peer review assigned');
            expect(call.blocks).toBeDefined();
        });

        it('should include review URL in notification', async () => {
            await notifyPeerReviewAssigned(
                'U123456',
                'John Doe',
                'Test Challenge',
                'review-abc'
            );

            const call = mockPostMessage.mock.calls[0][0];
            const actionBlock = call.blocks.find((b: any) => b.type === 'actions');
            expect(actionBlock.elements[0].url).toContain('review-abc');
        });
    });

    describe('notifyPeerReviewReceived', () => {
        it('should format peer feedback notification with stars', async () => {
            await notifyPeerReviewReceived(
                'U123456',
                'Test Challenge',
                4,
                'submission-123'
            );

            const call = mockPostMessage.mock.calls[0][0];
            expect(call.text).toContain('feedback');
            expect(call.blocks[0].text.text).toContain('⭐⭐⭐⭐'); // 4 stars
        });
    });

    describe('notifyChallengeCompleted', () => {
        it('should congratulate on challenge completion', async () => {
            await notifyChallengeCompleted(
                'U123456',
                'Week 2 - Firestore Basics',
                2,
                15
            );

            const call = mockPostMessage.mock.calls[0][0];
            expect(call.text).toContain('completed');
            expect(call.blocks[0].text.text).toContain('15');
            expect(call.blocks[0].text.text).toContain('40');
        });
    });

    describe('sendWeeklyDigest', () => {
        it('should format weekly progress digest', async () => {
            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 5,
                completedChallenges: Array(25).fill('challenge'),
                totalSubmissions: 30,
                acceptedSubmissions: 24,
                weeklyProgress: [],
                certificateEarned: false,
                lastActivityAt: Timestamp.now(),
                status: 'active',
                reviewsCompleted: 8,
                reviewsAssigned: 10,
                averageReviewRating: 4.3,
                reviewBadges: [],
            };

            await sendWeeklyDigest('U123456', mockProgress, {
                challengesCompleted: 5,
                reviewsCompleted: 3,
                testsRun: 42,
            });

            const call = mockPostMessage.mock.calls[0][0];
            expect(call.blocks).toBeDefined();
            expect(call.blocks.length).toBeGreaterThan(0);
        });
    });

    describe('formatProgress', () => {
        it('should format user progress as text', () => {
            const mockProgress: UserTrainingProgress = {
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
                reviewsCompleted: 10,
                reviewsAssigned: 12,
                averageReviewRating: 4.5,
                reviewBadges: [],
            };

            const formatted = formatProgress(mockProgress);

            expect(formatted).toContain('6/8'); // Current week
            expect(formatted).toContain('30/40'); // Challenges
            expect(formatted).toContain('80%'); // Approval rate (28/35)
            expect(formatted).toContain('10 completed'); // Reviews
        });

        it('should calculate approval rate correctly', () => {
            const mockProgress: UserTrainingProgress = {
                cohortId: 'test-cohort',
                programId: 'test-program',
                enrolledAt: Timestamp.now(),
                currentWeek: 3,
                completedChallenges: Array(10).fill('challenge'),
                totalSubmissions: 20,
                acceptedSubmissions: 15,
                weeklyProgress: [],
                certificateEarned: false,
                lastActivityAt: Timestamp.now(),
                status: 'active',
                reviewsCompleted: 5,
                reviewsAssigned: 6,
                averageReviewRating: 4.0,
                reviewBadges: [],
            };

            const formatted = formatProgress(mockProgress);

            expect(formatted).toContain('75%'); // 15/20
        });

        it('should show certificate earned message', () => {
            const mockProgress: UserTrainingProgress = {
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
                reviewsCompleted: 15,
                reviewsAssigned: 15,
                averageReviewRating: 4.7,
                reviewBadges: [],
            };

            const formatted = formatProgress(mockProgress);

            expect(formatted).toContain('Certificate Earned');
        });
    });

    describe('formatPendingReviews', () => {
        it('should return friendly message if no reviews', () => {
            const formatted = formatPendingReviews([]);

            expect(formatted).toContain('No pending reviews');
            expect(formatted).toContain('Great job');
        });

        it('should list pending reviews with time', () => {
            const now = Date.now();
            const fiveHoursAgo = now - (5 * 60 * 60 * 1000);

            const mockReviews: PeerReview[] = [
                {
                    id: 'review-1',
                    submissionId: 'sub-1',
                    reviewerId: 'reviewer-1',
                    authorId: 'author-1',
                    challengeId: 'week1-ch1',
                    cohortId: 'test-cohort',
                    rating: 5,
                    strengths: [],
                    improvements: [],
                    questions: [],
                    wouldApprove: true,
                    rubricScores: [],
                    assignedAt: Timestamp.fromMillis(fiveHoursAgo),
                    status: 'pending',
                    helpfulVotes: 0,
                    flagged: false,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                },
            ];

            const formatted = formatPendingReviews(mockReviews);

            expect(formatted).toContain('Pending Peer Reviews');
            expect(formatted).toContain('(1)');
            expect(formatted).toContain('5h ago');
            expect(formatted).toContain('review-1');
        });

        it('should format multiple reviews', () => {
            const now = Date.now();
            const twoHoursAgo = now - (2 * 60 * 60 * 1000);
            const tenHoursAgo = now - (10 * 60 * 60 * 1000);

            const mockReviews: PeerReview[] = [
                {
                    id: 'review-1',
                    assignedAt: Timestamp.fromMillis(twoHoursAgo),
                    status: 'pending',
                } as any,
                {
                    id: 'review-2',
                    assignedAt: Timestamp.fromMillis(tenHoursAgo),
                    status: 'pending',
                } as any,
            ];

            const formatted = formatPendingReviews(mockReviews);

            expect(formatted).toContain('(2)');
            expect(formatted).toContain('2h ago');
            expect(formatted).toContain('10h ago');
        });
    });

    describe('formatLeaderboard', () => {
        it('should format leaderboard with medals', () => {
            const mockLeaderboard = [
                {
                    name: 'Alice',
                    completedChallenges: 40,
                    reviewsCompleted: 20,
                    badges: ['helpful-reviewer'],
                },
                {
                    name: 'Bob',
                    completedChallenges: 35,
                    reviewsCompleted: 15,
                    badges: [],
                },
                {
                    name: 'Charlie',
                    completedChallenges: 30,
                    reviewsCompleted: 10,
                    badges: ['quick-responder'],
                },
            ];

            const formatted = formatLeaderboard(mockLeaderboard);

            expect(formatted).toContain('🥇'); // 1st place
            expect(formatted).toContain('🥈'); // 2nd place
            expect(formatted).toContain('🥉'); // 3rd place
            expect(formatted).toContain('Alice');
            expect(formatted).toContain('40 challenges');
        });

        it('should show badge emojis', () => {
            const mockLeaderboard = [
                {
                    name: 'Alice',
                    completedChallenges: 40,
                    reviewsCompleted: 20,
                    badges: ['helpful-reviewer', 'master-reviewer'],
                },
            ];

            const formatted = formatLeaderboard(mockLeaderboard);

            expect(formatted).toContain('🌟'); // helpful-reviewer
            expect(formatted).toContain('👑'); // master-reviewer
        });

        it('should limit to top 10', () => {
            const mockLeaderboard = Array.from({ length: 20 }, (_, i) => ({
                name: `User ${i + 1}`,
                completedChallenges: 40 - i,
                reviewsCompleted: 10,
                badges: [],
            }));

            const formatted = formatLeaderboard(mockLeaderboard);

            expect(formatted).toContain('User 1');
            expect(formatted).toContain('User 10');
            expect(formatted).not.toContain('User 11');
        });

        it('should show numeric position after 3rd place', () => {
            const mockLeaderboard = Array.from({ length: 5 }, (_, i) => ({
                name: `User ${i + 1}`,
                completedChallenges: 40 - i,
                reviewsCompleted: 10,
                badges: [],
            }));

            const formatted = formatLeaderboard(mockLeaderboard);

            expect(formatted).toContain('4.'); // 4th place
            expect(formatted).toContain('5.'); // 5th place
        });
    });
});
