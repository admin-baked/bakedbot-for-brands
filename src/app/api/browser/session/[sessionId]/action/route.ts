/**
 * Browser Action API Route
 *
 * POST /api/browser/session/[sessionId]/action - Execute browser action
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import {
  browserSessionManager,
  permissionGuard,
  actionValidator,
} from '@/server/services/browser-automation';
import { logger } from '@/lib/logger';
import type { BrowserAction } from '@/types/browser-automation';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/browser/session/[sessionId]/action - Execute a browser action
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await requireSuperUser();
    const action: BrowserAction = await request.json();

    // Get current session state for URL context
    const stateResult = await browserSessionManager.getSessionState(sessionId);
    if (!stateResult.success || !stateResult.data) {
      return NextResponse.json(
        { success: false, error: stateResult.error || 'Session not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const currentUrl = action.url || stateResult.data.currentUrl;

    // Validate action
    const validation = actionValidator.validate(action, currentUrl);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.reason },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check permissions for the domain
    if (currentUrl && action.type !== 'navigate') {
      const permResult = await permissionGuard.checkPermission(
        session.uid,
        currentUrl,
        action.type
      );

      if (!permResult.allowed) {
        return NextResponse.json(
          { success: false, error: permResult.reason },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // For navigation, check the target URL
    if (action.type === 'navigate' && action.url) {
      const permResult = await permissionGuard.checkPermission(
        session.uid,
        action.url,
        'navigate'
      );

      if (!permResult.allowed) {
        return NextResponse.json(
          { success: false, error: permResult.reason },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // Check if high-risk action requires confirmation
    if (validation.isHighRisk && validation.riskType) {
      const domain = currentUrl ? new URL(currentUrl).hostname : 'unknown';
      const description = actionValidator.describeAction(action, currentUrl);

      const confirmToken = await permissionGuard.requireConfirmation(
        session.uid,
        validation.riskType,
        domain,
        description
      );

      if (confirmToken) {
        return NextResponse.json(
          {
            success: false,
            requiresConfirmation: true,
            confirmationToken: confirmToken,
            error: `This action requires confirmation: ${description}`,
          },
          { status: 202, headers: corsHeaders }
        );
      }
    }

    // Execute the action
    const result = await browserSessionManager.executeAction(sessionId, action);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    logger.error('Failed to execute browser action', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to execute action' },
      { status: 500, headers: corsHeaders }
    );
  }
}
