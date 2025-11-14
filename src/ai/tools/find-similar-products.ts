'use server';
/**
 * @fileOverview A Genkit tool for finding similar products using Firestore Vector Search.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { DocumentData, FieldValue, Query, collection } from 'firebase/firestore';
import { productConverter, type Product } from '@/firebase/converters';
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
    description: 'Finds products with descriptions semantically similar to the user\'s query using vector search.',
    inputSchema: FindSimilarProductsInputSchema,
    outputSchema: FindSimilarProductsOutputSchema,
  },
  async ({ query, limit }) => {
    try {
      const { firestore } = await createServerClient();
      const productsCollection = firestore.collection('products').withConverter(productConverter);

      // 1. Generate an embedding for the user's query.
      const embeddingResponse = await ai.embed({
        model: googleAI.model('text-embedding-004'),
        content: query,
      });
      const queryEmbedding = embeddingResponse.embedding;

      // 2. Query Firestore for the most similar product embeddings.
      // This uses the findNearest method provided by the Firestore Vector Search extension.
      const vectorQuery = productsCollection.findNearest('embedding', queryEmbedding, {
        limit: limit,
        distanceMeasure: 'COSINE'
      });

      const querySnapshot = await vectorQuery.get();

      if (querySnapshot.empty) {
        return [];
      }

      // 3. Map the results to the Product schema.
      const similarProducts = querySnapshot.docs.map(doc => {
          const product = doc.data();
          // The converter adds the 'id', so the data matches the Zod schema.
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
