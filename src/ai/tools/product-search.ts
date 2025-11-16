'use server';

/**
 * @fileOverview A Genkit tool for performing semantic search on product embeddings.
 */

import { ai, defineTool } from '@/ai/genkit';
import { createServerClient } from '@/firebase/server-client';
import { z } from 'zod';

async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await ai.embed({
    model: 'googleai/text-embedding-004',
    content: text,
  });
  return embedding;
}

export const productSearch = defineTool(
  {
    name: 'productSearch',
    description: 'Searches for products that are semantically similar to a user query by searching reviews, descriptions, and product details. Returns a list of relevant products.',
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
    const queryEmbedding = await generateEmbedding(input.query);

    try {
      const vectorQueryResult = await firestore.collectionGroup('productReviewEmbeddings').findNearest('embedding', queryEmbedding, {
        limit: 5,
        distanceMeasure: 'COSINE',
      });
      
      const productDocs = await Promise.all(
        vectorQueryResult.docs.map(doc => firestore.collection('products').doc(doc.data().productId).get())
      );

      const products = productDocs
        .filter(doc => doc.exists)
        .map(doc => {
            const data = doc.data()!;
            return {
                id: doc.id,
                name: data.name,
                description: data.description,
                category: data.category,
                price: data.price,
            };
        });

      return { products };

    } catch (e: any) {
        if (e.message.includes('requires a vector index')) {
            console.error('Firestore Vector Index Missing:', e.message);
            throw new Error('The product search tool is not available because the required Firestore vector index has not been built. Please check your Firestore setup.');
        }
        console.error('Vector search error:', e);
        throw e;
    }
  }
);
