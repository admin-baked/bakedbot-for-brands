
import 'server-only';
import { Firestore, FieldValue, DocumentReference } from 'firebase-admin/firestore';
import type { Product, ReviewSummaryEmbedding } from '@/types/domain';
import { generateEmbedding } from '@/ai/utils/generate-embedding';
import { productAdminConverter } from '@/server/repos/converters';
import { DEMO_BRAND_ID } from '@/lib/config';
import { logger } from '@/lib/logger';

export function makeProductRepo(db: Firestore) {
  const productCollection = db.collection('products').withConverter(productAdminConverter);

  return {
    /**
     * Retrieves a reference to a product document.
     */
    getRef(id: string): DocumentReference {
      return productCollection.doc(id);
    },

    /**
     * Retrieves a single product by its ID.
     */
    async getById(id: string): Promise<Product | null> {
      const snap = await this.getRef(id).get();
      if (!snap.exists) return null;
      return snap.data() as Product;
    },

    /**
     * Performs a vector search on product review embeddings.
     * Finds products with reviews that are semantically similar to the user's query.
     */
    async searchByVector(query: string, brandId: string, limit: number = 5): Promise<Product[]> {
      const effectiveBrandId = brandId && brandId.trim() !== '' ? brandId : DEMO_BRAND_ID;
      const queryEmbedding = await generateEmbedding(query);

      // Perform a collection group query on the embeddings subcollection.
      const vectorQuery = db.collectionGroup('productReviewEmbeddings')
        .where('brandId', '==', effectiveBrandId)
        .findNearest('embedding', queryEmbedding, {
          limit,
          distanceMeasure: 'COSINE',
        });

      const snapshot = await vectorQuery.get();

      if (snapshot.empty) {
        return [];
      }

      // We get back the embedding docs, now fetch the full product docs.
      const productIds = snapshot.docs.map(doc => doc.data().productId);
      const productSnaps = await db.getAll(...productIds.map(id => productCollection.doc(id)));

      return productSnaps.map(snap => snap.data() as Product).filter(Boolean);
    },

    /**
     * Retrieves all products for a given brandId.
     * This is a comprehensive fetch of the entire catalog for a brand.
     */
    async getAllByBrand(brandId: string): Promise<Product[]> {
      const effectiveBrandId = brandId && brandId.trim() !== '' ? brandId : DEMO_BRAND_ID;
      const snapshot = await productCollection.where('brandId', '==', effectiveBrandId).get();
      if (snapshot.empty) {
        logger.info(`No products found for brandId: ${effectiveBrandId}`);
        return [];
      }
      return snapshot.docs.map(doc => doc.data() as Product);
    },

    /**
     * Retrieves all products across all brands.
     */
    async getAll(): Promise<Product[]> {
      const snapshot = await productCollection.get();
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map(doc => doc.data() as Product);
    },

    /**
    * Creates a new product document in Firestore.
    */
    async create(data: Omit<Product, 'id'>): Promise<DocumentReference> {
      return await productCollection.add(data as Product);
    },

    /**
     * Updates an existing product document.
     */
    async update(id: string, data: Partial<Omit<Product, 'id'>>): Promise<void> {
      await productCollection.doc(id).update(data);
    },

    /**
     * Deletes a product document.
     */
    async delete(id: string): Promise<void> {
      await productCollection.doc(id).delete();
    },

    /**
     * Updates or clears the embedding for a specific product.
     * This now writes to a versioned subcollection.
     */
    async updateEmbedding(productId: string, embeddingData: Omit<ReviewSummaryEmbedding, 'productId'> | null): Promise<void> {
      if (embeddingData === null) {
        // In a real app, you might want a strategy to delete old embeddings.
        // For now, we'll just log it.
        logger.info(`Clearing embeddings for product ${productId} is a no-op in this version.`);
        return;
      }

      const modelName = embeddingData.model;
      const embeddingDocRef = productCollection.doc(productId).collection('productReviewEmbeddings').doc(modelName);

      const payload: ReviewSummaryEmbedding = {
        ...embeddingData,
        productId: productId,
        brandId: embeddingData.brandId, // Ensure brandId is part of the payload
      };

      await embeddingDocRef.set(payload);
    }
  };
}
