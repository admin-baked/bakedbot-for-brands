/**
 * POST /api/themes/delete
 *
 * Delete a WordPress theme
 *
 * Request:
 *   - Method: POST
 *   - Content-Type: application/json
 *   - Body: { orgId: string, themeId: string }
 *
 * Response:
 *   - 200: { success: true, deletedThemeId, fallbackToDefault }
 *   - 400: { success: false, error }
 *   - 401: { error: "Unauthorized" }
 *   - 500: { error: "Internal server error" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteThemeAction } from '@/server/actions/themes';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, themeId } = body;

    if (!orgId || !themeId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID and Theme ID required' },
        { status: 400 },
      );
    }

    // Call server action
    const result = await deleteThemeAction(orgId, themeId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      );
    }

    logger.info('[API] Theme deleted', {
      orgId,
      themeId,
      fallbackToDefault: result.fallbackToDefault,
    });

    return NextResponse.json(
      {
        success: true,
        deletedThemeId: result.deletedThemeId,
        fallbackToDefault: result.fallbackToDefault,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('[API] Theme delete error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
