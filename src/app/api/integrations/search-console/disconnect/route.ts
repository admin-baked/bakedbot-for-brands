export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

/**
 * POST /api/integrations/search-console/disconnect
 *
 * Removes the user-specific Google Search Console tokens for the authenticated user.
 * Platform service-account access, if configured, remains available.
 */
export async function POST() {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();

        await firestore
            .collection('users')
            .doc(user.uid)
            .collection('integrations')
            .doc('google_search_console')
            .delete();

        return NextResponse.json({
            success: true,
            message: 'Google Search Console disconnected successfully',
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
