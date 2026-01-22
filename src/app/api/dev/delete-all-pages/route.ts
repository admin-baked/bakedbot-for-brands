import { NextResponse } from 'next/server';
import { deleteAllPages } from '@/server/actions/delete-pages';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large deletions

/**
 * DEV ONLY: DELETE /api/dev/delete-all-pages
 *
 * Deletes ALL generated pages from Firestore.
 * WARNING: This is destructive and cannot be undone.
 *
 * SECURITY: Blocked in production and requires Super User authentication.
 */
export async function DELETE() {
    // SECURITY: Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Dev route disabled in production' },
            { status: 403 }
        );
    }

    // SECURITY: Require Super User authentication
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        logger.info('Starting mass page deletion...');
        const result = await deleteAllPages();

        if (result.success) {
            logger.info('All pages deleted successfully');
            return NextResponse.json({
                success: true,
                message: 'All pages deleted from seo_pages, generated_pages_metadata, and foot_traffic collections'
            });
        } else {
            logger.error('Delete failed', { error: result.error });
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error('Error in delete API', { error: message });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
