export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/knowledge-runtime-promotion
 * GET  /api/cron/knowledge-runtime-promotion  (Cloud Scheduler compat)
 *
 * Promotes fresh verified knowledge slices into Letta blocks for active agents.
 * Runs after competitive-intel and playbook-runner crons, or on its own schedule.
 *
 * Body: { orgId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { promoteRuntimeKnowledgeToLetta } from '@/server/services/knowledge-engine';
import type { TargetAgent, KnowledgeDomain } from '@/server/services/knowledge-engine';

export const maxDuration = 120;

export async function GET(req: NextRequest) { return POST(req); }

export async function POST(req: NextRequest) {
  const authError = requireCronSecret(req, 'knowledge-runtime-promotion');
  if (authError) return authError;

  try {
    const body = await req.json() as { orgId: string };
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const agents: TargetAgent[] = ['marty', 'craig', 'ezal'];
    const domains: KnowledgeDomain[] = ['competitive_intel', 'welcome_playbooks', 'checkin_flow'];

    const results: Record<string, unknown> = {};

    for (const agent of agents) {
      for (const domain of domains) {
        try {
          const result = await promoteRuntimeKnowledgeToLetta({
            tenantId: orgId,
            targetAgent: agent,
            domain,
            limit: 5,
          });
          if (result.promotedClaimIds.length > 0) {
            results[`${agent}::${domain}`] = result.promotedClaimIds.length;
          }
        } catch (err) {
          // Non-fatal — log and continue
          logger.warn('[CRON/knowledge-runtime-promotion] Pair skipped', {
            orgId, agent, domain, error: err,
          });
        }
      }
    }

    logger.info('[CRON/knowledge-runtime-promotion] Complete', { orgId, results });
    return NextResponse.json({ success: true, orgId, results });
  } catch (err) {
    logger.error('[CRON/knowledge-runtime-promotion] Failed', { error: err });
    return NextResponse.json({ error: 'Promotion failed' }, { status: 500 });
  }
}
