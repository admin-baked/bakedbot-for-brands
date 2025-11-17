

import { Firestore, FieldValue } from 'firebase-admin/firestore';
import type { Product } from '@/types/domain';
import { generateEmbedding } from '@/ai/utils/generate-embedding';


export function makeProductRepo(db: Firestore) {
  const productCollection = db.collection('products');

  return {
    /**
     * Retrieves a single product by its ID.
     */
    async getById(id: string): Promise<Product | null> {
      const snap = await productCollection.doc(id).get();
      if (!snap.exists) return null;
      const data = snap.data()!;
      return { 
          id: snap.id,
          ...data
        } as Product;
    },

    /**
     * Performs a vector search on product review embeddings.
     * Finds products with reviews that are semantically similar to the user's query.
     */
    async searchByVector(query: string, brandId: string, limit: number = 10): Promise<Product[]> {
      // Ensure brandId is valid, fallback to 'default' if necessary.
      const effectiveBrandId = brandId && brandId.trim() !== '' ? brandId : 'default';

      const queryEmbedding = await generateEmbedding(query);

      const vectorQuery = productCollection
        .where('brandId', '==', effectiveBrandId)
        .where('reviewSummaryEmbedding.embedding', '!=', null)
        .orderBy('reviewSummaryEmbedding.embedding')
        .findNearest('reviewSummaryEmbedding.embedding', queryEmbedding, {
          limit,
          distanceMeasure: 'COSINE',
        });
      
      const snapshot = await vectorQuery.get();

      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    },

    /**
     * Retrieves all products for a given brandId.
     * This is a comprehensive fetch of the entire catalog for a brand.
     */
    async getAllByBrand(brandId: string): Promise<Product[]> {
        // Ensure brandId is valid, fallback to 'default' if necessary.
        const effectiveBrandId = brandId && brandId.trim() !== '' ? brandId : 'default';

        const snapshot = await productCollection.where('brandId', '==', effectiveBrandId).get();
        if (snapshot.empty) {
            console.log(`No products found for brandId: ${effectiveBrandId}`);
            return [];
        }
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    }
  };
}
