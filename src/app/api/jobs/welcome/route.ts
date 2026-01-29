import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { sendWelcomeEmail, sendWelcomeSms } from '@/server/services/mrs-parker-welcome';

/**
 * Welcome Message Job Processor
 *
 * Processes pending welcome email/SMS jobs created by email-capture.ts
 * Mrs. Parker sends personalized welcome messages with Letta memory
 *
 * Can be triggered:
 * 1. By Cloud Scheduler (every minute)
 * 2. Immediately after job creation (fire-and-forget)
 * 3. Manually for testing
 */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const db = getAdminFirestore();

        // Get pending welcome email jobs
        const emailJobsSnapshot = await db
            .collection('jobs')
            .where('type', '==', 'send_welcome_email')
            .where('agent', '==', 'mrs_parker')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(10) // Process max 10 at a time to avoid timeouts
            .get();

        // Get pending welcome SMS jobs
        const smsJobsSnapshot = await db
            .collection('jobs')
            .where('type', '==', 'send_welcome_sms')
            .where('agent', '==', 'mrs_parker')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(10)
            .get();

        const results = [];

        // Process welcome emails
        for (const doc of emailJobsSnapshot.docs) {
            const job = doc.data();
            const jobId = doc.id;

            try {
                logger.info('[WelcomeJobs] Processing welcome email', {
                    jobId,
                    email: job.data?.email,
                });

                // Mark as running
                await doc.ref.update({
                    status: 'running',
                    startedAt: Date.now(),
                    updatedAt: Date.now(),
                });

                // Send welcome email via Mrs. Parker
                const result = await sendWelcomeEmail({
                    leadId: job.data.leadId,
                    email: job.data.email,
                    firstName: job.data.firstName,
                    brandId: job.data.brandId,
                    dispensaryId: job.data.dispensaryId,
                    state: job.data.state,
                });

                if (result.success) {
                    // Mark as complete
                    await doc.ref.update({
                        status: 'completed',
                        completedAt: Date.now(),
                        updatedAt: Date.now(),
                        result: {
                            success: true,
                            sentAt: Date.now(),
                        },
                    });

                    results.push({
                        jobId,
                        type: 'welcome_email',
                        status: 'completed',
                        email: job.data.email,
                    });

                    logger.info('[WelcomeJobs] Welcome email sent successfully', {
                        jobId,
                        email: job.data.email,
                    });
                } else {
                    throw new Error(result.error || 'Failed to send welcome email');
                }
            } catch (error: unknown) {
                const err = error as Error;
                // Mark as failed
                await doc.ref.update({
                    status: 'failed',
                    error: err.message,
                    failedAt: Date.now(),
                    updatedAt: Date.now(),
                    attempts: (job.attempts || 0) + 1,
                });

                results.push({
                    jobId,
                    type: 'welcome_email',
                    status: 'failed',
                    error: err.message,
                });

                logger.error('[WelcomeJobs] Welcome email failed', {
                    jobId,
                    email: job.data?.email,
                    error: err.message,
                });
            }
        }

        // Process welcome SMS
        for (const doc of smsJobsSnapshot.docs) {
            const job = doc.data();
            const jobId = doc.id;

            try {
                logger.info('[WelcomeJobs] Processing welcome SMS', {
                    jobId,
                    phone: job.data?.phone,
                });

                // Mark as running
                await doc.ref.update({
                    status: 'running',
                    startedAt: Date.now(),
                    updatedAt: Date.now(),
                });

                // Send welcome SMS via Mrs. Parker
                const result = await sendWelcomeSms({
                    leadId: job.data.leadId,
                    phone: job.data.phone,
                    firstName: job.data.firstName,
                    brandId: job.data.brandId,
                    dispensaryId: job.data.dispensaryId,
                    state: job.data.state,
                });

                if (result.success) {
                    // Mark as complete
                    await doc.ref.update({
                        status: 'completed',
                        completedAt: Date.now(),
                        updatedAt: Date.now(),
                        result: {
                            success: true,
                            sentAt: Date.now(),
                        },
                    });

                    results.push({
                        jobId,
                        type: 'welcome_sms',
                        status: 'completed',
                        phone: job.data.phone,
                    });

                    logger.info('[WelcomeJobs] Welcome SMS sent successfully', {
                        jobId,
                        phone: job.data.phone,
                    });
                } else {
                    throw new Error(result.error || 'Failed to send welcome SMS');
                }
            } catch (error: unknown) {
                const err = error as Error;
                // Mark as failed
                await doc.ref.update({
                    status: 'failed',
                    error: err.message,
                    failedAt: Date.now(),
                    updatedAt: Date.now(),
                    attempts: (job.attempts || 0) + 1,
                });

                results.push({
                    jobId,
                    type: 'welcome_sms',
                    status: 'failed',
                    error: err.message,
                });

                logger.error('[WelcomeJobs] Welcome SMS failed', {
                    jobId,
                    phone: job.data?.phone,
                    error: err.message,
                });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results,
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[WelcomeJobs] Job processor failed', {
            error: err.message,
        });

        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint for manual testing
 */
export async function GET(request: NextRequest) {
    return POST(request);
}
