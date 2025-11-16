
'use server';

/**
 * @fileOverview A Genkit tool for performing semantic or keyword search on products.
 */

import { ai } from '@/ai/genkit';
import { createServerClient } from '@/firebase/server-client';
import { z } from 'zod';
import { generateEmbedding } from '@/ai/utils/generate-embedding';
import type { Product } from '@/firebase/converters';

export const productSearch = ai.defineTool(
  {
    name: 'productSearch',
    description: 'Searches for products. Returns a list of relevant products based on the query.',
    inputSchema: z.object({
      query: z.string().describe('The user query to search for. E.g., "something to help me sleep"'),
    }),
    outputSchema: z.object({
      products: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        category: z.string(),
        price: z.number(),
      })),
    }),
  },
  async (input) => {
    const { firestore } = await createServerClient();
    let products: Product[] = [];

    try {
      // --- Primary Strategy: Vector Search ---
      console.log(`Attempting vector search for query: "${input.query}"`);
      const queryEmbedding = await generateEmbedding(input.query);
      
      const vectorQuery = firestore.collectionGroup('productReviewEmbeddings').findNearest('embedding', queryEmbedding, {
        limit: 5,
        distanceMeasure: 'COSINE',
      });
      
      const vectorQuerySnapshot = await vectorQuery.get();
      
      if (vectorQuerySnapshot.docs.length > 0) {
        const productDocs = await Promise.all(
          vectorQuerySnapshot.docs.map(doc => firestore.collection('products').doc(doc.data().productId).get())
        );

        products = productDocs
          .filter(doc => doc.exists)
          .map(doc => ({ id: doc.id, ...doc.data() } as Product));
        
        console.log(`Vector search successful. Found ${products.length} products.`);
        return { products };
      }
    } catch (e: any) {
        console.warn(`Vector search failed: ${e.message}. Falling back to keyword search.`);
        // Fall through to keyword search if vector search fails for any reason
    }
    
    // --- Fallback Strategy: Keyword Search ---
    console.log(`Falling back to keyword search for query: "${input.query}"`);
    try {
      // A very simple keyword search. In a real app, you might use a more robust
      // search service like Algolia or a more complex Firestore query.
      const allProductsSnap = await firestore.collection('products').get();
      const allProducts = allProductsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

      const queryWords = input.query.toLowerCase().split(/\s+/);
      
      products = allProducts.filter(product => {
        const searchableText = `${product.name} ${product.description} ${product.category}`.toLowerCase();
        return queryWords.some(word => searchableText.includes(word));
      }).slice(0, 5); // Limit to 5 results

      console.log(`Keyword search successful. Found ${products.length} products.`);
      return { products };
      
    } catch (keywordError: any) {
       console.error(`Keyword search also failed:`, keywordError);
       // If both fail, return empty results so the AI can respond gracefully.
       return { products: [] };
    }
  }
);
