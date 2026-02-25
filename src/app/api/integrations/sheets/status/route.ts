import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getSheetsToken } from '@/server/integrations/sheets/token-storage';

/**
 * GET /api/integrations/sheets/status
 *
 * Returns the current Google Sheets connection status for the authenticated user.
 */
export async function GET() {
    try {
        const user = await requireUser();
        const credentials = await getSheetsToken(user.uid);

        if (!credentials || !credentials.refresh_token) {
            return NextResponse.json({ connected: false });
        }

        return NextResponse.json({ connected: true });
    } catch (error: any) {
        return NextResponse.json({ connected: false, error: error.message });
    }
}
