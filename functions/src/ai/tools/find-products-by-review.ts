/**
 * @fileOverview A Genkit tool for finding products by searching review content.
 * This file lives in the `functions` directory and is deployed as part of the
 * Cloud Function environment.
 */

import { ai } from '../genkit';
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Product } from '../../types/domain';
import { z } from 'zod';


// Initialize Firebase Admin SDK if it hasn't been already
if (!initializeApp.length) {
    initializeApp();
}

export const FindProductsByReviewInputSchema = z.object({
    query: z.string().describe('The natural language query to search for in product reviews.'),
    limit: z.number().int().positive().optional().default(5).describe('The maximum number of products to return.'),
});
export type FindProductsByReviewInput = z.infer<typeof FindProductsByReviewInputSchema>;

export const FindProductsByReviewOutputSchema = z.array(z.custom<Product>());
export type FindProductsByReviewOutput = z.infer<typeof FindProductsByReviewOutputSchema>;


export const findProductsByReviewContent = ai.defineTool(
    {
        name: 'findProductsByReviewContent',
        description: 'Finds products by semantically searching the content of their customer reviews. Use this to find products based on what customers say about them (e.g., "helps with sleep", "tastes like citrus").',
        inputSchema: FindProductsByReviewInputSchema,
        outputSchema: FindProductsByReviewOutputSchema,
    },
    async (input) => {
        const firestore = getFirestore();
        
        // 1. Generate an embedding for the user's query.
        const embedding = await ai.embed({
            embedder: 'googleai/text-embedding-004',
            content: input.query,
        });

        // 2. Perform a vector search on the product review embeddings.
        const embeddingsCollection = firestore.collectionGroup('productReviewEmbeddings');
        const vectorQuery = embeddingsCollection.findNearest('embedding', embedding, {
            limit: input.limit,
            distanceMeasure: 'COSINE'
        });

        const nearestDocsSnapshot = await vectorQuery.get();

        if (nearestDocsSnapshot.empty) {
            return [];
        }

        // 3. Extract the product IDs from the search results.
        const productIds = nearestDocsSnapshot.docs.map(doc => doc.data().productId);

        if (productIds.length === 0) {
            return [];
        }

        // 4. Fetch the full product documents for the matching IDs.
        const productsRef = firestore.collection('products');
        const productsQuery = productsRef.where('__name__', 'in', productIds);
        const productsSnapshot = await productsQuery.get();

        const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        
        // 5. Return the products in the same order as the vector search results.
        return productIds.map(id => products.find(p => p.id === id)).filter((p): p is Product => !!p);
    }
);
