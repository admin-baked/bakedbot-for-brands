
'use server';

import type { Playbook, PlaybookDraft } from '@/types/domain';
import { DEMO_BRAND_ID } from '@/lib/config';
import { createServerClient } from '@/firebase/server-client';


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
  // PHASE 2B: stub only – safe to call from the client.
  // This is the seam where we’ll later write to Firestore.
  console.log('Saving playbook draft (stub):', input);

  // Example shape you might return
  return {
    ok: true,
    id: `draft_${Date.now()}`,
  };
}


export async function getPlaybookDraftsForDashboard(
  brandId: string = DEMO_BRAND_ID,
): Promise<PlaybookDraft[]> {
  try {
    const { firestore } = await createServerClient();
    const snap = await firestore
      .collection(`brands/${brandId}/playbookDrafts`)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const drafts: PlaybookDraft[] = snap.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        brandId,
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
