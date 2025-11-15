
'use server';

import { createServerClient } from '@/firebase/server-client';
import { demoProducts, demoCustomer } from '@/lib/data';
import { FieldValue } from 'firebase-admin/firestore';

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
            // Ensure server timestamp is used if not present, and it's a valid Firestore Timestamp
            createdAt: review.createdAt instanceof Date ? review.createdAt : FieldValue.serverTimestamp(),
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

        // 1. Clear Products' subcollections (reviews) first
        const productsSnapshot = await firestore.collection('products').get();
        const reviewDeletionPromises = productsSnapshot.docs.map(async (productDoc) => {
            const reviewsSnapshot = await productDoc.ref.collection('reviews').get();
            const batch = firestore.batch();
            reviewsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        });
        await Promise.all(reviewDeletionPromises);

        // 2. Clear Products
        const productsBatch = firestore.batch();
        productsSnapshot.docs.forEach(doc => productsBatch.delete(doc.ref));
        await productsBatch.commit();
        
        // 3. Clear productReviewEmbeddings
        const embeddingsBatch = firestore.batch();
        const embeddingsSnapshot = await firestore.collectionGroup('productReviewEmbeddings').get();
        embeddingsSnapshot.docs.forEach(doc => embeddingsBatch.delete(doc.ref));
        await embeddingsBatch.commit();

        return {
            success: true,
            message: `Successfully deleted ${productsSnapshot.size} products and their associated data.`,
        };

    } catch (error: any) {
        console.error("Clearing demo data failed:", error);
        return {
            success: false,
            message: `An error occurred while clearing data: ${error.message}`,
        };
    }
}
