/**
 * Competitive Intel All-Orgs Sweep Cron Endpoint
 *
 * Cloud Scheduler job:
 *   Name:     competitive-intel-all-orgs
 *   Schedule: 0 12 * * 3  (7 AM EST = 12 PM UTC, every Wednesday)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/competitive-intel-all-orgs
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 *
 * Triggers competitive intel refresh for ALL active orgs.
 * Processes in batches of 3 with a 10-second delay between batches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { requireCronSecret } from '@/server/auth/cron';
import { refreshCompetitiveIntelWorkspace } from '@/server/services/ezal';
import {
  postLinusIncidentSlack,
  type LinusIncidentSlackBlock,
} from '@/server/services/incident-notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 10_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getActiveOrgIds(): Promise<string[]> {
  const db = getAdminFirestore();
  const orgIds = new Set<string>();

  for (const role of ['dispensary_admin', 'brand_admin']) {
    try {
      const snap = await db
        .collection('users')
        .where('role', '==', role)
        .where('status', '==', 'active')
        .limit(50)
        .get();

      for (const doc of snap.docs) {
        const data = doc.data();
        const orgId = data.orgId || data.currentOrgId;
        if (orgId && typeof orgId === 'string') {
          orgIds.add(orgId);
        }
        if (orgIds.size >= 50) break;
      }
    } catch (err) {
      logger.warn('[CompetitiveIntelAllOrgs] Failed to fetch users for role', {
        role,
        error: String(err),
      });
    }
    if (orgIds.size >= 50) break;
  }

  return Array.from(orgIds);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Slack Post
// ---------------------------------------------------------------------------

async function postSweepSummaryToSlack(
  total: number,
  success: number,
  failed: number,
  successOrgs: string[]
): Promise<void> {
  const orgList =
    successOrgs.length > 0
      ? `New intel saved for: ${successOrgs.slice(0, 8).join(', ')}${successOrgs.length > 8 ? ` +${successOrgs.length - 8} more` : ''}`
      : 'No orgs updated.';

  const blocks: LinusIncidentSlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🔍 Ezal — Weekly Competitive Sweep',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Orgs:* ${total}` },
        { type: 'mrkdwn', text: `*Success:* ${success}` },
        { type: 'mrkdwn', text: `*Failed:* ${failed}` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: orgList },
    },
  ];

  const fallbackText = [
    '🔍 Ezal — Weekly Competitive Sweep',
    `Orgs: ${total} | Success: ${success} | Failed: ${failed}`,
    orgList,
  ].join('\n');

  await postLinusIncidentSlack({
    blocks,
    fallbackText,
    source: 'auto-escalator',
    channelName: 'linus-deployments',
  });
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

interface OrgResult {
  orgId: string;
  success: boolean;
  error?: string;
  sourcesRun?: number;
}

async function runAllOrgsSweep(): Promise<NextResponse> {
  const orgIds = await getActiveOrgIds();

  if (orgIds.length === 0) {
    logger.warn('[CompetitiveIntelAllOrgs] No active orgs found');
    return NextResponse.json({ success: true, total: 0, success_count: 0, failed_count: 0 });
  }

  logger.info('[CompetitiveIntelAllOrgs] Starting sweep', { orgCount: orgIds.length });

  const results: OrgResult[] = [];
  const batches = chunk(orgIds, BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    logger.info('[CompetitiveIntelAllOrgs] Processing batch', {
      batchIdx: batchIdx + 1,
      batchSize: batch.length,
      totalBatches: batches.length,
    });

    const batchResults = await Promise.allSettled(
      batch.map(orgId =>
        refreshCompetitiveIntelWorkspace(orgId, { force: false, maxSources: 8 })
          .then(result => ({ orgId, success: true, sourcesRun: result.sourcesRun } as OrgResult))
          .catch(err => ({
            orgId,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          } as OrgResult))
      )
    );

    for (const settled of batchResults) {
      if (settled.status === 'fulfilled') {
        results.push(settled.value);
      } else {
        // Promise.allSettled inner promises won't reject (we caught above),
        // but handle defensively
        results.push({ orgId: 'unknown', success: false, error: String(settled.reason) });
      }
    }

    // Delay between batches (skip after last batch)
    if (batchIdx < batches.length - 1) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  const successResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  const successOrgs = successResults.map(r => r.orgId);

  logger.info('[CompetitiveIntelAllOrgs] Sweep complete', {
    total: results.length,
    success: successResults.length,
    failed: failedResults.length,
  });

  if (failedResults.length > 0) {
    logger.warn('[CompetitiveIntelAllOrgs] Some orgs failed', {
      failedOrgs: failedResults.map(r => ({ orgId: r.orgId, error: r.error })),
    });
  }

  // Post Slack summary (fire-and-forget — don't fail cron on Slack error)
  postSweepSummaryToSlack(
    results.length,
    successResults.length,
    failedResults.length,
    successOrgs
  ).catch(err => {
    logger.warn('[CompetitiveIntelAllOrgs] Failed to post Slack summary', { error: String(err) });
  });

  return NextResponse.json({
    success: true,
    total: results.length,
    success_count: successResults.length,
    failed_count: failedResults.length,
    orgs: results,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireCronSecret(request, 'competitive-intel-all-orgs');
  if (authError) return authError;

  logger.info('[CompetitiveIntelAllOrgs] Starting all-orgs competitive intel sweep');

  try {
    return await runAllOrgsSweep();
  } catch (error) {
    logger.error('[CompetitiveIntelAllOrgs] Sweep failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
