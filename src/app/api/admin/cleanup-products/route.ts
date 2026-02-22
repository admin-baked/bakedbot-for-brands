/**
 * API Route: Product Cleanup Endpoint
 *
 * POST /api/admin/cleanup-products?action=audit|execute&orgId=org_thrive_syracuse
 *
 * Query params:
 *   - action: 'audit' (preview) or 'execute' (delete)
 *   - orgId: organization ID to clean
 *
 * Headers:
 *   - Authorization: Bearer <Firebase ID Token> (must be super_user)
 *
 * Examples:
 *   curl -X POST http://localhost:3000/api/admin/cleanup-products?action=audit&orgId=org_thrive_syracuse \
 *     -H "Authorization: Bearer <token>"
 *
 *   curl -X POST http://localhost:3000/api/admin/cleanup-products?action=execute&orgId=org_thrive_syracuse \
 *     -H "Authorization: Bearer <token>"
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
  auditOrphanedProducts,
  executeProductCleanup,
} from '@/server/actions/cleanup-products';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await requireSuperUser();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'audit';
    const orgId = searchParams.get('orgId') || '';

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query param required' },
        { status: 400 }
      );
    }

    if (!['audit', 'execute'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "audit" or "execute"' },
        { status: 400 }
      );
    }

    logger.info('Product cleanup request', {
      action,
      orgId,
      userId: session.uid,
      userRole: session.role,
    });

    // Execute action
    let result;
    if (action === 'audit') {
      result = await auditOrphanedProducts(orgId);
    } else {
      result = await executeProductCleanup(orgId);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error('Product cleanup request failed', {
      error: message,
    });

    // Check if it's an auth error
    if (message.includes('Unauthorized') || message.includes('require')) {
      return NextResponse.json(
        { error: 'Unauthorized. Must be super_user.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Allow GET for testing (same as POST)
export async function GET(request: NextRequest) {
  return POST(request);
}
