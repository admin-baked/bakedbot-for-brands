/**
 * @fileoverview An AI tool that finds products based on the semantic content of their reviews.
 * This is a copy of the main app's tool, intended for use within the Cloud Functions environment.
 */
'use server';

import { ai } from '../genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { textEmbeddingGecko } from '@genkit-ai/google-genai';

interface Product { id: string; [key: string]: any; }

const FindProductsByReviewContentInputSchema = z.object({
  query: z.string().describe('A natural language query describing what the user is looking for in a product based on customer experiences.'),
  limit: z.number().optional().default(5).describe('The maximum number of products to return.'),
});


export const findProductsByReviewContent = ai.defineTool(
  {
    name: 'findProductsByReviewContent',
    description: 'Finds products by semantically searching the content of their customer reviews. Use this to answer queries about what customers are saying, product effects, tastes, or use cases (e.g., "helps with sleep", "tastes like citrus").',
    inputSchema: FindProductsByReviewContentInputSchema,
    outputSchema: z.array(z.custom<Product>()),
  },
  async (input) => {
    const { query, limit } = input;
    const firestore = getFirestore();

    const queryEmbedding = await ai.embed({
      embedder: textEmbeddingGecko,
      content: query,
    });

    const vectorQuery = firestore
      .collectionGroup('productReviewEmbeddings')
      .findNearest('embedding', queryEmbedding, {
        limit,
        distanceMeasure: 'COSINE',
      });
      
    const nearestDocs = await vectorQuery.get();
    
    if (nearestDocs.empty) {
      return [];
    }

    const productIds = nearestDocs.docs.map(doc => doc.data().productId);

    if (productIds.length === 0) {
        return [];
    }
    
    const productsRef = firestore.collection('products');
    const productDocs = await productsRef.where('__name__', 'in', productIds).get();

    const productsById = new Map(productDocs.docs.map(doc => [doc.id, {id: doc.id, ...doc.data()}]));
    const sortedProducts = productIds.map(id => productsById.get(id)).filter((p): p is Product => !!p);
    
    return sortedProducts;
  }
);
