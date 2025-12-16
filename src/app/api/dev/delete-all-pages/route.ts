
import { NextResponse } from 'next/server';
import { deleteAllPages } from '@/server/actions/delete-pages';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large deletions

/**
 * DELETE /api/dev/delete-all-pages
 * 
 * Deletes ALL generated pages from Firestore.
 * WARNING: This is destructive and cannot be undone.
 */
export async function DELETE() {
    try {
        console.log('Starting mass page deletion...');
        const result = await deleteAllPages();

        if (result.success) {
            console.log('All pages deleted successfully');
            return NextResponse.json({
                success: true,
                message: 'All pages deleted from seo_pages, generated_pages_metadata, and foot_traffic collections'
            });
        } else {
            console.error('Delete failed:', result.error);
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (e: any) {
        console.error('Error in delete API:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
