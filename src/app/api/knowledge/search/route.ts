export const dynamic = 'force-dynamic';

/**
 * POST /api/knowledge/search
 *
 * Scoped knowledge retrieval for agents and dashboard surfaces.
 * Returns grounded results with confidence, state, provenance.
 * Requires authenticated user session (not cron).
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { searchKnowledge } from '@/server/services/knowledge-engine';
import type { KnowledgeSearchRequest } from '@/server/services/knowledge-engine';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as KnowledgeSearchRequest;
    const { tenantId, query } = body;

    if (!tenantId || !query) {
      return NextResponse.json({ error: 'tenantId and query are required' }, { status: 400 });
    }

    const results = await searchKnowledge(body);

    return NextResponse.json({ results });
  } catch (err) {
    logger.error('[API/knowledge/search] Failed', { error: err });
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
