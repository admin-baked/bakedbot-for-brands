/**
 * Scheduled Publishing Cron Job
 *
 * Runs hourly to publish blog posts that have reached their scheduled publish time.
 * Finds posts with status='scheduled' and scheduledAt <= now, then publishes them.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

export async function POST(request: Request) {
    try {
        // Verify cron secret
        const headersList = await headers();
        const authHeader = headersList.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            logger.error('[PublishScheduledPosts] CRON_SECRET not configured');
            return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            logger.warn('[PublishScheduledPosts] Unauthorized cron request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { firestore } = await createServerClient();
        const now = Timestamp.now();

        logger.info('[PublishScheduledPosts] Starting scheduled post publishing', {
            timestamp: now.toDate().toISOString(),
        });

        // Find all tenants with blog posts
        const tenantsSnapshot = await firestore.collection('tenants').get();

        let totalPublished = 0;
        let totalErrors = 0;

        // Process each tenant's scheduled posts
        for (const tenantDoc of tenantsSnapshot.docs) {
            const tenantId = tenantDoc.id;

            try {
                // Query scheduled posts that are ready to publish
                const scheduledPostsSnapshot = await firestore
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('blog_posts')
                    .where('status', '==', 'scheduled')
                    .where('scheduledAt', '<=', now)
                    .get();

                if (scheduledPostsSnapshot.empty) {
                    continue;
                }

                logger.info('[PublishScheduledPosts] Found scheduled posts', {
                    tenantId,
                    count: scheduledPostsSnapshot.size,
                });

                // Publish each post
                for (const postDoc of scheduledPostsSnapshot.docs) {
                    try {
                        await postDoc.ref.update({
                            status: 'published',
                            publishedAt: now,
                            updatedAt: now,
                        });

                        totalPublished++;

                        logger.info('[PublishScheduledPosts] Published post', {
                            tenantId,
                            postId: postDoc.id,
                            title: postDoc.data().title,
                        });
                    } catch (postError) {
                        totalErrors++;
                        logger.error('[PublishScheduledPosts] Error publishing post', {
                            error: postError,
                            tenantId,
                            postId: postDoc.id,
                        });
                    }
                }
            } catch (tenantError) {
                logger.error('[PublishScheduledPosts] Error processing tenant', {
                    error: tenantError,
                    tenantId,
                });
            }
        }

        const result = {
            success: true,
            published: totalPublished,
            errors: totalErrors,
            timestamp: now.toDate().toISOString(),
        };

        logger.info('[PublishScheduledPosts] Completed scheduled post publishing', result);

        return NextResponse.json(result);
    } catch (error) {
        logger.error('[PublishScheduledPosts] Fatal error', { error });
        return NextResponse.json(
            { error: 'Failed to publish scheduled posts', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
