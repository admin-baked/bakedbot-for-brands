

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
      const queryEmbedding = await generateEmbedding(query);

      const vectorQuery = productCollection
        .where('brandId', '==', brandId) // Ensure we only search within the correct brand
        .where('reviewSummaryEmbedding.embedding', '!=', null) // Ensure embedding exists
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
      const snapshot = await productCollection.where('brandId', '==', brandId).get();
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Product);
    },
  };
}
