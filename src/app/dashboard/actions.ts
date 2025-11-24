
'use server';

import { createServerClient } from '@/firebase/server-client';
import type { Playbook, PlaybookDraft } from '@/types/domain';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '@/server/auth/auth';

const DEMO_BRAND_ID = 'demo-brand';

// ----- Types used by the actions -----

type PlaybookDraftInput = {
  name: string;
  description: string;
  agents: string[];
  tags: string[];
};

// ----- Stubbed live playbooks (unchanged) -----

export async function getPlaybooksForDashboard(): Promise<Playbook[]> {
  // For now this is stub/demo data. It's working, so we keep it.
  const brandId = DEMO_BRAND_ID;

  const demoPlaybooks: Playbook[] = [
    {
      id: 'abandon-browse-cart-saver',
      brandId,
      name: 'abandon-browse-cart-saver',
      description:
        'Recover abandoned carts via email/SMS and on-site prompts.',
      kind: 'signal',
      tags: ['retention', 'recovery', 'sms', 'email', 'on-site'],
      enabled: true,
    },
    {
      id: 'competitor-price-drop-watch',
      brandId,
      name: 'competitor-price-drop-watch',
      description:
        'Monitor competitor price drops and suggest experiments.',
      kind: 'signal',
      tags: ['competitive', 'pricing', 'experiments'],
      enabled: true,
    },
    {
      id: 'new-subscriber-welcome-series',
      brandId,
      name: 'new-subscriber-welcome-series',
      description:
        'Onboard new subscribers with a 5-part welcome flow.',
      kind: 'automation',
      tags: ['email', 'onboarding', 'engagement'],
      enabled: false,
    },
    {
      id: 'win-back-lapsed-customers',
      brandId,
      name: 'win-back-lapsed-customers',
      description:
        'Re-engage customers who have not ordered in 60+ days.',
      kind: 'signal',
      tags: ['retention', 'sms', 'discounts'],
      enabled: true,
    },
  ];

  return demoPlaybooks;
}

// ----- Persisting drafts -----

export async function savePlaybookDraft(
  input: PlaybookDraftInput,
) {
  const { firestore } = await createServerClient();
  const user = await requireUser(['brand', 'owner']);
  const brandId = user.brandId || DEMO_BRAND_ID;

  try {
    const docRef = await firestore
      .collection('brands')
      .doc(brandId)
      .collection('playbookDrafts')
      .add({
        ...input,
        brandId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    return { ok: true as const, id: docRef.id };
  } catch (err) {
    console.error('Error saving playbook draft', err);
    // We re-throw so the client can show the red error message.
    throw err;
  }
}

export async function getPlaybookDraftsForDashboard(
  brandId?: string,
): Promise<PlaybookDraft[]> {
  const { firestore } = await createServerClient();
  const user = await requireUser(['brand', 'owner']);
  // Use the passed brandId, fallback to user's brandId, then to demo
  const effectiveBrandId = brandId || user.brandId || DEMO_BRAND_ID;

  try {
    const snap = await firestore
      .collection('brands')
      .doc(effectiveBrandId)
      .collection('playbookDrafts')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const drafts: PlaybookDraft[] = snap.docs.map((doc) => {
      const data = doc.data() as any;

      return {
        id: doc.id,
        brandId: effectiveBrandId,
        name: data.name ?? 'untitled-playbook',
        description: data.description ?? '',
        agents: Array.isArray(data.agents) ? data.agents : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt:
          data.createdAt instanceof Date
            ? data.createdAt
            : data.createdAt?.toDate?.(),
        updatedAt:
          data.updatedAt instanceof Date
            ? data.updatedAt
            : data.updatedAt?.toDate?.(),
      };
    });

    return drafts;
  } catch (err) {
    console.error('Failed to load playbook drafts for dashboard', err);
    // Important: we *don’t* throw here, we just return [] so the page still loads.
    return [];
  }
}
