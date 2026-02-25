import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getDriveToken } from '@/server/integrations/drive/token-storage';

/**
 * GET /api/integrations/drive/status
 *
 * Returns the current Google Drive connection status for the authenticated user.
 */
export async function GET() {
    try {
        const user = await requireUser();
        const credentials = await getDriveToken(user.uid);

        if (!credentials || !credentials.refresh_token) {
            return NextResponse.json({ connected: false });
        }

        return NextResponse.json({ connected: true });
    } catch (error: any) {
        return NextResponse.json({ connected: false, error: error.message });
    }
}
