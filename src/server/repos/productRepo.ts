
import { Firestore, FieldValue, DocumentReference } from 'firebase-admin/firestore';
import type { Product, ReviewSummaryEmbedding } from '@/types/domain';
import { generateEmbedding } from '@/ai/utils/generate-embedding';
import { productConverter } from '@/firebase/converters';


export function makeProductRepo(db: Firestore) {
  const productCollection = db.collection('products').withConverter(productConverter);

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
      
      return snapshot.docs.map(doc => doc.data());
    },

    /**
     * Retrieves all products for a given brandId.
     * This is a comprehensive fetch of the entire catalog for a brand.
     */
    async getAllByBrand(brandId: string): Promise<Product[]> {
        const effectiveBrandId = brandId && brandId.trim() !== '' ? brandId : 'default';
        const snapshot = await productCollection.where('brandId', '==', effectiveBrandId).get();
        if (snapshot.empty) {
            console.log(`No products found for brandId: ${effectiveBrandId}`);
            return [];
        }
        return snapshot.docs.map(doc => doc.data());
    },

    /**
     * Retrieves all products across all brands.
     */
    async getAll(): Promise<Product[]> {
        const snapshot = await productCollection.get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => doc.data());
    },

     /**
     * Creates a new product document in Firestore.
     */
    async create(data: Omit<Product, 'id'>): Promise<DocumentReference> {
        return await productCollection.add(data);
    },

    /**
     * Updates an existing product document.
     */
    async update(id: string, data: Partial<Omit<Product, 'id'>>): Promise<void> {
        await productCollection.doc(id).update(data);
    },

    /**
     * Updates or clears the embedding for a specific product.
     */
    async updateEmbedding(productId: string, embeddingData: ReviewSummaryEmbedding | null): Promise<void> {
        const docRef = this.getRef(productId)
        if (embeddingData === null) {
            await docRef.update({
                reviewSummaryEmbedding: FieldValue.delete(),
            });
        } else {
            await docRef.update({
                reviewSummaryEmbedding: embeddingData,
            });
        }
    }
  };
}
