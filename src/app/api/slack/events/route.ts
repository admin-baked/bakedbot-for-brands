/**
 * Slack Events API Route
 *
 * Handle Slack slash commands and events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { formatProgress, formatPendingReviews, formatLeaderboard } from '@/server/services/slack/bot';
import type { UserTrainingProgress, PeerReview } from '@/types/training';

/**
 * Verify Slack request signature
 */
function verifySlackSignature(req: NextRequest, body: string): boolean {
    const slackSignature = req.headers.get('x-slack-signature');
    const timestamp = req.headers.get('x-slack-request-timestamp');

    if (!slackSignature || !timestamp) {
        return false;
    }

    // Check timestamp (prevent replay attacks)
    const timeDiff = Math.abs(Date.now() / 1000 - parseInt(timestamp));
    if (timeDiff > 60 * 5) {
        // 5 minutes
        return false;
    }

    // Calculate signature
    const signingSecret = process.env.SLACK_SIGNING_SECRET || '';
    const hmac = createHmac('sha256', signingSecret);
    hmac.update(`v0:${timestamp}:${body}`);
    const expectedSignature = `v0=${hmac.digest('hex')}`;

    return slackSignature === expectedSignature;
}

/**
 * Handle URL verification (Slack setup)
 */
function handleUrlVerification(body: any): NextResponse {
    return NextResponse.json({ challenge: body.challenge });
}

/**
 * Handle slash commands
 */
async function handleSlashCommand(command: string, text: string, userId: string): Promise<any> {
    const db = getAdminFirestore();

    switch (command) {
        case '/training-progress':
        case '/training-status': {
            // Get user progress
            const progressDoc = await db.collectionGroup('training')
                .where('userId', '==', userId)
                .limit(1)
                .get();

            if (progressDoc.empty) {
                return {
                    text: '❌ You are not enrolled in the training program.',
                };
            }

            const progress = progressDoc.docs[0].data() as UserTrainingProgress;

            return {
                text: formatProgress(progress),
            };
        }

        case '/training-reviews': {
            // Get pending reviews
            const reviewsSnapshot = await db
                .collection('peerReviews')
                .where('reviewerId', '==', userId)
                .where('status', '==', 'pending')
                .get();

            const reviews = reviewsSnapshot.docs.map((doc) => doc.data() as PeerReview);

            return {
                text: formatPendingReviews(reviews),
            };
        }

        case '/training-leaderboard': {
            // Get cohort leaderboard
            const progressSnapshot = await db.collectionGroup('training')
                .where('status', '==', 'active')
                .orderBy('completedChallenges', 'desc')
                .limit(10)
                .get();

            const leaderboard = await Promise.all(
                progressSnapshot.docs.map(async (doc) => {
                    const progress = doc.data() as UserTrainingProgress;
                    const userDoc = await db.collection('users').doc(doc.ref.parent.parent!.id).get();
                    const userData = userDoc.data();

                    return {
                        name: userData?.displayName || userData?.email || 'Unknown',
                        completedChallenges: progress.completedChallenges.length,
                        reviewsCompleted: progress.reviewsCompleted,
                        badges: progress.reviewBadges || [],
                    };
                })
            );

            return {
                text: formatLeaderboard(leaderboard),
            };
        }

        case '/training-next': {
            // Get user progress and suggest next challenge
            const progressDoc = await db.collectionGroup('training')
                .where('userId', '==', userId)
                .limit(1)
                .get();

            if (progressDoc.empty) {
                return {
                    text: '❌ You are not enrolled in the training program.',
                };
            }

            const progress = progressDoc.docs[0].data() as UserTrainingProgress;

            return {
                text: `📚 *Next Steps*\n\nYou're on Week ${progress.currentWeek}. \n\nView available challenges:\nhttps://bakedbot.ai/dashboard/training`,
            };
        }

        case '/training-help': {
            return {
                text: `*🤖 Training Bot Commands*\n\n/training-progress - View your progress\n/training-reviews - List pending peer reviews\n/training-leaderboard - See cohort leaderboard\n/training-next - What should I do next?\n/training-help - Show this message\n\n💡 Need human help? Post in #training-help`,
            };
        }

        default:
            return {
                text: `Unknown command: ${command}. Try /training-help for available commands.`,
            };
    }
}

/**
 * POST /api/slack/events
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.text();

        // Verify Slack signature
        if (!verifySlackSignature(req, body)) {
            logger.warn('[Slack] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const data = JSON.parse(body);

        // Handle URL verification
        if (data.type === 'url_verification') {
            return handleUrlVerification(data);
        }

        // Handle slash commands
        if (data.command) {
            const result = await handleSlashCommand(
                data.command,
                data.text || '',
                data.user_id
            );

            return NextResponse.json(result);
        }

        // Handle events
        if (data.event) {
            logger.info('[Slack] Event received', { type: data.event.type });

            // Handle specific events here
            // e.g., message, app_mention, etc.

            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        logger.error('[Slack] Request handling failed', { error });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
