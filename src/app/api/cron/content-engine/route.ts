/**
 * Content Engine Cron Job
 *
 * Runs daily to generate programmatic blog posts from content templates.
 * Checks each enabled template's frequency to determine if it should run today.
 *
 * Cloud Scheduler:
 *   Schedule: 0 6 * * *  (daily at 6 AM UTC / 1 AM EST)
 *   gcloud scheduler jobs create http content-engine \
 *     --schedule="0 6 * * *" --time-zone="UTC" \
 *     --uri="https://<domain>/api/cron/content-engine" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}" \
 *     --location=us-central1 --attempt-deadline=540s
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getEnabledTemplates, isTemplateDueToday } from '@/server/services/content-engine/templates';
import { generateFromTemplate } from '@/server/services/content-engine/generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
    return POST(request);
}

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'content-engine');
    if (authError) return authError;

    const now = new Date();
    const templates = getEnabledTemplates();
    const dueTemplates = templates.filter(t => isTemplateDueToday(t, now));

    logger.info('[ContentEngine] Starting daily content generation', {
        totalTemplates: templates.length,
        dueToday: dueTemplates.length,
        templateIds: dueTemplates.map(t => t.id),
        timestamp: now.toISOString(),
    });

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const results: Array<{ templateId: string; status: string; postId?: string; title?: string }> = [];

    for (const template of dueTemplates) {
        try {
            const result = await generateFromTemplate(template.id);

            if (result) {
                generated++;
                results.push({
                    templateId: template.id,
                    status: 'generated',
                    postId: result.postId,
                    title: result.title,
                });
            } else {
                skipped++;
                results.push({
                    templateId: template.id,
                    status: 'skipped_insufficient_data',
                });
            }
        } catch (error) {
            failed++;
            results.push({
                templateId: template.id,
                status: 'failed',
            });
            logger.error('[ContentEngine] Template generation failed', {
                templateId: template.id,
                error: String(error),
            });
        }
    }

    const response = {
        success: true,
        generated,
        skipped,
        failed,
        dueToday: dueTemplates.length,
        results,
        timestamp: now.toISOString(),
    };

    logger.info('[ContentEngine] Daily content generation complete', response);

    return NextResponse.json(response);
}
