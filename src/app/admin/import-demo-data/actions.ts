'use server';

import { createServerClient } from '@/firebase/server-client';
import { demoProducts, demoCustomer } from '@/lib/data';

export async function importDemoData() {
  try {
    const { firestore } = await createServerClient();
    const batch = firestore.batch();

    // 1. Import Products
    demoProducts.forEach(product => {
      const productRef = firestore.collection('products').doc(product.id);
      // We explicitly set the data to match the demo data shape
      batch.set(productRef, {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        prices: product.prices,
        imageUrl: product.imageUrl,
        imageHint: product.imageHint,
        description: product.description,
        likes: product.likes || 0,
        dislikes: product.dislikes || 0,
      });
    });

    // 2. Import Reviews
    demoCustomer.reviews.forEach(review => {
      if (review.id && review.productId) {
        // Create a reference to the review document within the product's "reviews" subcollection
        const reviewRef = firestore.collection('products').doc(review.productId).collection('reviews').doc(review.id);
        batch.set(reviewRef, {
            ...review,
            // Ensure server timestamp is used if not present
            createdAt: review.createdAt || new Date(),
        });
      }
    });
    
    await batch.commit();

    return {
      success: true,
      message: 'Successfully imported demo products and reviews into Firestore.',
      productCount: demoProducts.length,
      reviewCount: demoCustomer.reviews.length,
    };

  } catch (error: any) {
    console.error("Demo data import failed:", error);
    return {
      success: false,
      message: `An error occurred during import: ${error.message}`,
    };
  }
}

export async function clearDemoData() {
    try {
        const { firestore } = await createServerClient();

        // 1. Clear Products
        const productsBatch = firestore.batch();
        const productsSnapshot = await firestore.collection('products').get();
        productsSnapshot.docs.forEach(doc => productsBatch.delete(doc.ref));
        await productsBatch.commit();
        
        // 2. Clear productReviewEmbeddings (as they correspond to products)
        const embeddingsBatch = firestore.batch();
        const embeddingsSnapshot = await firestore.collectionGroup('productReviewEmbeddings').get();
        embeddingsSnapshot.docs.forEach(doc => embeddingsBatch.delete(doc.ref));
        await embeddingsBatch.commit();

        return {
            success: true,
            message: `Successfully deleted ${productsSnapshot.size} products and their associated embeddings.`,
        };

    } catch (error: any) {
        console.error("Clearing demo data failed:", error);
        return {
            success: false,
            message: `An error occurred while clearing data: ${error.message}`,
        };
    }
}
