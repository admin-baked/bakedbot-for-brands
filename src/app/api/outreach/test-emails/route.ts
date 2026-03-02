/**
 * Test Outreach Emails Endpoint
 *
 * Sends 10 test outreach emails (one per template) to internal recipients
 * for review and sign-off before live outreach begins.
 *
 * POST /api/outreach/test-emails
 * Body: { recipients?: string[] }
 * Default recipients: martez@bakedbot.ai, jack@bakedbot.ai
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { requireCronSecret } from '@/server/auth/cron';
import { sendTestOutreachBatch } from '@/server/services/ny-outreach/outreach-service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        // Accept either a logged-in super user session OR CRON_SECRET header (for CLI testing)
        const cronAuth = await requireCronSecret(request, 'test-emails');
        if (cronAuth !== null) {
            // Not authorized via cron secret — try session auth
            await requireSuperUser();
        }

        const body = await request.json().catch(() => ({}));
        const recipients = body.recipients || ['martez@bakedbot.ai', 'jack@bakedbot.ai'];

        logger.info('[TestOutreach] Sending test batch', { recipients, count: 10 });

        const results = await sendTestOutreachBatch(recipients);

        const sent = results.filter(r => r.emailSent).length;
        const failed = results.filter(r => !r.emailSent).length;

        logger.info('[TestOutreach] Batch complete', { sent, failed });

        return NextResponse.json({
            success: true,
            summary: {
                totalTemplates: results.length,
                sent,
                failed,
                recipients,
            },
            results: results.map(r => ({
                template: r.templateId,
                dispensary: r.dispensaryName,
                sent: r.emailSent,
                error: r.sendError || null,
            })),
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[TestOutreach] Error sending test batch', { error: err.message });
        return NextResponse.json(
            { error: err.message || 'Failed to send test emails' },
            { status: 500 }
        );
    }
}
