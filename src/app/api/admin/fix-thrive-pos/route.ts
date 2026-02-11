import { NextRequest, NextResponse } from 'next/server';
import { fixThriveSyracusePOS } from './action';

/**
 * Admin endpoint to fix Thrive Syracuse POS configuration.
 * SECURITY: Requires Super User session (enforced by action).
 * SECURITY: Requires explicit admin action header to prevent CSRF.
 *
 * POST /api/admin/fix-thrive-pos
 */
const ADMIN_ACTION_HEADER = 'x-bakedbot-admin-action';
const EXPECTED_ADMIN_ACTION = 'fix-thrive-pos';

function getErrorStatus(error: any): number {
    const message = error?.message || '';
    const isAuthError = message.includes('Unauthorized');
    const isPermissionError = message.includes('Forbidden') || message.includes('Super User');
    return isAuthError ? 401 : isPermissionError ? 403 : 500;
}

export async function GET() {
    return NextResponse.json(
        {
            success: false,
            error: 'Method Not Allowed. Use POST.',
        },
        {
            status: 405,
            headers: { Allow: 'POST' },
        }
    );
}

export async function POST(request: NextRequest) {
    const actionHeader = request.headers.get(ADMIN_ACTION_HEADER);

    if (actionHeader !== EXPECTED_ADMIN_ACTION) {
        return NextResponse.json(
            {
                success: false,
                error: `Missing or invalid ${ADMIN_ACTION_HEADER} header.`,
            },
            { status: 403 }
        );
    }

    try {
        const result = await fixThriveSyracusePOS();
        return NextResponse.json(result);
    } catch (error: any) {
        const status = getErrorStatus(error);

        return NextResponse.json({
            success: false,
            error: error.message
        }, { status });
    }
}
