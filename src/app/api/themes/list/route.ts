/**
 * GET /api/themes/list
 *
 * List themes for an organization (paginated)
 *
 * Query parameters:
 *   - orgId: string (required)
 *   - pageSize: number (optional, default: 5)
 *   - pageNumber: number (optional, default: 1)
 *
 * Response:
 *   - 200: { success: true, themes, total, pageSize, hasMore }
 *   - 400: { success: false, error }
 *   - 401: { error: "Unauthorized" }
 *   - 500: { error: "Internal server error" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { listThemesAction } from '@/server/actions/themes';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const pageSize = parseInt(searchParams.get('pageSize') || '5');
    const pageNumber = parseInt(searchParams.get('pageNumber') || '1');

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 400 },
      );
    }

    if (pageSize < 1 || pageSize > 50) {
      return NextResponse.json(
        { success: false, error: 'Page size must be between 1 and 50' },
        { status: 400 },
      );
    }

    if (pageNumber < 1) {
      return NextResponse.json(
        { success: false, error: 'Page number must be >= 1' },
        { status: 400 },
      );
    }

    // Call server action
    const result = await listThemesAction(orgId, pageSize, pageNumber);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      );
    }

    logger.info('[API] Themes listed', {
      orgId,
      count: result.themes.length,
      total: result.total,
      pageNumber,
    });

    return NextResponse.json(
      {
        success: true,
        themes: result.themes,
        total: result.total,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('[API] Themes list error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
