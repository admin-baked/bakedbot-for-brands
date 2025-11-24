
import { createServerClient } from '@/firebase/server-client';

export type PlaybookStatus = 'active' | 'paused';

export interface Playbook {
  id: string;
  name: string;
  status: PlaybookStatus;
  channel: string;
  runsLast7d: number;
}

/**
 * Load playbooks for a given brand from Firestore (Admin SDK).
 * Collection path: brands/{brandId}/playbooks
 */
export async function listPlaybooksForBrand(
  brandId: string,
): Promise<Playbook[]> {
  const { firestore } = await createServerClient();

  const snap = await firestore
    .collection('brands')
    .doc(brandId)
    .collection('playbooks')
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as any;

    return {
      id: doc.id,
      name: data.name ?? 'Untitled playbook',
      status: (data.status as PlaybookStatus) ?? 'active',
      channel: data.channel ?? 'Unknown channel',
      runsLast7d:
        typeof data.runsLast7d === 'number' ? data.runsLast7d : 0,
    };
  });
}

/**
 * Optional helper to drop in some demo playbooks for a brand.
 * Not used by the UI yet, but handy in scripts / onboarding.
 */
export async function seedDemoPlaybooks(brandId: string): Promise<void> {
  const { firestore } = await createServerClient();
  const col = firestore
    .collection('brands')
    .doc(brandId)
    .collection('playbooks');

  const existing = await col.limit(1).get();
  if (!existing.empty) return;

  const batch = firestore.batch();

  const docs: Omit<Playbook, 'id'> & { id: string }[] = [
    {
      id: 'launch-drop-chicago',
      name: 'Launch Drop · Chicago',
      status: 'active',
      channel: 'Email + SMS',
      runsLast7d: 12,
    },
    {
      id: 'menu-seo-headless',
      name: 'Menu SEO · Headless',
      status: 'active',
      channel: 'Smokey · Menu',
      runsLast7d: 34,
    },
    {
      id: 'compliance-watch-il',
      name: 'Compliance Watch · IL',
      status: 'paused',
      channel: 'Deebo',
      runsLast7d: 3,
    },
  ];

  for (const pb of docs) {
    const ref = col.doc(pb.id);
    batch.set(ref, {
      name: pb.name,
      status: pb.status,
      channel: pb.channel,
      runsLast7d: pb.runsLast7d,
    });
  }

  await batch.commit();
}
