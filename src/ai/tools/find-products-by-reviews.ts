
'use server';
/**
 * @fileOverview A Genkit tool for finding products based on the semantic content of their reviews.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import type { Product } from '@/firebase/converters';
import { googleAI } from '@genkit-ai/google-genai';

const FindProductsByReviewsInputSchema = z.object({
  query: z.string().describe('The user query describing what they are looking for in product reviews (e.g., "helps with sleep", "tastes like citrus").'),
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

const FindProductsByReviewsOutputSchema = z.array(ProductSchema);

export const findProductsByReviewContent = ai.defineTool(
  {
    name: 'findProductsByReviewContent',
    description: "Finds products where the customer reviews semantically match the user's query.",
    inputSchema: FindProductsByReviewsInputSchema,
    outputSchema: FindProductsByReviewsOutputSchema,
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

      // 2. Query the productReviewEmbeddings collection group for the most similar review summaries.
      const reviewsEmbeddingCollection = firestore.collectionGroup('productReviewEmbeddings');
      const vectorQuery = reviewsEmbeddingCollection.findNearest('embedding', queryEmbedding, {
        limit: limit,
        distanceMeasure: 'COSINE'
      });

      const querySnapshot = await vectorQuery.get();

      if (querySnapshot.empty) {
        return [];
      }

      // 3. Get the parent product document for each matching embedding.
      const productPromises = querySnapshot.docs.map(doc => {
          const productRef = doc.ref.parent.parent; // The parent of the subcollection is the product doc
          if (!productRef) return null;
          return productRef.get();
      }).filter(p => p !== null);

      const productDocs = await Promise.all(productPromises as Promise<FirebaseFirestore.DocumentSnapshot>[]);

      // 4. Map the results to the Product schema.
      const similarProducts = productDocs.map(doc => {
        if (!doc.exists) return null;
        const product = { id: doc.id, ...doc.data() } as Product;
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
      }).filter((p): p is Exclude<typeof p, null> => p !== null);


      return similarProducts;

    } catch (error) {
      console.error('Error finding products by review content:', error);
      return [];
    }
  }
);

    