
'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';
import { createServerClient } from '@/firebase/server-client';

interface Review {
  rating: number;
  text?: string;
  helpfulCount?: number;
  verifiedPurchase?: boolean;
}

interface Product {
  id: string;
  name: string;
  reviews?: Review[];
  brandId?: string;
  category?: string;
  thcContent?: string;
  cbdContent?: string;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8';
  
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/text-embedding-004:predict`;

  const response = await client.request({
    url,
    method: 'POST',
    data: {
      instances: [{ content: text }],
    },
  });

  const data = response.data as any;
  return data.predictions[0].embeddings.values;
}

async function generateReviewEmbedding(product: Product): Promise<number[] | null> {
  const reviews = product.reviews || [];

  if (reviews.length === 0) {
    return null;
  }

  const reviewTexts = reviews
    .filter((r) => r.text && r.text.trim().length > 0)
    .map((r) => r.text!.trim());

  if (reviewTexts.length === 0) {
    return null;
  }

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  const embeddingText = `
Product: ${product.name}
Brand: ${product.brandId || 'Unknown'}
Category: ${product.category || 'Unknown'}
Average Rating: ${avgRating.toFixed(1)}/5 stars
Total Reviews: ${reviews.length}
${product.thcContent ? `THC: ${product.thcContent}` : ''}
${product.cbdContent ? `CBD: ${product.cbdContent}` : ''}

Customer Reviews:
${reviewTexts.join('\n\n')}
  `.trim();

  try {
    const embedding = await generateEmbedding(embeddingText);
    return embedding;
  } catch (error) {
    console.error(`Failed to generate embedding for ${product.name}:`, error);
    throw error;
  }
}

export async function initializeReviewEmbeddings() {
  try {
    const { firestore } = await createServerClient();

    console.log('🚀 Starting review embeddings initialization...');

    const productsSnapshot = await firestore.collection('products').get();
    const products = productsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];

    console.log(`Found ${products.length} products`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const allReviewsSnapshot = await firestore.collection(`products/${product.id}/reviews`).get();
      const reviewCount = allReviewsSnapshot.size;
      
      console.log(`[${i + 1}/${products.length}] Processing: ${product.name}`);

      if (reviewCount === 0) {
        console.log(`  ⏭️  No reviews, skipping`);
        skipCount++;
        results.push({
          product: product.name,
          status: 'skipped',
          reason: 'no_reviews',
        });
        continue;
      }

      console.log(`  📊 Found ${reviewCount} reviews`);

      try {
        const productWithReviews = {
            ...product,
            reviews: allReviewsSnapshot.docs.map(d => d.data() as Review)
        };

        const embedding = await generateReviewEmbedding(productWithReviews);

        if (!embedding) {
          console.log(`  ⏭️  No valid review text, skipping`);
          skipCount++;
          results.push({
            product: product.name,
            status: 'skipped',
            reason: 'no_valid_text',
          });
          continue;
        }

        await firestore
          .collection(`products/${product.id}/productReviewEmbeddings`)
          .doc('summary')
          .set({
            productId: product.id,
            productName: product.name,
            embedding,
            reviewCount,
            updatedAt: new Date(),
          });

        console.log(`  ✅ Embedding generated and stored`);
        successCount++;
        results.push({
          product: product.name,
          status: 'success',
          reviewCount,
        });

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error: any) {
        console.error(`  ❌ Error:`, error);
        errorCount++;
        results.push({
          product: product.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    const summary = {
      success: true,
      message: 'Review embeddings initialization completed',
      summary: {
        total: products.length,
        successful: successCount,
        skipped: skipCount,
        failed: errorCount,
      },
      results,
    };

    console.log('✅ Initialization completed:', summary);
    return summary;
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
