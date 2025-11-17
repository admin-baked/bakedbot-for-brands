
import { Firestore } from 'firebase-admin/firestore';
import type { Brand } from '@/types/domain';
import { defaultLogo } from '@/lib/data';

const defaultBrand: Brand = {
  id: 'default',
  name: 'BakedBot',
  logoUrl: defaultLogo,
  chatbotConfig: {
    basePrompt: "You are Smokey, a friendly and knowledgeable AI budtender. Your goal is to help users discover the best cannabis products for them. Keep your tone light, informative, and a little playful.",
    welcomeMessage: "Hello! I'm Smokey, your AI budtender. Browse our products above and ask me anything about them!",
  },
};

export function makeBrandRepo(db: Firestore) {
  const brandCollection = db.collection('brands');

  return {
    async getById(id: string): Promise<Brand> {
      // Use the default ID if none is provided.
      const brandId = id === 'default' || !id ? 'default' : id;
      
      try {
        const snap = await brandCollection.doc(brandId).get();
        if (!snap.exists) {
          console.warn(`Brand document for ID "${brandId}" not found. Falling back to default brand config.`);
          // If the default doc doesn't exist, create it.
          if (brandId === 'default') {
            await brandCollection.doc('default').set(defaultBrand);
            return defaultBrand;
          }
          return defaultBrand;
        }
        
        const data = snap.data();
        return { 
          id: snap.id,
          ...data
        } as Brand;
      } catch (error) {
        console.error(`Error fetching brand with ID "${brandId}":`, error);
        // Fallback to default in case of any error
        return defaultBrand;
      }
    },
  };
}
