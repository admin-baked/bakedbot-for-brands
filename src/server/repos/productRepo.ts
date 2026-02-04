
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
     *
     * For POS-integrated brands (like Thrive Syracuse), fetches from tenant publicViews.
     * Otherwise, fetches from the legacy products collection.
     */
    async getAllByBrand(brandId: string): Promise<Product[]> {
      const effectiveBrandId = brandId && brandId.trim() !== '' ? brandId : DEMO_BRAND_ID;

      // Check if brand has orgId (for dispensary/POS integrated brands)
      try {
        // First, try to get brand document directly by ID
        let brandDoc = await db.collection('brands').doc(effectiveBrandId).get();
        let orgId: string | undefined;

        // If not found, try querying by slug
        if (!brandDoc.exists) {
          const slugQuery = await db.collection('brands')
            .where('slug', '==', effectiveBrandId)
            .limit(1)
            .get();

          if (!slugQuery.empty) {
            brandDoc = slugQuery.docs[0];
          }
        }

        // If still not found, try querying by orgId field
        // This handles cases where effectiveBrandId is actually an orgId (e.g., 'org_thrive_syracuse')
        if (!brandDoc.exists) {
          const orgIdQuery = await db.collection('brands')
            .where('orgId', '==', effectiveBrandId)
            .limit(1)
            .get();

          if (!orgIdQuery.empty) {
            brandDoc = orgIdQuery.docs[0];
            // We found brand by orgId, so we already know the orgId
            orgId = effectiveBrandId;
          }
        }

        // If brand found and it has orgId (or we found it via orgId), fetch from tenant
        if (brandDoc.exists) {
          const brand = brandDoc.data()!;
          orgId = orgId || brand.orgId;

          // If brand has orgId, fetch from tenant publicViews
          if (orgId) {
            logger.info(`Fetching products from tenant catalog for brand: ${effectiveBrandId}, org: ${orgId}`);
            const tenantProductsSnapshot = await db
              .collection('tenants')
              .doc(orgId)
              .collection('publicViews')
              .doc('products')
              .collection('items')
              .get();

            if (!tenantProductsSnapshot.empty) {
              // Map tenant products to Product type
              return tenantProductsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  brandId: effectiveBrandId,
                  name: data.name,
                  description: data.description,
                  price: data.price,
                  imageUrl: data.imageUrl,
                  category: data.category,
                  thcPercent: data.thcPercent,
                  cbdPercent: data.cbdPercent,
                  strainType: data.strainType,
                } as Product;
              });
            }
          }
        }
      } catch (error) {
        logger.error(`Error fetching brand configuration for ${effectiveBrandId}:`, {
          error: error instanceof Error ? error.message : String(error)
        });
        // Fall through to legacy collection
      }

      // Fallback: If brandId looks like an orgId, try tenant directly
      if (effectiveBrandId.startsWith('org_')) {
        logger.info(`Trying direct tenant lookup for orgId: ${effectiveBrandId}`);
        try {
          const tenantProductsSnapshot = await db
            .collection('tenants')
            .doc(effectiveBrandId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

          if (!tenantProductsSnapshot.empty) {
            logger.info(`Found ${tenantProductsSnapshot.size} products in tenant catalog`);
            return tenantProductsSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                brandId: effectiveBrandId,
                name: data.name,
                description: data.description,
                price: data.price,
                imageUrl: data.imageUrl,
                category: data.category,
                thcPercent: data.thcPercent,
                cbdPercent: data.cbdPercent,
                strainType: data.strainType,
              } as Product;
            });
          }
        } catch (err) {
          logger.error(`Direct tenant lookup failed for ${effectiveBrandId}:`, {
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      // Final fallback to legacy products collection
      const snapshot = await productCollection.where('brandId', '==', effectiveBrandId).get();
      if (snapshot.empty) {
        logger.info(`No products found for brandId: ${effectiveBrandId}`);
        return [];
      }
      return snapshot.docs.map(doc => doc.data() as Product);
    },

    /**
     * Retrieves all products for a given locationId (Dispensary).
     */
    async getAllByLocation(locationId: string): Promise<Product[]> {
      const snapshot = await productCollection.where('dispensaryId', '==', locationId).get();
      if (snapshot.empty) {
        logger.info(`No products found for locationId: ${locationId}`);
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
