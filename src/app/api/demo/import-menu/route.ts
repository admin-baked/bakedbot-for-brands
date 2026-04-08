export const dynamic = 'force-dynamic';
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { discovery } from '@/server/services/firecrawl';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';
import { extractMenuDataFromUrl } from '@/server/services/menu-import';

/**
 * Menu Import API for Demo Experience
 *
 * Extracts dispensary menu data from a URL using Firecrawl
 * to let potential customers preview their menu in BakedBot's interface
 *
 * SECURITY: Requires authentication to prevent abuse of per-page billed Firecrawl API.
 */

// Request body schema
const RequestSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  extractColors: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  // SECURITY: Require authentication to prevent abuse of per-page billed API
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url } = RequestSchema.parse(body);

    logger.info('[Menu Import] Starting extraction', { url });

    // Check if Discovery is configured
    if (!discovery.isConfigured()) {
      return NextResponse.json(
        { error: 'Menu import service is not configured' },
        { status: 503 }
      );
    }

    const normalizedData = await extractMenuDataFromUrl(url);

    logger.info('[Menu Import] Extraction complete', {
      url,
      productCount: normalizedData.products.length,
      hasPromos: !!normalizedData.promotions?.length,
    });

    return NextResponse.json({
      success: true,
      data: normalizedData,
      meta: {
        sourceUrl: url,
        extractedAt: new Date().toISOString(),
        productCount: normalizedData.products.length,
      },
    });
  } catch (error) {
    logger.error('[Menu Import] Extraction failed', error instanceof Error ? error : new Error(String(error)));

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Failed to extract menu data') {
      return NextResponse.json(
        { error: 'Failed to extract menu data from the provided URL' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to import menu. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}
