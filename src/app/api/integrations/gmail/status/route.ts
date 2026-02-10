import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';

/**
 * GET /api/integrations/gmail/status
 *
 * Returns the current Gmail connection status for the authenticated user.
 */
export async function GET() {
    try {
        const user = await requireUser();
        const credentials = await getGmailToken(user.uid);

        if (!credentials || !credentials.refresh_token) {
            return NextResponse.json({
                connected: false,
                email: null
            });
        }

        // We have a refresh token, so Gmail is connected
        // Note: We don't store the email separately, but could fetch it from userinfo
        return NextResponse.json({
            connected: true,
            email: user.email // Use the logged-in user's email as an approximation
        });
    } catch (error: any) {
        console.error('[Gmail Status] Error:', error);
        return NextResponse.json({
            connected: false,
            error: error.message
        });
    }
}
