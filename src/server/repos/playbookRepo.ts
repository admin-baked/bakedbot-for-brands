'use server';

import 'server-only';
import { Firestore } from 'firebase-admin/firestore';
import type { Playbook } from '@/types/domain';
import { playbookConverter } from '@/firebase/converters';
import { DEMO_BRAND_ID } from '@/lib/config';

export function makePlaybookRepo(db: Firestore) {
  const playbookCollection = (brandId: string) => 
    db.collection(`brands/${brandId}/playbooks`).withConverter(playbookConverter as any);

  return {
    /**
     * Retrieves all playbooks for a given brandId, ordered by name.
     */
    async getAllByBrand(brandId: string): Promise<Playbook[]> {
      const effectiveBrandId = brandId && brandId.trim() !== '' ? brandId : DEMO_BRAND_ID;
      
      try {
        const snapshot = await playbookCollection(effectiveBrandId).orderBy('name').get();
        
        if (snapshot.empty) {
          return [];
        }

        return snapshot.docs.map(doc => doc.data());
      } catch (error) {
        console.error(`Failed to get playbooks for brand ${effectiveBrandId}:`, error);
        // In case of error (e.g., permissions), return an empty array to prevent crashes.
        return [];
      }
    },
  };
}
