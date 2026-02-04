import { NextResponse } from 'next/server';
import { fixThriveSyracusePOS } from './action';

/**
 * Admin endpoint to fix Thrive Syracuse POS configuration.
 * SECURITY: Requires Super User session (enforced by action).
 *
 * GET /api/admin/fix-thrive-pos
 */
export async function GET() {
    try {
        const result = await fixThriveSyracusePOS();
        return NextResponse.json(result);
    } catch (error: any) {
        const isAuthError = error.message?.includes('Unauthorized');
        const isPermissionError = error.message?.includes('Forbidden') || error.message?.includes('Super User');
        const status = isAuthError ? 401 : isPermissionError ? 403 : 500;

        return NextResponse.json({
            success: false,
            error: error.message
        }, { status });
    }
}
