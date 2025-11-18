
'use server';

import { createServerClient } from '@/firebase/server-client';
import { demoProducts, demoRetailers, demoCustomer } from '@/lib/data';
import { productConverter, retailerConverter, reviewConverter } from '@/firebase/converters';
import { WriteBatch } from 'firebase-admin/firestore';
import { updateProductEmbeddings } from '@/ai/flows/update-product-embeddings';
import { makeProductRepo } from '@/server/repos/productRepo';


// --- Data Manager Actions ---

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
      const docRef = (firestore as any).collection('products').doc(product.id).withConverter(productConverter as any);
      batch.set(docRef, product, { merge: true });
    });

    // Import retailers (dispensaries)
    demoRetailers.forEach(retailer => {
      const docRef = (firestore as any).collection('dispensaries').doc(retailer.id).withConverter(retailerConverter as any);
      batch.set(docRef, retailer, { merge: true });
    });
    
    // Import reviews
    demoCustomer.reviews.forEach(review => {
      if (review.id && review.productId) {
        const docRef = (firestore as any).collection('products').doc(review.productId).collection('reviews').doc(review.id).withConverter(reviewConverter as any);
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


// --- AI Search Index Actions ---

export type EmbeddingActionResult = {
  message: string;
  results: {
    productId: string;
    status: string;
    reviewCount: number;
  }[];
};

export async function initializeAllEmbeddings(): Promise<EmbeddingActionResult> {
  try {
    const { firestore } = await createServerClient();
    const productRepo = makeProductRepo(firestore);
    const products = await productRepo.getAll();

    if (products.length === 0) {
      return { message: 'No products found to process.', results: [] };
    }
    
    const embeddingPromises = products.map(product => 
      updateProductEmbeddings({ productId: product.id })
    );

    const results = await Promise.all(embeddingPromises);

    return {
      message: `Successfully processed ${results.length} products.`,
      results: results,
    };

  } catch (error) {
    console.error('Error initializing embeddings:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(`Initialization failed: ${errorMessage}`);
  }
}
