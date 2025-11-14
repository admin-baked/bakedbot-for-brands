
/**
 * @fileoverview A one-time script to iterate through all existing products
 * and generate the initial review summary embeddings.
 * This is a standalone script that uses Firebase Admin and does not
 * rely on Genkit actions, making it safe for build processes.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServerClient } from '../src/firebase/server-client';
import { getProductReviews } from '../src/ai/tools/get-product-reviews';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';


async function generateAndSaveEmbedding(productId: string) {
    // 1. Fetch all reviews for the product using the existing tool logic
    const reviews = await getProductReviews.run({ productId });

    if (reviews.length === 0) {
      throw new Error(`No reviews found for product ${productId}.`);
    }

    // 2. Concatenate all review texts into a single string for summarization
    const allReviewsText = reviews.map(r => r.text).join('\n\n');

    // 3. Use an LLM to create a concise summary of all reviews
    const summaryResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-flash-latest'),
      prompt: `Summarize the following customer reviews into a short paragraph that captures the key points, overall sentiment, common praises, and frequent complaints:\n\n${allReviewsText}`,
    });
    const summary = summaryResponse.text;

    // 4. Generate a single embedding from the AI-generated summary
    const embeddingResponse = await ai.embed({
      model: googleAI.model('text-embedding-004'),
      content: summary,
    });
    const embedding = embeddingResponse.embedding;
    
    // 5. Save the new embedding to a subcollection on the product
    const { firestore } = await createServerClient();
    const embeddingRef = firestore.doc(`products/${productId}/productReviewEmbeddings/summary`);
    
    const embeddingData = {
        productId,
        embedding: embedding,
        reviewCount: reviews.length,
        summary: summary,
        updatedAt: new Date(),
    };

    await embeddingRef.set(embeddingData, { merge: true });

    return embeddingData;
}


async function initializeReviewEmbeddings() {
  console.log('Starting one-time initialization of review embeddings...');
  
  const { firestore } = await createServerClient();
  const productsSnapshot = await firestore.collection('products').get();
  
  if (productsSnapshot.empty) {
    console.log('No products found in the database. Exiting.');
    return;
  }

  console.log(`Found ${productsSnapshot.size} products to process.`);

  for (const doc of productsSnapshot.docs) {
    const productId = doc.id;
    console.log(`- Processing product: ${productId}`);
    try {
      const result = await generateAndSaveEmbedding(productId);
      console.log(`  ✅ Success! Generated embedding for ${result.reviewCount} reviews.`);
    } catch (error: any) {
      if (error.message.includes('No reviews found')) {
        console.log(`  ⚪️ Skipped (no reviews found).`);
      } else {
        console.error(`  ❌ Error processing product ${productId}:`, error.message);
      }
    }
     // Simple rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\nInitialization complete. All products have been processed.');
}

initializeReviewEmbeddings().catch(console.error);
