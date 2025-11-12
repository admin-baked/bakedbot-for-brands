import { Firestore } from 'firebase-admin/firestore';
import type { Product } from '@/types/domain';

export function makeProductRepo(db: Firestore) {
  const col = db.collection('products');
  return {
    async getById(id: string): Promise<Product | null> {
      const snap = await col.doc(id).get();
      if (!snap.exists) return null;
      const data = snap.data()!;
      // This manually shapes the data, avoiding converter mismatches.
      return { 
          id: snap.id,
          name: data.name,
          category: data.category,
          price: data.price,
          prices: data.prices,
          imageUrl: data.imageUrl,
          imageHint: data.imageHint,
          description: data.description,
          likes: data.likes,
          dislikes: data.dislikes,
        } as Product;
    },
  };
}
