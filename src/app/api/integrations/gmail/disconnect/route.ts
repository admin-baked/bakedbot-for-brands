import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

/**
 * POST /api/integrations/gmail/disconnect
 *
 * Removes the Gmail tokens for the authenticated user.
 */
export async function POST() {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();

        // Delete the Gmail integration document
        await firestore
            .collection('users')
            .doc(user.uid)
            .collection('integrations')
            .doc('gmail')
            .delete();

        return NextResponse.json({
            success: true,
            message: 'Gmail disconnected successfully'
        });
    } catch (error: any) {
        console.error('[Gmail Disconnect] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
