export const dynamic = 'force-dynamic';

/**
 * POST /api/knowledge/executive-brief
 *
 * Returns a structured executive brief: summary + top claims + recommended actions.
 * Used by Boardroom / Mission Control tab and Marty CEO briefing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { searchKnowledgeForExecutiveBrief } from '@/server/services/knowledge-engine';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      tenantId: string;
      lookbackDays?: number;
      limit?: number;
    };

    const { tenantId, lookbackDays = 14, limit = 8 } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const claims = await searchKnowledgeForExecutiveBrief({ tenantId, lookbackDays, limit });

    // Build summary
    const verifiedCount = claims.filter(c => c.state === 'verified_fact').length;
    const workingCount = claims.filter(c => c.state === 'working_fact').length;

    const summary =
      claims.length === 0
        ? 'No significant knowledge updates in the selected window.'
        : `${verifiedCount} verified and ${workingCount} working fact(s) found in the past ${lookbackDays} days.`;

    // Derive action recommendations
    const actions = claims
      .filter(c => c.state === 'verified_fact' && c.confidenceScore >= 0.85)
      .slice(0, 3)
      .map(c => deriveAction(c));

    return NextResponse.json({ summary, claims, actions });
  } catch (err) {
    logger.error('[API/knowledge/executive-brief] Failed', { error: err });
    return NextResponse.json({ error: 'Failed to build executive brief' }, { status: 500 });
  }
}

function deriveAction(claim: { text: string; state: string }): string {
  const text = claim.text.toLowerCase();
  if (text.includes('competitor') && text.includes('promo')) {
    return `Craig should review promotional response to: ${claim.text.slice(0, 80)}`;
  }
  if (text.includes('price')) {
    return `Ezal should verify pricing behavior: ${claim.text.slice(0, 80)}`;
  }
  if (text.includes('playbook') || text.includes('flow') || text.includes('checkin')) {
    return `Ops should tune playbook: ${claim.text.slice(0, 80)}`;
  }
  return `Review: ${claim.text.slice(0, 80)}`;
}
