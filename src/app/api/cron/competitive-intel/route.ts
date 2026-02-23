/**
 * Competitive Intelligence Cron Endpoint
 *
 * POST /api/cron/competitive-intel
 *
 * Triggers the daily competitive intelligence report for a specific org.
 * Generates report covering up to 10 competitors with price changes, new products, and menu shakeups.
 * Delivers via email and dashboard inbox. Automatically enrolls user in playbook.
 * Bypasses the playbook system for reliability.
 *
 * Usage:
 * - Cloud Scheduler: daily at 7 AM (configurable per org)
 * - Manual: curl with CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyIntelReport } from '@/server/services/ezal/weekly-intel-report';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { orgId } = body;

        if (!orgId) {
            return NextResponse.json(
                { error: 'Missing required field: orgId' },
                { status: 400 }
            );
        }

        logger.info('[CompetitiveIntelCron] Starting report generation', { orgId });

        const report = await generateWeeklyIntelReport(orgId);

        logger.info('[CompetitiveIntelCron] Report generated successfully', {
            orgId,
            reportId: report.id,
            competitors: report.competitors.length,
            deals: report.totalDealsTracked,
        });

        return NextResponse.json({
            success: true,
            reportId: report.id,
            orgId,
            competitorsTracked: report.competitors.length,
            totalDeals: report.totalDealsTracked,
            totalSnapshots: report.totalSnapshots,
            generatedAt: report.generatedAt,
        });

    } catch (error: any) {
        logger.error('[CompetitiveIntelCron] Failed to generate report', {
            error: error.message,
        });

        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
