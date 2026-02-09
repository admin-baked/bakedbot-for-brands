import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
  sendAcademyValueEmail,
  sendAcademyDemoEmail,
} from '@/server/services/academy-welcome';

/**
 * Scheduled Emails Cron Job
 *
 * Processes the scheduled_emails collection and sends emails that are due.
 * Should be called by a cron service (e.g., Vercel Cron, Cloud Scheduler)
 *
 * Example cron schedule: Every hour
 * 0 * * * *
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminFirestore();
    const now = new Date();

    logger.info('[CRON:SCHEDULED_EMAILS] Starting scheduled email processing');

    // Query emails that are due (scheduledFor <= now, status = pending)
    const emailsSnapshot = await db
      .collection('scheduled_emails')
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', now)
      .limit(50) // Process 50 at a time
      .get();

    if (emailsSnapshot.empty) {
      logger.info('[CRON:SCHEDULED_EMAILS] No emails to process');
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No emails to process',
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each email
    for (const doc of emailsSnapshot.docs) {
      const emailData = doc.data();
      const { type, leadId, email, firstName, company } = emailData;

      try {
        // Send appropriate email based on type
        if (type === 'academy_value') {
          await sendAcademyValueEmail({
            leadId,
            email,
            firstName,
            company,
          });
        } else if (type === 'academy_demo') {
          await sendAcademyDemoEmail({
            leadId,
            email,
            firstName,
            company,
          });
        } else {
          throw new Error(`Unknown email type: ${type}`);
        }

        // Mark as sent
        await doc.ref.update({
          status: 'sent',
          sentAt: new Date(),
        });

        results.success++;

        logger.info('[CRON:SCHEDULED_EMAILS] Email sent successfully', {
          emailId: doc.id,
          type,
          email,
        });
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errors.push(`${doc.id}: ${errorMsg}`);

        // Mark as failed
        await doc.ref.update({
          status: 'failed',
          error: errorMsg,
          attemptedAt: new Date(),
        });

        logger.error('[CRON:SCHEDULED_EMAILS] Failed to send email', {
          emailId: doc.id,
          type,
          email,
          error: errorMsg,
        });
      }
    }

    logger.info('[CRON:SCHEDULED_EMAILS] Processing complete', results);

    return NextResponse.json({
      success: true,
      processed: results.success + results.failed,
      successful: results.success,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    logger.error('[CRON:SCHEDULED_EMAILS] Cron job failed', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
