
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import type { Brand } from '@/types/domain';
import { defaultLogo } from '@/lib/demo/demo-data';
import type { DeepPartial } from '@/types/utils';
import { DEMO_BRAND_ID } from '@/lib/config';

import { logger } from '@/lib/logger';
// The default brand config is used as a fallback if a brand doc doesn't exist.
const defaultBrand: Brand = {
  id: DEMO_BRAND_ID,
  name: 'BakedBot',
  logoUrl: defaultLogo,
  chatbotConfig: {
    basePrompt: "You are Smokey, a friendly and knowledgeable AI budtender. Your goal is to help users discover the best cannabis products for them. Keep your tone light, informative, and a little playful.",
    welcomeMessage: "Welcome! I'm Smokey, your AI budtender. Browse our products above and ask me anything about them!",
  },
};

export function makeBrandRepo(db: Firestore) {
  const brandCollection = db.collection('brands');

  return {
    /**
     * Generates the payload for a new brand, including default configurations.
     * This is not an async function; it just constructs the object.
     */
    createPayload(name: string, logoUrl: string = defaultLogo): Omit<Brand, 'id'> {
        return {
            name,
            logoUrl,
            chatbotConfig: {
                basePrompt: `You are a helpful and friendly budtender for ${name}. Your goal is to help users find the perfect product for their desired experience.`,
                welcomeMessage: `Welcome! I'm the AI budtender for ${name}. How can I help you find what you're looking for today?`,
            },
        };
    },

    /**
     * Creates a new brand document in Firestore.
     */
    async create(id: string, data: Partial<Omit<Brand, 'id'>>): Promise<Brand> {
        const defaultPayload = this.createPayload(data.name || "New Brand", data.logoUrl);

        const brandData: Brand = {
            ...defaultPayload,
            ...data,
            id,
        };

        await brandCollection.doc(id).set(brandData);
        return brandData;
    },

    /**
     * Retrieves a single brand by its ID. Falls back to a default configuration.
     */
    async getById(id: string): Promise<Brand> {
      // Treat 'default' and empty IDs as a request for the demo brand.
      const brandId = id === DEMO_BRAND_ID || !id ? DEMO_BRAND_ID : id;
      
      try {
        const snap = await brandCollection.doc(brandId).get();
        if (!snap.exists) {
          logger.warn(`Brand document for ID "${brandId}" not found. Falling back to default brand config.`);
          // If the default doc doesn't exist, create it for next time.
          if (brandId === DEMO_BRAND_ID) {
            await brandCollection.doc(DEMO_BRAND_ID).set(defaultBrand);
            return defaultBrand;
          }
          // Return the default object but don't save it under the non-existent ID.
          return { ...defaultBrand, id: brandId, name: 'Unknown Brand' };
        }
        
        const data = snap.data();
        return { 
          id: snap.id,
          ...data
        } as Brand;
      } catch (error) {
        logger.error(`Error fetching brand with ID "${brandId}":`, error);
        return { ...defaultBrand, id: brandId };
      }
    },
    
    /**
     * Updates a brand document with the provided partial data.
     * Uses dot notation for nested objects to avoid overwriting entire objects.
     */
    async update(id: string, data: DeepPartial<Omit<Brand, 'id'>>): Promise<void> {
        if (!id) {
            throw new Error("Brand ID is required for update.");
        }
        
        const updatePayload: Record<string, any> = {};

        // Flatten the nested structure for Firestore's update method
        const flattenObject = (obj: any, prefix = ''): void => {
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                const newKey = prefix ? `${prefix}.${key}` : key;
                if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof FieldValue)) {
                    flattenObject(value, newKey);
                } else if (value !== undefined) { // Ensure undefined values aren't sent
                    updatePayload[newKey] = value;
                }
            });
        };

        flattenObject(data);
        
        // Add an updated timestamp automatically
        updatePayload['updatedAt'] = FieldValue.serverTimestamp();

        await brandCollection.doc(id).set(updatePayload, { merge: true });
    }
  };
}
