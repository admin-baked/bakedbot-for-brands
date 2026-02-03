/**
 * Slack Bot Service
 *
 * Handle Slack interactions, commands, and notifications
 */

import { WebClient } from '@slack/web-api';
import { logger } from '@/lib/logger';
import type { UserTrainingProgress, PeerReview } from '@/types/training';

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export interface SlackNotification {
    channel: string; // User ID or channel ID
    text: string;
    blocks?: any[]; // Slack Block Kit blocks
}

/**
 * Send notification to user
 */
export async function sendNotification(notification: SlackNotification): Promise<void> {
    try {
        await slack.chat.postMessage({
            channel: notification.channel,
            text: notification.text,
            blocks: notification.blocks,
        });

        logger.info('[Slack] Notification sent', { channel: notification.channel });
    } catch (error) {
        logger.error('[Slack] Failed to send notification', { error, channel: notification.channel });
        throw error;
    }
}

/**
 * Notify user of peer review assignment
 */
export async function notifyPeerReviewAssigned(
    slackUserId: string,
    authorName: string,
    challengeTitle: string,
    reviewId: string
): Promise<void> {
    const notification: SlackNotification = {
        channel: slackUserId,
        text: `🔔 New peer review assigned: ${challengeTitle}`,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*🔔 New Peer Review Assigned*\n\nYou've been asked to review *${authorName}'s* solution for:\n*${challengeTitle}*`,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: '*Due:*\nIn 48 hours',
                    },
                    {
                        type: 'mrkdwn',
                        text: '*Points:*\n+10 points',
                    },
                ],
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '📝 Start Review',
                        },
                        style: 'primary',
                        url: `https://bakedbot.ai/dashboard/training/peer-review/${reviewId}`,
                    },
                ],
            },
        ],
    };

    await sendNotification(notification);
}

/**
 * Notify user they received peer feedback
 */
export async function notifyPeerReviewReceived(
    slackUserId: string,
    challengeTitle: string,
    rating: number,
    submissionId: string
): Promise<void> {
    const stars = '⭐'.repeat(rating);

    const notification: SlackNotification = {
        channel: slackUserId,
        text: `✨ You received peer feedback on ${challengeTitle}`,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*✨ Peer Feedback Received*\n\nYou received a review for:\n*${challengeTitle}*\n\nRating: ${stars} (${rating}/5)`,
                },
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'View Feedback',
                        },
                        url: `https://bakedbot.ai/dashboard/training/submissions/${submissionId}`,
                    },
                ],
            },
        ],
    };

    await sendNotification(notification);
}

/**
 * Notify user of challenge completion
 */
export async function notifyChallengeCompleted(
    slackUserId: string,
    challengeTitle: string,
    weekNumber: number,
    totalCompleted: number
): Promise<void> {
    const notification: SlackNotification = {
        channel: slackUserId,
        text: `🎉 Challenge completed: ${challengeTitle}`,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*🎉 Challenge Completed!*\n\nGreat job on:\n*${challengeTitle}* (Week ${weekNumber})\n\nTotal challenges completed: *${totalCompleted}*/40`,
                },
            },
        ],
    };

    await sendNotification(notification);
}

/**
 * Send weekly progress digest
 */
export async function sendWeeklyDigest(
    slackUserId: string,
    progress: UserTrainingProgress,
    weeklyStats: {
        challengesCompleted: number;
        reviewsCompleted: number;
        testsRun: number;
    }
): Promise<void> {
    const notification: SlackNotification = {
        channel: slackUserId,
        text: 'Your weekly training progress',
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*📊 Your Weekly Progress*',
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Current Week:*\n${progress.currentWeek}/8`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Challenges:*\n${progress.completedChallenges.length}/40`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*This Week:*\n${weeklyStats.challengesCompleted} completed`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Reviews:*\n${weeklyStats.reviewsCompleted} submitted`,
                    },
                ],
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'View Full Progress',
                        },
                        url: 'https://bakedbot.ai/dashboard/training',
                    },
                ],
            },
        ],
    };

    await sendNotification(notification);
}

/**
 * Format user progress for display
 */
export function formatProgress(progress: UserTrainingProgress): string {
    const approvalRate = progress.totalSubmissions > 0
        ? Math.round((progress.acceptedSubmissions / progress.totalSubmissions) * 100)
        : 0;

    return `
📊 *Your Training Progress*

*Current Week:* ${progress.currentWeek}/8
*Challenges Completed:* ${progress.completedChallenges.length}/40
*Approval Rate:* ${approvalRate}%
*Peer Reviews:* ${progress.reviewsCompleted} completed

*Status:* ${progress.status === 'active' ? '✅ Active' : '⏸️ ' + progress.status}
${progress.certificateEarned ? '🎓 Certificate Earned!' : ''}

View full progress: https://bakedbot.ai/dashboard/training
`.trim();
}

/**
 * Format pending reviews for display
 */
export function formatPendingReviews(reviews: PeerReview[]): string {
    if (reviews.length === 0) {
        return '✅ No pending reviews! Great job staying on top of things.';
    }

    const reviewList = reviews
        .map((review, index) => {
            const assignedDate = new Date(review.assignedAt.seconds * 1000);
            const hoursAgo = Math.floor((Date.now() - assignedDate.getTime()) / (1000 * 60 * 60));

            return `${index + 1}. Challenge: ${review.challengeId}\n   Assigned: ${hoursAgo}h ago\n   Link: https://bakedbot.ai/dashboard/training/peer-review/${review.id}`;
        })
        .join('\n\n');

    return `
📝 *Pending Peer Reviews* (${reviews.length})

${reviewList}

💡 Complete reviews within 48 hours to earn badges!
`.trim();
}

/**
 * Get cohort leaderboard
 */
export function formatLeaderboard(
    leaderboard: Array<{
        name: string;
        completedChallenges: number;
        reviewsCompleted: number;
        badges: string[];
    }>
): string {
    const entries = leaderboard
        .slice(0, 10)
        .map((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const badgeStr = entry.badges.length > 0 ? ` ${entry.badges.map((b) => getBadgeEmoji(b)).join(' ')}` : '';

            return `${medal} *${entry.name}* - ${entry.completedChallenges} challenges${badgeStr}`;
        })
        .join('\n');

    return `
🏆 *Cohort Leaderboard*

${entries}

Keep up the great work! 💪
`.trim();
}

/**
 * Get emoji for badge
 */
function getBadgeEmoji(badge: string): string {
    const emojiMap: Record<string, string> = {
        'helpful-reviewer': '🌟',
        'quick-responder': '⚡',
        'master-reviewer': '👑',
        'thorough': '📚',
        'constructive': '🎯',
    };

    return emojiMap[badge] || '🏅';
}
