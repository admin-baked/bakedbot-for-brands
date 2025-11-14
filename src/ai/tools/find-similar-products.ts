
'use server';
/**
 * @fileOverview A Genkit tool for finding similar products using Firestore Vector Search.
 * This tool now searches across both product description embeddings and review summary embeddings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import type { Product } from '@/firebase/converters';
import { googleAI } from '@genkit-ai/google-genai';

const FindSimilarProductsInputSchema = z.object({
  query: z.string().describe('The user query to find similar products for.'),
  limit: z.number().optional().default(5).describe('The maximum number of products to return.'),
});

const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    categoryId: z.string(),
    price: z.number(),
    description: z.string(),
    likes: z.number().optional(),
    dislikes: z.number().optional(),
    imageUrl: z.string().url(),
    imageHint: z.string(),
    prices: z.record(z.number()),
});


const FindSimilarProductsOutputSchema = z.array(ProductSchema);

export const findSimilarProducts = ai.defineTool(
  {
    name: 'findSimilarProducts',
    description: 'Finds products with descriptions or review summaries semantically similar to the user\'s query using vector search.',
    inputSchema: FindSimilarProductsInputSchema,
    outputSchema: FindSimilarProductsOutputSchema,
  },
  async ({ query, limit }) => {
    try {
      const { firestore } = await createServerClient();
      
      // 1. Generate an embedding for the user's query.
      const embeddingResponse = await ai.embed({
        model: googleAI.model('text-embedding-004'),
        content: query,
      });
      const queryEmbedding = embeddingResponse.embedding;

      // 2. Query both collections in parallel.
      const productsCollection = firestore.collection('products');
      const reviewsEmbeddingCollection = firestore.collectionGroup('productReviewEmbeddings');

      const productVectorQuery = productsCollection.findNearest('embedding', queryEmbedding, {
        limit: limit,
        distanceMeasure: 'COSINE'
      });

      const reviewVectorQuery = reviewsEmbeddingCollection.findNearest('embedding', queryEmbedding, {
        limit: limit,
        distanceMeasure: 'COSINE'
      });

      const [productSnapshot, reviewSnapshot] = await Promise.all([
          productVectorQuery.get(),
          reviewVectorQuery.get()
      ]);
      
      // 3. Combine and de-duplicate results.
      const combinedResults = new Map<string, Product>();

      // Process product description results
      for (const doc of productSnapshot.docs) {
          const product = { id: doc.id, ...doc.data() } as Product;
          if (!combinedResults.has(product.id)) {
              combinedResults.set(product.id, product);
          }
      }

      // Process review embedding results
      for (const doc of reviewSnapshot.docs) {
          const productRef = doc.ref.parent.parent; // Navigate up to the product document
          if (productRef) {
            const productDoc = await productRef.get();
            if (productDoc.exists && !combinedResults.has(productDoc.id)) {
                const product = { id: productDoc.id, ...productDoc.data() } as Product;
                combinedResults.set(product.id, product);
            }
          }
      }
      
      // 4. Map the results to the Product schema.
      const similarProducts = Array.from(combinedResults.values()).slice(0, limit).map(product => {
          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            prices: product.prices,
            imageUrl: product.imageUrl,
            imageHint: product.imageHint,
            categoryId: product.category,
            likes: product.likes ?? 0,
            dislikes: product.dislikes ?? 0,
        };
      });

      return similarProducts;

    } catch (error) {
      console.error('Error finding similar products with vector search:', error);
      // Return an empty array to prevent the entire flow from breaking.
      return [];
    }
  }
);

    