'use server';
/**
 * @fileOverview Recommends products to users based on their queries, preferences, and past interactions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { createServerClient } from '@/firebase/server-client';
import admin from 'firebase-admin';
import type { Product } from '@/lib/types';

const RecommendProductsInputSchema = z.object({
  query: z.string().describe('The user query or description of what they are looking for.'),
  customerHistory: z.string().optional().describe('A summary of the customer purchase history and preferences.'),
});
export type RecommendProductsInput = z.infer<typeof RecommendProductsInputSchema>;

const RecommendedProductSchema = z.object({
  productId: z.string().describe('The unique ID of the recommended product.'),
  productName: z.string().describe('The name of the recommended product.'),
  reasoning: z.string().describe('A brief, one-sentence, user-facing reason why this specific product was recommended based on the user query.'),
});

const RecommendProductsOutputSchema = z.object({
  products: z.array(RecommendedProductSchema).describe('A list of products recommended for the user.'),
  overallReasoning: z.string().describe('The overall reasoning behind the set of product recommendations.'),
});
export type RecommendProductsOutput = z.infer<typeof RecommendProductsOutputSchema>;

/**
 * Generate embedding using Vertex AI with Firebase Admin auth
 */
async function generateQueryEmbedding(text: string): Promise<number[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8';
  
  const { auth } = await createServerClient();
  const accessToken = await auth.createCustomToken('server');

  const app = admin.app();
  const credential = app.options.credential;
  if (!credential) {
      throw new Error('Firebase Admin SDK credential is not available.');
  }
  const token = await credential.getAccessToken();
  
  if (!token || !token.access_token) {
    throw new Error('Failed to get access token from Firebase Admin');
  }

  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/text-embedding-004:predict`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ content: text }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.predictions[0].embeddings.values;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find similar products using manual cosine similarity
 * (Fallback method that doesn't require vector search index)
 */
async function findSimilarProducts(query: string, limit: number = 5): Promise<Product[]> {
  try {
    const { firestore } = await createServerClient();
    
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Get all product embeddings
    const embeddingsSnapshot = await firestore
      .collectionGroup('productReviewEmbeddings')
      .get();

    if (embeddingsSnapshot.empty) {
      console.log('No product embeddings found');
      return [];
    }

    // Calculate similarity for each product
    const similarities = embeddingsSnapshot.docs.map(doc => {
      const data = doc.data();
      const similarity = cosineSimilarity(queryEmbedding, data.embedding);
      
      return {
        productId: data.productId,
        productName: data.productName,
        similarity,
      };
    });

    // Sort by similarity and get top N
    const topMatches = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    console.log('Top matches:', topMatches.map(m => ({ name: m.productName, sim: m.similarity.toFixed(3) })));

    // Fetch full product details
    const productIds = topMatches.map(m => m.productId);
    
    if (productIds.length === 0) return [];

    const productsPromises = productIds.map(id => 
      firestore.collection('products').doc(id).get()
    );
    
    const productDocs = await Promise.all(productsPromises);
    
    const products = productDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() } as Product));

    return products;
  } catch (error) {
    console.error('Error in findSimilarProducts:', error);
    throw error;
  }
}

const recommendProductsPrompt = ai.definePrompt({
  name: 'recommendProductsPrompt',
  input: { schema: z.object({
    query: z.string(),
    customerHistory: z.string().optional(),
    availableProducts: z.string(),
  }) },
  output: {schema: RecommendProductsOutputSchema},
  prompt: `You are an expert AI budtender. Your goal is to recommend the best products to a user based on their request, history, and a pre-selected list of relevant products.

The user is looking for: {{{query}}}
{{#if customerHistory}}
Their preferences are: {{{customerHistory}}}
{{/if}}

Based on this, choose up to a maximum of 3 products from the following JSON list of semantically similar products.

Available Products (JSON):
{{{availableProducts}}}

You must provide a compelling, one-sentence reason for each product recommendation.
Most importantly, you MUST also provide an 'overallReasoning' for why this specific collection of products was chosen.
`,
});

const recommendProductsFlow = ai.defineFlow(
  {
    name: 'recommendProductsFlow',
    inputSchema: RecommendProductsInputSchema,
    outputSchema: RecommendProductsOutputSchema,
  },
  async input => {
    try {
      console.log('🚀 Starting product recommendation flow for query:', input.query);
      
      // Step 1: Use vector similarity to find the most relevant products
      const similarProducts = await findSimilarProducts(input.query, 10);
      
      console.log(`✅ Found ${similarProducts.length} similar products`);
      
      if (similarProducts.length === 0) {
        return {
          products: [],
          overallReasoning: "I couldn't find any products that matched your request. Could you try describing it a different way?",
        };
      }

      // Step 2: Pass the query and curated list to the LLM for final recommendation
      const {output} = await recommendProductsPrompt({
        ...input,
        availableProducts: JSON.stringify(similarProducts),
      });

      console.log('✅ Generated recommendations:', output?.products.length || 0);

      return output!;
    } catch (error) {
      console.error('❌ Error in recommendProductsFlow:', error);
      throw error;
    }
  }
);

export async function recommendProducts(input: RecommendProductsInput): Promise<RecommendProductsOutput> {
  return recommendProductsFlow(input);
}
