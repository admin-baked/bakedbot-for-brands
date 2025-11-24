
'use server';

import type { Playbook, PlaybookDraft } from '@/types/domain';
import { DEMO_BRAND_ID } from '@/lib/config';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';


// This function now correctly matches the name used in the page component.
export async function getPlaybooksForDashboard(): Promise<Playbook[]> {
  // PHASE 2A: stub implementation that can be swapped for Firestore later.
  // Shape matches the Playbook type and the UI you already built.

  const demoPlaybooks: Playbook[] = [
    {
      id: 'abandon-browse-cart-saver',
      brandId: DEMO_BRAND_ID,
      name: 'abandon-browse-cart-saver',
      description: 'Recover abandoned carts via email/SMS and on-site prompts.',
      kind: 'signal',
      tags: ['retention', 'recovery', 'sms', 'email', 'on-site'],
      enabled: true,
    },
    {
      id: 'competitor-price-drop-watch',
      brandId: DEMO_BRAND_ID,
      name: 'competitor-price-drop-watch',
      description: 'Monitor competitor price drops and suggest experiments.',
      kind: 'signal',
      tags: ['competitive', 'pricing', 'experiments'],
      enabled: true,
    },
    {
      id: 'new-subscriber-welcome-series',
      brandId: DEMO_BRAND_ID,
      name: 'new-subscriber-welcome-series',
      description:
        'Onboard new subscribers with a 5-part welcome flow.',
      kind: 'automation',
      tags: ['email', 'onboarding', 'engagement'],
      enabled: false,
    },
    {
      id: 'win-back-lapsed-customers',
      brandId: DEMO_BRAND_ID,
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


type PlaybookDraftInput = {
  name: string;
  description: string;
  agents: string[];
  tags: string[];
};

export async function savePlaybookDraft(input: PlaybookDraftInput) {
  const { firestore } = await createServerClient();
  const user = await requireUser(['brand', 'owner']);
  const brandId = user.brandId || DEMO_BRAND_ID;

  const newDraftRef = firestore.collection(`brands/${brandId}/playbookDrafts`).doc();

  await newDraftRef.set({
    ...input,
    brandId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    id: newDraftRef.id,
  };
}


export async function getPlaybookDraftsForDashboard(
  brandId?: string,
): Promise<PlaybookDraft[]> {
  const user = await requireUser(['brand', 'owner']);
  const effectiveBrandId = brandId || user.brandId || DEMO_BRAND_ID;

  try {
    const { firestore } = await createServerClient();
    const snap = await firestore
      .collection(`brands/${effectiveBrandId}/playbookDrafts`)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const drafts: PlaybookDraft[] = snap.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        brandId: effectiveBrandId,
        name: data.name ?? 'untitled-playbook',
        description: data.description ?? '',
        agents: data.agents ?? [],
        tags: data.tags ?? [],
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : undefined,
        updatedAt: data.updatedAt?.toDate
          ? data.updatedAt.toDate()
          : undefined,
      };
    });

    return drafts;
  } catch (err) {
    console.error('Failed to load playbook drafts for dashboard', err);
    return [];
  }
}
