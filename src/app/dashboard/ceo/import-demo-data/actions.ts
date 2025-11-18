
'use server';

import { createServerClient } from '@/firebase/server-client';
import { demoProducts, demoRetailers, demoCustomer } from '@/lib/data';
import { productConverter, retailerConverter, reviewConverter } from '@/firebase/converters';
import { WriteBatch, collectionGroup } from 'firebase-admin/firestore';

export type ActionResult = {
  message: string;
  error: boolean;
};

export async function importDemoData(): Promise<ActionResult> {
  try {
    const { firestore } = await createServerClient();
    const batch = firestore.batch();

    // Import products
    demoProducts.forEach(product => {
      const docRef = firestore.collection('products').doc(product.id).withConverter(productConverter);
      batch.set(docRef, product, { merge: true });
    });

    // Import retailers (dispensaries)
    demoRetailers.forEach(retailer => {
      const docRef = firestore.collection('dispensaries').doc(retailer.id).withConverter(retailerConverter);
      batch.set(docRef, retailer, { merge: true });
    });
    
    // Import reviews
    demoCustomer.reviews.forEach(review => {
      if (review.id && review.productId) {
        const docRef = firestore.collection('products').doc(review.productId).collection('reviews').doc(review.id).withConverter(reviewConverter);
        batch.set(docRef, review as any, { merge: true });
      }
    });

    await batch.commit();
    return { message: 'Demo data imported successfully!', error: false };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Failed to import demo data: ${errorMessage}`, error: true };
  }
}

export async function clearAllData(): Promise<ActionResult> {
    try {
        const { firestore } = await createServerClient();
        const collectionsToDelete = ['products', 'dispensaries', 'orders'];
        const batchSize = 100;

        for (const collectionName of collectionsToDelete) {
            let query = firestore.collection(collectionName).limit(batchSize);
            let snapshot;

            while ((snapshot = await query.get()).size > 0) {
                const batch = firestore.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
        }
        
        // Also clear sub-collections like reviews and feedback
        const reviewsQuery = firestore.collectionGroup('reviews').limit(batchSize);
        let reviewsSnapshot;
        while ((reviewsSnapshot = await reviewsQuery.get()).size > 0) {
            const batch = firestore.batch();
            reviewsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        const feedbackQuery = firestore.collectionGroup('feedback').limit(batchSize);
        let feedbackSnapshot;
         while ((feedbackSnapshot = await feedbackQuery.get()).size > 0) {
            const batch = firestore.batch();
            feedbackSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        return { message: 'All specified data has been cleared.', error: false };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { message: `Failed to clear data: ${errorMessage}`, error: true };
    }
}
