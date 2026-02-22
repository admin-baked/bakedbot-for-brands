/**
 * POST /api/cron/generate-insights-goal-progress
 *
 * Daily cron job that updates goal progress metrics for all organizations.
 *
 * Endpoint: POST/GET /api/cron/generate-insights-goal-progress
 * Auth: CRON_SECRET via Authorization header
 * Frequency: Daily at 8 AM UTC (configurable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { GoalProgressGenerator } from '@/server/services/insights/goal-progress-generator';

/**
 * Validate CRON_SECRET from Authorization header
 */
function validateCronSecret(request: NextRequest): { valid: boolean; error?: string } {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('[GoalProgressCron] CRON_SECRET not configured');
    return { valid: false, error: 'Server misconfiguration' };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    logger.warn('[GoalProgressCron] Missing authorization header');
    return { valid: false, error: 'Unauthorized' };
  }

  const expectedToken = `Bearer ${cronSecret}`;
  if (authHeader !== expectedToken) {
    logger.warn('[GoalProgressCron] Invalid authorization token');
    return { valid: false, error: 'Unauthorized' };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  // Validate cron secret
  const auth = validateCronSecret(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();

    // Load all organizations
    const orgsSnapshot = await db.collection('orgs').limit(100).get();
    const orgIds = orgsSnapshot.docs.map(doc => doc.id);

    logger.info('[GoalProgressCron] Starting goal progress update', {
      orgCount: orgIds.length,
    });

    let goalsUpdatedCount = 0;
    let errorCount = 0;

    // Process each org
    for (const orgId of orgIds) {
      try {
        const generator = new GoalProgressGenerator(orgId);
        const updatedGoals = await generator.updateGoalProgress();

        goalsUpdatedCount += updatedGoals.length;

        if (updatedGoals.length > 0) {
          logger.info('[GoalProgressCron] Updated goals for org', {
            orgId,
            goalCount: updatedGoals.length,
          });
        }
      } catch (error) {
        errorCount++;
        logger.error('[GoalProgressCron] Error processing org', {
          orgId,
          error: error instanceof Error ? { message: error.message } : { error },
        });
      }
    }

    logger.info('[GoalProgressCron] Completed goal progress update', {
      orgCount: orgIds.length,
      goalsUpdated: goalsUpdatedCount,
      errors: errorCount,
    });

    return NextResponse.json({
      success: true,
      orgsProcessed: orgIds.length,
      goalsUpdated: goalsUpdatedCount,
      errors: errorCount,
    });
  } catch (error) {
    logger.error('[GoalProgressCron] Fatal error', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : { error },
    });

    return NextResponse.json(
      { error: 'Failed to update goal progress' },
      { status: 500 }
    );
  }
}

// Support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
