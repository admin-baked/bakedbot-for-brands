import { NextResponse } from 'next/server';
import { fixEssexApothecary } from '@/server/actions/admin/fix-essex';

/**
 * Admin endpoint to fix Essex Apothecary organization configuration.
 * SECURITY: Requires Super User session (enforced by fixEssexApothecary action).
 */
export async function GET() {
    try {
        const result = await fixEssexApothecary();
        return NextResponse.json(result);
    } catch (error: any) {
        // Return 401 for auth errors, 403 for permission errors, 500 for others
        const isAuthError = error.message?.includes('Unauthorized');
        const isPermissionError = error.message?.includes('Forbidden') || error.message?.includes('Super User');
        const status = isAuthError ? 401 : isPermissionError ? 403 : 500;

        return NextResponse.json({
            success: false,
            error: error.message
        }, { status });
    }
}
