
'use server';

import type { PlaybookDraft } from '@/types/domain';
import { createServerClient } from '@/firebase/server-client';
import { DEMO_BRAND_ID } from '@/lib/config';

type PlaybookDraftInput = {
  brandId: string;
  name: string;
  description?: string;
  agents?: string[];
  tags?: string[];
};

// ----- Live / stubbed playbooks (unchanged) -----

export async function getPlaybooksForDashboard(): Promise<any[]> {
  const brandId = DEMO_BRAND_ID;

  const demoPlaybooks = [
    {
      id: 'abandon-browse-cart-saver',
      brandId,
      name: 'abandon-browse-cart-saver',
      description:
        'Recover abandoned carts via email/SMS and on-site prompts.',
      kind: 'signal',
      type: 'signal',
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
      type: 'signal',
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
      type: 'automation',
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
      type: 'signal',
      tags: ['retention', 'sms', 'discounts'],
      enabled: true,
    },
  ];

  return demoPlaybooks;
}

// ----- Draft persistence -----
// If HAS_SERVICE_ACCOUNT = false, these functions fall back to stubs
// so the UI keeps working in Studio without secrets.

export async function savePlaybookDraft(
  input: PlaybookDraftInput,
): Promise<PlaybookDraft | null> {
  
  try {
    const { firestore } = await createServerClient();
    const now = new Date();

    const collectionRef = firestore
      .collection('brands')
      .doc(input.brandId)
      .collection('playbookDrafts');
      
    const docRef = collectionRef.doc();
    
    const draftToSave = {
        ...input,
        kind: 'automation',
        type: 'automation',
        enabled: false,
        signals: [],
        targets: [],
        constraints: [],
        createdAt: now,
        updatedAt: now,
    }

    await docRef.set(draftToSave);
    
    return { ...draftToSave, id: docRef.id };

  } catch (err) {
    console.error('Error saving playbook draft', err);
    throw err;
  }
}

export async function getPlaybookDraftsForDashboard(
  brandId: string = DEMO_BRAND_ID,
): Promise<any[]> {

  try {
    const { firestore } = await createServerClient();

    const snap = await firestore
      .collection('brands')
      .doc(brandId)
      .collection('playbookDrafts')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const drafts = snap.docs.map((doc: any) => {
      const data = doc.data() ?? {};

      return {
        id: doc.id,
        ...data,
      };
    }) as any[];

    return drafts;
  } catch (err) {
    console.error('Failed to load playbook drafts for dashboard', err);
    return [];
  }
}

