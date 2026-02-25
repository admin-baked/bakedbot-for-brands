import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

/**
 * POST /api/integrations/sheets/disconnect
 *
 * Removes the Google Sheets tokens for the authenticated user.
 */
export async function POST() {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();

        await firestore
            .collection('users')
            .doc(user.uid)
            .collection('integrations')
            .doc('sheets')
            .delete();

        return NextResponse.json({ success: true, message: 'Google Sheets disconnected successfully' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
