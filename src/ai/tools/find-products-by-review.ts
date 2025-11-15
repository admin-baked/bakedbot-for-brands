

'use server';
/**
 * @fileoverview An AI tool that finds products based on the semantic content of their reviews.
 */

import { ai } from '@/ai/genkit';
import { createServerClient } from '@/firebase/server-client';
import { productConverter, type Product } from '@/firebase/converters';
import { z } from 'zod';
import { textEmbeddingGecko } from '@genkit-ai/google-genai';

const FindProductsByReviewContentInputSchema = z.object({
  query: z.string().describe('A natural language query describing what the user is looking for in a product based on customer experiences.'),
  limit: z.number().optional().default(5).describe('The maximum number of products to return.'),
});
type FindProductsByReviewContentInput = z.infer<typeof FindProductsByReviewContentInputSchema>;


export const findProductsByReviewContent = ai.defineTool(
  {
    name: 'findProductsByReviewContent',
    description: 'Finds products by semantically searching the content of their customer reviews. Use this to answer queries about what customers are saying, product effects, tastes, or use cases (e.g., "helps with sleep", "tastes like citrus").',
    inputSchema: FindProductsByReviewContentInputSchema,
    outputSchema: z.array(z.custom<Product>()),
  },
  async (input) => {
    const { query, limit } = input;
    const { firestore } = await createServerClient();

    // 1. Generate an embedding for the user's query.
    const queryEmbedding = await ai.embed({
      embedder: textEmbeddingGecko,
      content: query,
    });

    // 2. Perform a vector search on the `productReviewEmbeddings` collection group.
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

    // 3. Extract the product IDs from the search results.
    const productIds = nearestDocs.docs.map(doc => doc.data().productId);

    // 4. Fetch the full product documents for the matching IDs.
    const productsRef = firestore.collection('products').withConverter(productConverter);
    const productDocs = await productsRef.where('__name__', 'in', productIds).get();

    // The order from the 'in' query is not guaranteed, so we need to re-order
    // the results to match the similarity order from the vector search.
    const productsById = new Map(productDocs.docs.map(doc => [doc.id, doc.data()]));
    const sortedProducts = productIds.map(id => productsById.get(id)).filter((p): p is Product => !!p);
    
    return sortedProducts;
  }
);

