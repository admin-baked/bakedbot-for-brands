'use server';

import { createServerClient } from '@/firebase/server-client';
import { updateProductEmbeddings } from '@/ai/flows/update-product-embeddings';

// This is a simple type for the server action's return value.
// It will be an array of the results from each embedding flow.
export type ActionResult = {
  message: string;
  results: {
    productId: string;
    status: string;
    reviewCount: number;
  }[];
};

/**
 * A Server Action that finds all products and triggers the embedding
 * generation flow for each one. This is designed to be called from
 * an admin/CEO dashboard.
 */
export async function initializeAllEmbeddings(): Promise<ActionResult> {
  try {
    const { firestore } = await createServerClient();
    const productsSnap = await firestore.collection('products').get();

    if (productsSnap.empty) {
      return { message: 'No products found to process.', results: [] };
    }

    const productIds = productsSnap.docs.map(doc => doc.id);
    
    // Trigger the flow for each product in parallel.
    const embeddingPromises = productIds.map(productId => 
      updateProductEmbeddings({ productId })
    );

    const results = await Promise.all(embeddingPromises);

    return {
      message: `Successfully processed ${results.length} products.`,
      results: results,
    };

  } catch (error) {
    console.error('Error initializing embeddings:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Re-throw to be caught by the form state handler
    throw new Error(`Initialization failed: ${errorMessage}`);
  }
}
