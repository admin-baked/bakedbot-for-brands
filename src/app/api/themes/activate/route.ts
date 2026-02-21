/**
 * POST /api/themes/activate
 *
 * Activate a WordPress theme for an organization
 *
 * Request:
 *   - Method: POST
 *   - Content-Type: application/json
 *   - Body: { orgId: string, themeId: string }
 *
 * Response:
 *   - 200: { success: true, activeThemeId }
 *   - 400: { success: false, error }
 *   - 401: { error: "Unauthorized" }
 *   - 500: { error: "Internal server error" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { activateThemeAction } from '@/server/actions/themes';
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
    const result = await activateThemeAction(orgId, themeId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      );
    }

    logger.info('[API] Theme activated', {
      orgId,
      themeId,
      activeThemeId: result.activeThemeId,
    });

    return NextResponse.json(
      {
        success: true,
        activeThemeId: result.activeThemeId,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('[API] Theme activate error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
