'use server';

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

/**
 * Deletes a single generated page and its metadata.
 */
export async function deletePage(pageId: string) {
    const { firestore } = await createServerClient();

    try {
        // 1. Get the page to find its metadata path if needed
        // Assuming 'seo_pages' contains the main content
        const pageRef = firestore.collection('seo_pages').doc(pageId);

        // 2. Delete the page document
        await pageRef.delete();

        // 3. Delete from metadata collection (if separate) or index
        // Assuming 'generated_pages_metadata' uses the same ID or we need to find it?
        // If IDs match:
        await firestore.collection('generated_pages_metadata').doc(pageId).delete();

        logger.info(`Deleted page ${pageId}`);
        return { success: true };
    } catch (error: any) {
        logger.error('Error deleting page', error);
        return { success: false, error: 'Failed to delete page' };
    }
}

/**
 * Deletes ALL generated pages.
 * WARNING: Destructive.
 */
export async function deleteAllPages() {
    const { firestore } = await createServerClient();

    try {
        logger.warn('Starting batch deletion of ALL pages...');

        // Helper to delete collection in batches
        const deleteCollection = async (collectionPath: string) => {
            const collectionRef = firestore.collection(collectionPath);
            const query = collectionRef.orderBy('__name__').limit(500);

            return new Promise((resolve, reject) => {
                deleteQueryBatch(firestore, query, resolve).catch(reject);
            });
        };



        // Delete 'seo_pages' and 'generated_pages_metadata'
        await deleteCollection('seo_pages');
        await deleteCollection('generated_pages_metadata');

        logger.info('All pages deleted successfully.');
        return { success: true };

    } catch (error: any) {
        logger.error('Error deleting all pages', error);
        return { success: false, error: 'Failed to delete all pages' };
    }
}

async function deleteQueryBatch(db: any, query: any, resolve: any) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}
